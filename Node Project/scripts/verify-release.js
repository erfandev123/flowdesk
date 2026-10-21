// End-to-end verification of the release archive: unzip to a clean location,
// restore packages, create the database from database/schema.sql + seed.sql,
// build, start the server and log in with the demo credentials.
// Usage: node scripts/verify-release.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEMO_EMAIL, DEMO_PASSWORD } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODE_PROJECT = path.join(__dirname, '..');
const ROOT = path.join(NODE_PROJECT, '..');
const ZIP = path.join(ROOT, 'flowdesk-source-code.zip');
const PORT = 4411;

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, cwd) {
  const useShell = process.platform === 'win32';
  const finalCmd = useShell && cmd.includes(' ') ? `"${cmd}"` : cmd;
  const res = spawnSync(finalCmd, args, {
    cwd, stdio: 'pipe', shell: useShell, windowsVerbatimArguments: useShell,
  });
  return {
    status: res.status,
    out: (res.stdout || '').toString(),
    err: (res.stderr || '').toString(),
  };
}

function step(label) {
  console.log(`\n> ${label}`);
}

function fail(msg, detail) {
  console.error(`\nFAIL: ${msg}`);
  if (detail) console.error(detail.slice(-1500));
  process.exit(1);
}

console.log('=== RELEASE ARCHIVE VERIFICATION ===\n');

if (!fs.existsSync(ZIP)) fail(`archive not found at ${ZIP}`);

// 1. Unzip to a clean temp directory.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-release-'));
step(`Unzipping ${path.basename(ZIP)} into ${tmp}`);
const un = run('powershell', [
  '-NoProfile', '-Command',
  `Expand-Archive -Path '${ZIP}' -DestinationPath '${tmp}' -Force`,
], ROOT);
if (un.status !== 0) fail('could not unzip the archive', un.err);

// The archive is created with Compress-Archive from inside the staging
// directory, so its entries sit at the root of the zip (README.md, Node
// Project/, database/, ...). Detect either layout.
let app;
if (fs.existsSync(path.join(tmp, 'flowdesk'))) {
  app = path.join(tmp, 'flowdesk');
} else if (fs.existsSync(path.join(tmp, 'README.md'))) {
  app = tmp;
} else {
  fail('the archive does not contain the expected project files');
}
console.log(`  project root: ${app}`);

// 2. Verify the required layout.
step('Checking the required folder structure');
const required = [
  'README.md', 'HowToSetup.md', 'CLAUDE.md', 'CHANGELOG.md', 'LICENSE-NOTE.md',
  'Node Project/package.json',
  'Node Project/server/package.json', 'Node Project/server/package-lock.json',
  'Node Project/server/src/server.js', 'Node Project/server/src/db.js',
  'Node Project/server/src/seed.js',
  'Node Project/web/package.json', 'Node Project/web/package-lock.json',
  'Node Project/web/src/main.tsx', 'Node Project/web/index.html',
  'Node Project/web/vite.config.ts',
  'Node Project/.env.example',
  'database/schema.sql', 'database/seed.sql',
  'docker-compose.yml',
];
const missing = required.filter((f) => !fs.existsSync(path.join(app, f)));
if (missing.length) fail('required files are missing', missing.join('\n'));
console.log(`  all ${required.length} required files present`);

// 3. Verify no excluded artifacts and no real credentials.
step('Checking for excluded artifacts and real credentials');
const banned = [];
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'build', 'bin', 'obj', '.git'].includes(e.name)) {
        banned.push(`excluded dir: ${path.relative(app, p)}`);
        continue;
      }
      scan(p);
    } else {
      if (e.name === '.env') banned.push(`real .env: ${path.relative(app, p)}`);
      if (/\.(db|sqlite|sqlite3)(-shm|-wal)?$/.test(e.name)) {
        banned.push(`database file: ${path.relative(app, p)}`);
      }
    }
  }
}
scan(app);
if (banned.length) fail('excluded artifacts found', banned.join('\n'));
console.log('  no node_modules, dist, .git, database files or real .env');

