// One-command production setup for Flowdesk.
// Usage: node scripts/deploy.js
//
// - installs dependencies for server and web
// - builds the web bundle
// - seeds a demo workspace (skipped if the database already exists)
// - prints next steps for running it

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function run(cmd, args, cwd) {
  process.stdout.write(`\n$ ${cmd} ${args.join(' ')}\n`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    console.error(`\nCommand failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('=== Flowdesk deployment ===\n');

run(npm, ['install', '--omit=dev', '--no-audit', '--no-fund'], path.join(ROOT, 'server'));
run(npm, ['install', '--no-audit', '--no-fund'], path.join(ROOT, 'web'));
run(npm, ['run', 'build'], path.join(ROOT, 'web'));

const dbPath = path.join(ROOT, 'server', 'data', 'flowdesk.db');
if (!fs.existsSync(dbPath)) {
  console.log('\n> No database found — seeding the demo workspace.');
  run(process.execPath, [path.join(ROOT, 'server', 'src', 'seed.js')], ROOT);
} else {
  console.log('\n> Existing database found — skipping seed.');
}

console.log(`
============================================================
 Flowdesk is ready to start.

   Start it:   node server/src/server.js
   Or PM2:     pm2 start server/src/server.js --name flowdesk
   Or Docker:  docker compose up -d

   URL:        http://localhost:4318
   Demo login: demo@flowdesk.app / demo1234
============================================================
`);
