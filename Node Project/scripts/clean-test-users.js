// Remove QA/test accounts so the shipped seed data contains only the demo user.
// Usage: node scripts/clean-test-users.js
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', 'server', 'data', 'flowdesk.db'));

const KEEP = ['demo@flowdesk.app'];

const users = db.prepare('SELECT id, email FROM users').all();
let removed = 0;
for (const u of users) {
  if (KEEP.includes(u.email)) continue;
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  db.prepare('DELETE FROM memberships WHERE user_id = ?').run(u.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  removed++;
  console.log(`removed ${u.email}`);
}

db.prepare('DELETE FROM sessions').run();

// Remove workspaces that no longer have any members (orphans left by QA runs).
const orphans = db.prepare(`
  SELECT b.id, b.name FROM businesses b
  WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = b.id)
`).all();
for (const b of orphans) {
  for (const table of ['clients', 'products', 'quotes', 'invoices', 'expenses']) {
    db.prepare(`DELETE FROM ${table} WHERE business_id = ?`).run(b.id);
  }
  db.prepare('DELETE FROM businesses WHERE id = ?').run(b.id);
  console.log(`removed orphan workspace ${b.name}`);
}

console.log(`\nRemaining users: ${db.prepare('SELECT email FROM users').all().map((x) => x.email).join(', ')}`);
console.log(`Remaining workspaces: ${db.prepare('SELECT name FROM businesses').all().map((x) => x.name).join(', ')}`);
console.log(`Removed ${removed} test account(s).`);
db.close();