// 4. Restore packages.
step('Restoring packages (server)');
let r = run(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund'], path.join(app, 'Node Project', 'server'));
if (r.status !== 0) {
  console.log('  npm ci unavailable, falling back to npm install');
  r = run(npm, ['install', '--omit=dev', '--no-audit', '--no-fund'], path.join(app, 'Node Project', 'server'));
}
if (r.status !== 0) fail('server packages did not restore', r.err);
console.log('  server packages restored');

step('Restoring packages and building (web)');
r = run(npm, ['ci', '--no-audit', '--no-fund'], path.join(app, 'Node Project', 'web'));
if (r.status !== 0) {
  r = run(npm, ['install', '--no-audit', '--no-fund'], path.join(app, 'Node Project', 'web'));
}
if (r.status !== 0) fail('web packages did not restore', r.err);
console.log('  web packages restored');

r = run(npm, ['run', 'build'], path.join(app, 'Node Project', 'web'));
if (r.status !== 0) fail('web build failed', r.out + r.err);
console.log('  web built');

// 5. Create the database from the SQL scripts.
step('Creating the database from database/schema.sql + database/seed.sql');
const dbDir = path.join(app, 'Node Project', 'server', 'data');
fs.mkdirSync(dbDir, { recursive: true });

// Written to a file rather than passed with `node -e`, because a multi-line
// script through a Windows shell loses its quoting.
const applyScript = path.join(tmp, 'apply-sql.cjs');
fs.writeFileSync(applyScript, `
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const db = new DatabaseSync(${JSON.stringify(path.join(dbDir, 'flowdesk.db'))});
db.exec(fs.readFileSync(${JSON.stringify(path.join(app, 'database', 'schema.sql'))}, 'utf8'));
db.exec(fs.readFileSync(${JSON.stringify(path.join(app, 'database', 'seed.sql'))}, 'utf8'));
const c = (t) => db.prepare('SELECT COUNT(*) c FROM ' + t).get().c;
console.log('users=' + c('users') + ' clients=' + c('clients') + ' invoices=' + c('invoices'));
db.close();
`, 'utf8');

const sqlRes = run(process.execPath, [applyScript], app);
if (sqlRes.status !== 0) fail('could not apply the SQL scripts', sqlRes.err);
console.log(`  applied: ${sqlRes.out.trim()}`);

// 6. Start the server and log in with the demo credentials.
step(`Starting the server on port ${PORT}`);
const child = spawn(process.execPath, ['server/src/server.js'], {
  cwd: path.join(app, 'Node Project'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d.toString(); });
child.stderr.on('data', (d) => { serverLog += d.toString(); });

let up = false;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    if (res.ok) { up = true; break; }
  } catch { /* not up yet */ }
}
if (!up) {
  child.kill();
  fail('the server did not start', serverLog);
}
console.log('  server is up');

// 7. Log in with the demo credentials from the seed data.
step('Signing in with the demo credentials');
const loginRes = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
});
if (!loginRes.ok) {
  child.kill();
  fail('demo login failed', await loginRes.text());
}
const login = await loginRes.json();
const cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];
console.log(`  signed in as ${login.user.email}, workspace ${login.businessId}`);

// 8. Check the dashboard and the landing page.
const dashRes = await fetch(`http://127.0.0.1:${PORT}/api/dashboard`, {
  headers: { cookie, 'x-business-id': login.businessId },
});
const dash = await dashRes.json();
console.log(`  dashboard: ${dash.clientCount} clients, ${dash.invoiceCount} invoices, revenue ${dash.revenueThisMonth}`);
if (!dash.clientCount || !dash.invoiceCount) {
  child.kill();
  fail('the dashboard returned no demo data');
}

const landing = await fetch(`http://127.0.0.1:${PORT}/`);
console.log(`  landing page: ${landing.status}`);

// 9. Confirm an unauthenticated write is rejected.
const unauth = await fetch(`http://127.0.0.1:${PORT}/api/clients`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Should fail' }),
});
console.log(`  unauthenticated write: ${unauth.status} (expected 401)`);
if (unauth.status !== 401) {
  child.kill();
  fail('an unauthenticated write was not rejected');
}

child.kill();

console.log(`
============================================================
 RELEASE ARCHIVE VERIFIED
============================================================
  unzip                  OK
  required structure     OK
  no excluded artifacts  OK
  no real credentials    OK
  packages restored      OK
  web build              OK
  database from SQL      OK
  server started         OK
  demo login             OK
  demo data loaded       OK
  auth guard active      OK
============================================================
`);
console.log(`Unpacked copy kept at: ${tmp}`);
process.exit(0);
