/**
 * Seed the demo workspace from the command line.
 *
 * Usage:
 *   node server/src/seed.js [email] [password]
 *   DEMO_EMAIL=... DEMO_PASSWORD=... node server/src/seed.js
 *
 * The email and password can also be supplied through the environment. When
 * no password is given, one is generated and printed once — it is not stored
 * anywhere else.
 */

import { randomBytes } from 'node:crypto';
import { seedDemoWorkspace } from './seed-data.js';
import { DEMO_ACCOUNT } from './config.js';

const [, , emailArg, passwordArg] = process.argv;

const email = (emailArg || process.env.DEMO_EMAIL || DEMO_ACCOUNT.email).toLowerCase();
const generated = !passwordArg && !process.env.DEMO_PASSWORD;
const password = passwordArg || process.env.DEMO_PASSWORD
  || randomBytes(9).toString('base64url');

const result = seedDemoWorkspace({ email, password });

if (!result.created) {
  console.log(`User ${email} already exists. Nothing to do.`);
  console.log('Run scripts/clean-test-users.js first if you want a fresh seed.');
  process.exit(0);
}

console.log('Seed complete.');
console.log(`  Login: ${email}`);
if (generated) {
  console.log(`  Password: ${password}`);
  console.log('  (generated for this run — save it now, it is not stored anywhere else)');
}
console.log(`  Business: ${DEMO_ACCOUNT.businessName} (${result.businessId})`);
