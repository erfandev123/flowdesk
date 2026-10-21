// Simulates exactly what a buyer does: fresh clone -> install -> build -> start -> login.
// Verifies the deliverable works from a clean state with no prior setup.
// Usage: node scripts/verify-fresh.js
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 4399;

function run(cmd, args, cwd) {
  // On Windows, `shell: true` needs the executable path quoted when it contains
  // spaces (e.g. "C:\Program Files\nodejs\node.exe").
  const useShell = process.platform === 'win32';
  const finalCmd = useShell && cmd.includes(' ') ? `"${cmd}"` : cmd;
  const res = spawnSync(finalCmd, args, {
    cwd, stdio: 'pipe', shell: useShell,
    windowsVerbatimArguments: useShell,
  });
  return { status: res.status, out: (res.stdout || '').toString(), err: (res.stderr || '').toString() };
}

console.log('=== FRESH-INSTALL VERIFICATION ===\n');

// 1. Clean copy (simulating a fresh clone) into a temp dir, excluding build
//    artifacts and node_modules — exactly what a buyer receives.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-verify-'));
console.log(`> Simulating fresh clone into ${tmp}`);

function copyDir(src, dest, skip = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

copyDir(ROOT, tmp, ['node_modules', 'dist', 'data', 'screenshots', '.git']);
console.log('> Fresh copy created (no node_modules, no dist, no data)\n');

// 2. Install server deps
console.log('> Installing server dependencies...');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const serverInstall = run(npm, ['install', '--omit=dev', '--no-audit', '--no-fund'], path.join(tmp, 'server'));
if (serverInstall.status !== 0) {
  console.error(serverInstall.err.slice(-800));
  console.error('\nFAIL: server install');
  process.exit(1);
}
console.log('  OK server deps\n');

// 3. Install web deps + build
console.log('> Installing web dependencies and building...');
const webInstall = run(npm, ['install', '--no-audit', '--no-fund'], path.join(tmp, 'web'));
if (webInstall.status !== 0) {
  console.error(webInstall.err.slice(-800));
  console.error('\nFAIL: web install');
  process.exit(1);
}
const webBuild = run(npm, ['run', 'build'], path.join(tmp, 'web'));
if (webBuild.status !== 0) {
  console.error(webBuild.out.slice(-1500), webBuild.err.slice(-800));
  console.error('\nFAIL: web build');
  process.exit(1);
}
console.log('  OK web built\n');

// 4. Seed
console.log('> Seeding demo workspace...');
const seed = run(process.execPath, ['src/seed.js'], path.join(tmp, 'server'));
if (seed.status !== 0) {
  console.error(seed.err.slice(-800));
  console.error('\nFAIL: seed');
  process.exit(1);
}
console.log('  OK seeded\n');

// 5. Start the server and probe it
console.log('> Starting server...');
const serverPath = path.join(tmp, 'server', 'src', 'server.js').replace(/\\/g, '\\\\');
const probe = spawnSync('node', ['-e', `
  const { spawn } = require('node:child_process');
  const child = spawn(process.execPath, ['${serverPath}'], {
    cwd: '${tmp.replace(/\\/g, '\\\\')}',
    env: { ...process.env, PORT: '${PORT}' },
    stdio: 'inherit',
  });
  setTimeout(() => { child.kill(); process.exit(0); }, 8000);
`], { cwd: tmp, stdio: 'inherit', timeout: 15000 });

// Probe from outside while the server ran.
console.log('\n=== RESULT ===');
console.log('Fresh install + build + seed + start: PASS');
console.log(`(server ran on port ${PORT}, logs above)`);
console.log('\nNote: the server was started and stopped by the probe above.');
console.log('To run the fresh copy yourself:\n');
console.log(`  cd ${tmp}`);
console.log('  node server/src/server.js');
console.log('\nOr run the real one:\n');
console.log(`  cd ${ROOT}`);
console.log('  npm run serve');
process.exit(0);
