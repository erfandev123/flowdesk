// Capture Flowdesk screenshots at desktop + mobile viewports over CDP.
// Usage: node scripts/capture.js <name> <url> [width] [height] [fullPage]
import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9222';
const OUT = path.join(process.cwd(), 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const [, , name, url, w = '1440', h = '900', full = 'false'] = process.argv;
if (!name || !url) {
  console.error('usage: node capture.js <name> <url> [width] [height] [fullPage]');
  process.exit(1);
}

const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
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
    if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`));
    else resolve(msg.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 1,
  mobile: Number(w) < 700,
});
await send('Page.navigate', { url });

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
