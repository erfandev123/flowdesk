/**
 * Authentication routes.
 *
 * `register` and `login` are intentionally public — they are how a user
 * obtains a session. Every other route in this API requires a signed-in
 * user with the appropriate role.
 */

import express from 'express';
import { q, one, run, uid, nowISO } from '../db.js';
import { fail } from '../middleware/errors.js';
import {
  requireAuth, createSession, destroySession, currentUser,
} from '../middleware/auth.js';
import {
  readBody, str, validateEmail, validatePassword, validateCurrency,
} from '../utils/validation.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  SESSION_COOKIE_NAME, SESSION_DAYS, COOKIE_SECURE, COOKIE_SAME_SITE,
} from '../config.js';

const router = express.Router();

/** Cookie options for the session cookie. */
export function cookieOpts(expires) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    expires: new Date(expires),
  };
}

router.post('/register', (req, res) => {
  const body = readBody(req);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);
  const name = str(body.name, 120).trim() || email.split('@')[0];
  const businessName = str(body.business_name, 120).trim() || `${name}'s Business`;
  const currency = validateCurrency(body.currency, 'USD');

  if (one('SELECT id FROM users WHERE email = ?', email)) {
    fail(409, 'Email already registered');
  }

  const userId = uid('u_');
  const businessId = uid('b_');
  const ts = nowISO();

  run(
    'INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)',
    userId, email, name, hashPassword(password), ts,
  );
  run(
    'INSERT INTO businesses (id,name,currency,locale,logo_text,created_at) VALUES (?,?,?,?,?,?)',
    businessId, businessName, currency, 'en-US',
    businessName.slice(0, 2).toUpperCase(), ts,
  );
  run(
    'INSERT INTO memberships (user_id,business_id,role,created_at) VALUES (?,?,?,?)',
    userId, businessId, 'owner', ts,
  );

  const session = createSession(userId, businessId);
  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOpts(session.expires));
  res.status(201).json({ ok: true, user: { id: userId, email, name }, businessId });
});

router.post('/login', (req, res) => {
  const body = readBody(req);
  const email = str(body.email, 160).trim().toLowerCase();
  const password = str(body.password, 200);

  const user = one('SELECT * FROM users WHERE email = ?', email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    fail(401, 'Invalid email or password');
  }

  const membership = one(
    'SELECT business_id FROM memberships WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
    user.id,
  );
  const businessId = membership?.business_id || null;

  const session = createSession(user.id, businessId);
  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOpts(session.expires));
  res.json({
    ok: true, user: { id: user.id, email: user.email, name: user.name }, businessId,
  });
});

router.post('/logout', (req, res) => {
  destroySession(req.cookies?.[SESSION_COOKIE_NAME]);
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const businesses = q(
    `SELECT b.*, m.role FROM businesses b
     JOIN memberships m ON m.business_id = b.id
     WHERE m.user_id = ? ORDER BY b.created_at ASC`,
    user.id,
  );

  const active = businesses.find((b) => b.id === user.businessId) || businesses[0] || null;

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    businessId: user.businessId,
    role: active ? active.role : null,
    businesses: businesses.map((b) => ({
      id: b.id, name: b.name, currency: b.currency, role: b.role, logo_text: b.logo_text,
    })),
  });
});
router.post('/switch', requireAuth, (req, res) => {
  const businessId = str(readBody(req).business_id, 64);
  const member = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.user.id, businessId,
  );
  if (!member) fail(403, 'Access denied');
  run('UPDATE sessions SET business_id = ? WHERE token = ?', businessId, req.user.token);
  res.json({ ok: true, businessId, role: member.role });
});

export default router;
