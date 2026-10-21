// Verify the print layout of an invoice by emulating print media over CDP.
// Usage: node scripts/print-check.js <invoiceId>
import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9222';
const API = 'http://127.0.0.1:4318';
const OUT = path.join(process.cwd(), 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const invoiceId = process.argv[2];
if (!invoiceId) {
  console.error('usage: node print-check.js <invoiceId>');
  process.exit(1);
}

const loginRes = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@flowdesk.app', password: 'demo1234' }),
});
const setCookie = loginRes.headers.get('set-cookie') ?? '';
const session = setCookie.split(';')[0];
const me = await (await fetch(`${API}/api/auth/me`, { headers: { cookie: session } })).json();

const res = await fetch(`${CDP}/json/new?${encodeURIComponent(`${API}/app/invoices/${invoiceId}`)}`, {
  method: 'PUT',
});
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
await send('Network.setCookie', {
  name: 'fd_session', value: session.split('=')[1], domain: '127.0.0.1', path: '/',
});
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `localStorage.setItem('fd_business', ${JSON.stringify(me.businessId)});`,
});
await send('Page.navigate', { url: `${API}/app/invoices/${invoiceId}` });
await new Promise((r) => setTimeout(r, 3000));

// Emulate print media so @media print rules apply.
await send('Emulation.setEmulatedMedia', { media: 'print' });
await new Promise((r) => setTimeout(r, 400));

const metrics = await send('Page.getLayoutMetrics');
const height = Math.ceil(metrics.cssContentSize?.height ?? 1200);
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: 0, y: 0, width: 1000, height, scale: 1 },
  captureBeyondViewport: true,
});
const file = path.join(OUT, 'invoice-print.png');
fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
console.log(`saved ${file} (print media, 1000x${height})`);

await fetch(`${CDP}/json/close/${target.id}`);
ws.close();
process.exit(0);
