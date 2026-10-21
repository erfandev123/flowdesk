// Verify that database/schema.sql and database/seed.sql apply cleanly to an
// empty SQLite database, and report the resulting object counts.
// Usage: node scripts/verify-sql.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const schemaPath = path.join(ROOT, 'database', 'schema.sql');
const seedPath = path.join(ROOT, 'database', 'seed.sql');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowdesk-sql-'));
const db = new DatabaseSync(path.join(tmp, 'verify.db'));

db.exec(fs.readFileSync(schemaPath, 'utf8'));
db.exec(fs.readFileSync(seedPath, 'utf8'));

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
).all().map((r) => r.name);

const indexes = db.prepare(
  "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
).get().c;

console.log('Schema and seed applied cleanly.\n');
console.log(`  tables:  ${tables.length}`);
console.log(`  indexes: ${indexes}`);
console.log('\nRow counts:');
for (const t of tables) {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
  console.log(`  ${t.padEnd(16)} ${count}`);
}

// The seeded demo account must be able to verify against its stored hash.
const user = db.prepare("SELECT email, password_hash FROM users LIMIT 1").get();
if (user) {
  const { verifyPassword } = await import('../server/src/utils/password.js');
  const ok = verifyPassword('demo1234', user.password_hash);
  console.log(`\n  demo credential verifies: ${ok ? 'YES' : 'NO'}`);
  if (!ok) {
    console.error('\nFAIL: the seeded demo password does not match.');
    process.exit(1);
  }
}

db.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nOK');
