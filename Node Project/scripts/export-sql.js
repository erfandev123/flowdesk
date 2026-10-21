// Generate database/schema.sql and database/seed.sql from the live SQLite
// database, so both files are guaranteed to match the running application.
//
// Usage: node scripts/export-sql.js
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODE_PROJECT = path.join(__dirname, '..');
const ROOT = path.join(NODE_PROJECT, '..');
const DB_PATH = path.join(NODE_PROJECT, 'server', 'data', 'flowdesk.db');
const OUT_DIR = path.join(ROOT, 'database');

if (!fs.existsSync(DB_PATH)) {
  console.error('No database found. Run `node server/src/seed.js` first.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

const q = (sql, ...p) => db.prepare(sql).all(...p);
const one = (sql, ...p) => db.prepare(sql).get(...p);

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/* --------------------------------------------------------------- schema */

const schemaObjects = q(
  `SELECT type, name, sql FROM sqlite_master
   WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, name`,
);

let schema = `-- =====================================================================
-- Flowdesk — database schema
-- Target: SQLite 3 (Node's built-in node:sqlite module, or the sqlite3 CLI)
--
-- Creates the complete database from scratch. Safe to run on an empty file.
-- The application also applies this schema automatically on first boot,
-- so running this script is optional for Node deployments — it exists so
-- the schema can be reviewed, versioned and applied with standard tooling.
--
-- Usage:
--   sqlite3 flowdesk.db < database/schema.sql
-- =====================================================================

PRAGMA foreign_keys = OFF;

`;

for (const obj of schemaObjects) {
  if (obj.type === 'index' && /sqlite_autoindex/.test(obj.sql)) continue;
  if (obj.type === 'index' && /CREATE INDEX/.test(obj.sql)) continue;
  schema += `${obj.sql};\n\n`;
}

// Re-add the indexes that were skipped above (they are needed for performance).
const indexes = q(
  `SELECT sql FROM sqlite_master WHERE type='index' AND sql LIKE 'CREATE INDEX%' ORDER BY name`,
);
for (const idx of indexes) {
  schema += `${idx.sql};\n`;
}

schema += `
PRAGMA foreign_keys = ON;
`;

fs.writeFileSync(path.join(OUT_DIR, 'schema.sql'), schema, 'utf8');
console.log(`Wrote database/schema.sql (${schemaObjects.length} objects)`);

/* ----------------------------------------------------------------- seed */

// Table order respects foreign keys.
const TABLES = [
  'users',
  'businesses',
  'memberships',
  'clients',
  'products',
  'quotes',
  'quote_items',
  'invoices',
  'invoice_items',
  'payments',
  'expenses',
  'reminders',
];

const TABLE_NOTES = {
  users: 'Demo owner account. Password for demo@flowdesk.app is "demo1234"\n-- (stored as a scrypt hash with a per-user random salt).',
  businesses: 'One demo workspace: Northlight Studio.',
  memberships: 'Links the owner to the workspace.',
  clients: 'Seven demo clients with realistic contact details.',
  products: 'Service catalog used by the demo invoices.',
  quotes: 'Demo quotes in different pipeline states.',
  quote_items: 'Line items belonging to the demo quotes.',
  invoices: 'Demo invoices across every status: draft, sent, partial, paid, overdue.',
  invoice_items: 'Line items belonging to the demo invoices.',
  payments: 'Payments recorded against the demo invoices.',
  expenses: 'Categorised expenses feeding the net-profit figures.',
  reminders: 'Reminder messages logged against demo invoices.',
};

let seed = `-- =====================================================================
-- Flowdesk — demo seed data
-- Target: SQLite 3
--
-- Run AFTER database/schema.sql:
--   sqlite3 flowdesk.db < database/schema.sql
--   sqlite3 flowdesk.db < database/seed.sql
--
-- Creates one demo workspace you can sign into immediately:
--
--   Email:    demo@flowdesk.app
--   Password: demo1234
--
-- The demo account is intentionally included so a reviewer can explore the
-- application without creating anything. It holds no real customer data.
-- Change or delete this account before using Flowdesk in production.
-- =====================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

`;

let totalRows = 0;
for (const table of TABLES) {
  const rows = q(`SELECT * FROM ${table}`);
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  seed += `-- ${'-'.repeat(68)}\n`;
  seed += `-- ${table}${TABLE_NOTES[table] ? ` — ${TABLE_NOTES[table]}` : ''}\n`;
  seed += `-- ${'-'.repeat(68)}\n`;
  for (const row of rows) {
    const values = cols.map((c) => sqlLiteral(row[c])).join(', ');
    seed += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values});\n`;
  }
  seed += '\n';
  totalRows += rows.length;
}

seed += `COMMIT;

PRAGMA foreign_keys = ON;
`;

fs.writeFileSync(path.join(OUT_DIR, 'seed.sql'), seed, 'utf8');
console.log(`Wrote database/seed.sql (${totalRows} rows across ${TABLES.length} tables)`);

/* --------------------------------------------------------------- verify */

const counts = TABLES.map((t) => `${t}=${one(`SELECT COUNT(*) AS c FROM ${t}`).c}`).join(' ');
console.log(`\nRow counts: ${counts}`);
db.close();
