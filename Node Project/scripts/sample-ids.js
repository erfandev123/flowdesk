// Print ids of a sample invoice and client portal token for screenshot capture.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', 'server', 'data', 'flowdesk.db'));

const inv = db.prepare(
  "SELECT id, number, status FROM invoices WHERE status IN ('overdue','partial','sent') ORDER BY status LIMIT 1",
).get();
const client = db.prepare(
  'SELECT c.portal_token, c.name FROM clients c JOIN invoices i ON i.client_id = c.id WHERE i.status != \'draft\' LIMIT 1',
).get();

console.log(JSON.stringify({ invoice: inv, token: client?.portal_token, client: client?.name }));
