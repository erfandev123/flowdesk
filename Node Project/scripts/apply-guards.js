// Applies role guards to every mutating route in server.js.
// Idempotent: routes that already carry a guard are skipped.
// Usage: node scripts/apply-guards.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'server', 'src', 'server.js');
const src = fs.readFileSync(file, 'utf8');

// Workspace administration + team management -> admin
const ADMIN = [
  '/business',
  '/team/invite',
  '/team/:userId',
];

// Business data mutations -> member
const MEMBER = [
  '/clients',
  '/clients/:id',
  '/clients/:id/rotate-portal',
  '/products',
  '/products/:id',
  '/quotes',
  '/quotes/:id',
  '/quotes/:id/convert',
  '/invoices',
  '/invoices/:id',
  '/invoices/:id/send',
  '/invoices/:id/payments',
  '/invoices/:id/remind',
  '/payments/:id',
  '/recurring/:id/run',
  '/expenses',
  '/expenses/:id',
];

let out = src;
let changed = 0;

function guardFor(routePath) {
  for (const p of ADMIN) {
    if (routePath === p) return 'requireAdmin';
  }
  for (const p of MEMBER) {
    if (routePath === p) return 'requireWrite';
  }
  return null;
}

// Match: api.<method>('<path>', requireBusiness, (req, res) => {
const routeRe = /api\.(post|patch|delete|put)\(\s*'([^']+)'\s*,\s*requireBusiness\s*,\s*\(req,\s*res\)\s*=>/g;

out = out.replace(routeRe, (match, method, routePath) => {
  const guard = guardFor(routePath);
  if (!guard) {
    console.log(`  SKIP  ${method.toUpperCase()} ${routePath} (no rule)`);
    return match;
  }
  changed++;
  console.log(`  OK    ${method.toUpperCase()} ${routePath} -> ${guard}`);
  return `api.${method}('${routePath}', requireBusiness, ${guard}, (req, res) =>`;
});

fs.writeFileSync(file, out, 'utf8');
console.log(`\nApplied ${changed} role guards.`);
