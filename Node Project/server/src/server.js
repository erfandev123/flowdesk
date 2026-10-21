/**
 * Flowdesk — API server.
 *
 * Application setup only. Every route lives in its own module under
 * `src/routes/`, the guards live in `src/middleware/auth.js`, and the money
 * calculations live in `src/services/`.
 *
 * Request flow for any business endpoint:
 *
 *   requireAuth  ->  requireBusiness  ->  requireRole(...)
 *
 * `requireBusiness` verifies that the signed-in user is a member of the
 * workspace named in the `x-business-id` header. The header is never trusted
 * on its own, and every query is additionally scoped by `business_id`.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { q, one } from './db.js';
import { PORT, BODY_LIMIT, SESSION_COOKIE_NAME } from './config.js';
import { seedDemoWorkspace } from './seed-data.js';

import authRoutes from './routes/auth.js';
import teamRoutes from './routes/team.js';
import businessRoutes from './routes/business.js';
import billingRoutes from './routes/billing.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import exportRoutes from './routes/exports.js';
import portalRoutes from './routes/portal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: BODY_LIMIT }));
app.use(cookieParser());

/* --------------------------------------------------------------- routes */

const api = express.Router();

api.get('/health', (req, res) => {
  try {
    const row = q('SELECT COUNT(*) AS v FROM businesses')[0];
    res.json({
      ok: true,
      service: 'flowdesk',
      workspaces: row.v,
      uptime: Math.round(process.uptime()),
    });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

api.use('/auth', authRoutes);
api.use('/team', teamRoutes);
api.use('/', businessRoutes);
api.use('/', billingRoutes);
api.use('/expenses', expenseRoutes);
api.use('/', reportRoutes);
api.use('/export', exportRoutes);
api.use('/portal', portalRoutes);

api.use((req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

app.use('/api', api);

/* --------------------------------------------------------- error handler */

app.use('/api', (err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const body = { error: err.message || 'Server error' };
  if (err.required_role) {
    body.required_role = err.required_role;
    body.your_role = err.your_role;
  }
  res.status(status).json(body);
});

/* -------------------------------------------------------- static client */

const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

/* ----------------------------------------------------------------- boot */

/**
 * Seed the demo workspace when the database has no users.
 *
 * This matters for ephemeral deployments: on a platform where the filesystem
 * is wiped on every restart (a free container host, for example), the app
 * recreates the demo data on the next boot instead of coming up empty.
 *
 * Set `SEED_ON_BOOT=false` to disable it in production.
 */
function seedOnBoot() {
  if (process.env.SEED_ON_BOOT === 'false') return;
  const users = one('SELECT COUNT(*) AS v FROM users').v;
  if (users > 0) return;

  const result = seedDemoWorkspace();
  if (result.created) {
    console.log(`[flowdesk] seeded demo workspace (${result.email})`);
  }
}

// The seed runs before the server starts listening, so the first request
// always finds a ready database.
seedOnBoot();

app.listen(PORT, () => {
  console.log(`Flowdesk API listening on http://127.0.0.1:${PORT}`);
});

export { app };
