/**
 * Authentication, authorisation and role guards.
 *
 * Every business endpoint in this API passes through, in order:
 *
 *   1. `requireAuth`      — the session cookie resolves to a signed-in user.
 *   2. `requireBusiness`  — the user is a member of the requested workspace.
 *   3. `requireRole(...)` — the member's role is high enough for the action.
 *
 * Step 2 is what enforces multi-tenant isolation: the workspace id arrives
 * from the client in the `x-business-id` header, and it is never trusted. The
 * header value is checked against the `memberships` table, and a non-member
 * receives `404` so that workspace existence is not disclosed.
 *
 * Step 3 is what enforces the role hierarchy:
 *
 *   owner  (4)  full control, including team management
 *   admin  (3)  manage team, clients, invoices, reports and settings
 *   member (2)  create and edit clients, quotes, invoices, payments, expenses
 *   viewer (1)  read-only — every mutating route is rejected with 403
 */

import { one, run, nowISO, uid } from '../db.js';
import { SESSION_COOKIE_NAME, SESSION_DAYS } from '../config.js';

/* ------------------------------------------------------------- sessions */

export function createSession(userId, businessId) {
  const token = uid('s_');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  run(
    'INSERT INTO sessions (token, user_id, business_id, expires_at, created_at) VALUES (?,?,?,?,?)',
    token, userId, businessId || null, expires, nowISO(),
  );
  return { token, expires };
}

export function destroySession(token) {
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
}

/** Resolve the signed-in user from the session cookie, or null. */
export function currentUser(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  const session = one('SELECT * FROM sessions WHERE token = ?', token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  const user = one('SELECT id, email, name FROM users WHERE id = ?', session.user_id);
  if (!user) return null;
  return { ...user, token, businessId: session.business_id };
}

/* --------------------------------------------------------------- guards */

/**
 * Requires a signed-in user. Responds `401` otherwise.
 */
export function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

/**
 * Requires the signed-in user to be a member of the requested workspace.
 *
 * The workspace id comes from the `x-business-id` header (or the session
 * default). It is never trusted: membership is verified against the
 * `memberships` table before any business query runs.
 *
 * On success the request gains `req.user`, `req.business`, `req.businessId`
 * and `req.member`.
 */
export function requireBusiness(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const businessId = req.headers['x-business-id'] || req.query.business_id || user.businessId;
  if (!businessId) return res.status(400).json({ error: 'No business selected' });

  const business = one('SELECT * FROM businesses WHERE id = ?', businessId);
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const member = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    user.id, businessId,
  );
  if (!member) return res.status(403).json({ error: 'Access denied' });

  req.user = user;
  req.business = business;
  req.businessId = businessId;
  req.member = member;
  next();
}

/* ---------------------------------------------------------------- roles */

/** Role hierarchy, highest first. */
export const ROLE_LEVEL = { viewer: 1, member: 2, admin: 3, owner: 4 };

/** Every valid role. */
export const ROLES = ['owner', 'admin', 'member', 'viewer'];

/**
 * Build a guard that requires at least `minimumRole`.
 *
 * Must be used after `requireBusiness`, which attaches `req.member`.
 */
export function requireRole(minimumRole) {
  return (req, res, next) => {
    if (!req.member) return res.status(401).json({ error: 'Not authenticated' });
    const current = ROLE_LEVEL[req.member.role] ?? 0;
    const required = ROLE_LEVEL[minimumRole] ?? 99;
    if (current < required) {
      return res.status(403).json({
        error: `This action requires the ${minimumRole} role`,
        required_role: minimumRole,
        your_role: req.member.role,
      });
    }
    next();
  };
}

/** Mutating business data — members and above. */
export const requireWrite = requireRole('member');

/** Workspace administration and team management — admins and above. */
export const requireAdmin = requireRole('admin');

/** Owner-only operations. */
export const requireOwnerRole = requireRole('owner');

/**
 * Verify that a record belongs to the workspace in scope.
 *
 * Every lookup by primary key in this API goes through a helper like this so
 * that a client, invoice, quote, payment or expense id from another workspace
 * can never be read or modified.
 */
export function requireOwned(table, id, businessId, label) {
  const row = one(`SELECT * FROM ${table} WHERE id = ? AND business_id = ?`, id, businessId);
  if (!row) {
    const error = new Error(`${label} not found`);
    error.status = 404;
    error.name = 'HttpError';
    throw error;
  }
  return row;
}
