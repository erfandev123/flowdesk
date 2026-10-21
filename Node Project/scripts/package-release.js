// Builds the release archive with the exact folder structure the marketplace expects.
// Usage: node scripts/package-release.js
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODE_PROJECT = path.join(__dirname, '..');
const ROOT = path.join(NODE_PROJECT, '..');
const STAGE = path.join(ROOT, '.release');
const ZIP = path.join(ROOT, 'flowdesk-source-code.zip');

// Everything that must not ship.
const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'bin', 'obj', '.git', '.next',
  'data', '.release', 'coverage',
]);
// Checked separately — `screenshots` is intentionally included in the release.
const CHECKED_DIRS = new Set(['screenshots']);
const EXCLUDED_FILES = new Set([
  '.env', '.env.local', 'tsconfig.tsbuildinfo', 'package-lock.json.bak',
]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;
    if (entry.name.startsWith('.env.') && entry.name !== '.env.example') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('=== Packaging release ===\n');
fs.rmSync(STAGE, { recursive: true, force: true });

const out = path.join(STAGE, 'flowdesk');
fs.mkdirSync(out, { recursive: true });

// Root documentation
for (const f of ['README.md', 'HowToSetup.md', 'CLAUDE.md', 'CHANGELOG.md', 'LICENSE-NOTE.md', 'LICENSE']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log(`  + ${f}`);
  } else {
    console.log(`  ! MISSING ${f}`);
  }
}

// The application
copyDir(NODE_PROJECT, path.join(out, 'Node Project'));
console.log('  + Node Project/');

// Database scripts
copyDir(path.join(ROOT, 'database'), path.join(out, 'database'));
console.log('  + database/');

// Docs
copyDir(path.join(ROOT, 'docs'), path.join(out, 'docs'));
console.log('  + docs/');

// Docker
for (const f of ['docker-compose.yml', 'Dockerfile', '.dockerignore', '.gitignore']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log(`  + ${f}`);
  }
}

// Screenshots are large; include them only when present and under a size cap.
const shots = path.join(ROOT, 'screenshots');
if (fs.existsSync(shots)) {
  copyDir(shots, path.join(out, 'screenshots'));
  console.log('  + screenshots/');
}

// --- verify the staged tree -----------------------------------------------

const problems = [];

function walk(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) && !CHECKED_DIRS.has(entry.name)) {
        problems.push(`excluded directory present: ${r}`);
      }
      walk(p, r);
    } else {
      if (EXCLUDED_FILES.has(entry.name)) problems.push(`excluded file present: ${r}`);
      if (entry.name === '.env' && !entry.name.endsWith('.example')) {
        problems.push(`real .env present: ${r}`);
      }
      if (/\.(db|sqlite|sqlite3)$/.test(entry.name)) problems.push(`database file present: ${r}`);
    }
  }
}
walk(out);

const required = [
  'README.md', 'HowToSetup.md', 'CLAUDE.md', 'CHANGELOG.md', 'LICENSE-NOTE.md',
  'Node Project/package.json',
  'Node Project/server/package.json',
  'Node Project/server/package-lock.json',
  'Node Project/server/src/server.js',
  'Node Project/server/src/db.js',
  'Node Project/server/src/seed.js',
  'Node Project/.env.example',
  'Node Project/web/package.json',
  'Node Project/web/package-lock.json',
  'Node Project/web/src/main.tsx',
  'Node Project/web/index.html',
  'Node Project/web/vite.config.ts',
  'database/schema.sql',
  'database/seed.sql',
  'docker-compose.yml',
];
for (const f of required) {
  if (!fs.existsSync(path.join(out, f))) problems.push(`REQUIRED FILE MISSING: ${f}`);
}

if (problems.length) {
  console.error('\nPACKAGING PROBLEMS:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\n  verification: all required files present, no excluded artifacts\n');

// --- zip ------------------------------------------------------------------

fs.rmSync(ZIP, { force: true });
const ps = spawnSync(
  'powershell',
  ['-NoProfile', '-Command',
    `Compress-Archive -Path '${out}\\*' -DestinationPath '${ZIP}' -Force`],
  { stdio: 'inherit' },
);
if (ps.status !== 0) {
  console.error('Failed to create the zip archive.');
  process.exit(1);
}

const size = fs.statSync(ZIP).size;
console.log(`=== Release archive ready ===`);
console.log(`  ${ZIP}`);
console.log(`  ${(size / 1024 / 1024).toFixed(2)} MB`);
