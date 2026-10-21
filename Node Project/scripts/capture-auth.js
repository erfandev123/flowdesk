// Capture authenticated Flowdesk screens by injecting a session cookie first.
// Usage: node scripts/capture-auth.js <name> <path> [width] [height] [fullPage]
import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9222';
const API = 'http://127.0.0.1:4318';
const OUT = path.join(process.cwd(), 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const [, , name, appPath = '/app', w = '1440', h = '900', full = 'false'] = process.argv;
if (!name) {
  console.error('usage: node capture-auth.js <name> <path> [width] [height] [fullPage]');
  process.exit(1);
}

// Login through the API to obtain the session cookie.
const loginRes = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@flowdesk.app', password: 'demo1234' }),
});
if (!loginRes.ok) {
  console.error('login failed', loginRes.status, await loginRes.text());
  process.exit(1);
}
const setCookie = loginRes.headers.get('set-cookie') ?? '';
const session = setCookie.split(';')[0];
const me = await (await fetch(`${API}/api/auth/me`, {
  headers: { cookie: session },
})).json();

const res = await fetch(`${CDP}/json/new?${encodeURIComponent(`${API}${appPath}`)}`, { method: 'PUT' });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});

await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 1,
  mobile: Number(w) < 700,
});

// Set the session cookie and the active business before the app boots.
await send('Network.setCookie', {
  name: 'fd_session',
  value: session.split('=')[1],
  domain: '127.0.0.1',
  path: '/',
});
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `localStorage.setItem('fd_business', ${JSON.stringify(me.businessId)});`,
});

await send('Page.navigate', { url: `${API}${appPath}` });
await new Promise((r) => setTimeout(r, 3500));

const metrics = await send('Page.getLayoutMetrics');
const contentHeight = Math.ceil(metrics.cssContentSize?.height ?? Number(h));
const clip = full === 'true'
  ? { x: 0, y: 0, width: Number(w), height: contentHeight, scale: 1 }
  : undefined;

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  ...(clip ? { clip, captureBeyondViewport: true } : {}),
});
const file = path.join(OUT, `${name}.png`);
fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
console.log(`saved ${file} (${Number(w)}x${full === 'true' ? contentHeight : Number(h)})`);

await fetch(`${CDP}/json/close/${target.id}`);
ws.close();
process.exit(0);
