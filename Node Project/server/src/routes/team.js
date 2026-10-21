/**
 * Team management routes.
 *
 * Every route here is restricted to workspace owners and admins by
 * `requireAdmin`. The owner's own membership is protected: it cannot be
 * re-roled or removed, and the last remaining owner cannot be removed at all.
 */

import express from 'express';
import { q, one, run, uid, nowISO } from '../db.js';
import { fail } from '../middleware/errors.js';
import { requireBusiness, requireAdmin, ROLES } from '../middleware/auth.js';
import { readBody, str, validateEmail } from '../utils/validation.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';

const router = express.Router();

router.get('/', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT u.id, u.name, u.email, m.role, m.created_at AS joined_at
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.business_id = ? ORDER BY
       CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
       m.created_at ASC`,
    req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, is_you: r.id === req.user.id })));
});

router.post('/invite', requireBusiness, requireAdmin, (req, res) => {
  const body = readBody(req);
  const email = validateEmail(body.email);
  const name = str(body.name, 120).trim();
  const role = ROLES.includes(str(body.role, 20)) && str(body.role, 20) !== 'owner'
    ? str(body.role, 20)
    : 'member';

  if (!name) fail(400, 'Name is required');
  if (role === 'owner') fail(400, 'Ownership is transferred separately');

  const existing = one('SELECT id, name FROM users WHERE email = ?', email);

  if (existing) {
    const already = one(
      'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
      existing.id, req.businessId,
    );
    if (already) fail(409, 'This person is already in the workspace');

    run(
      'INSERT INTO memberships (user_id,business_id,role,created_at) VALUES (?,?,?,?)',
      existing.id, req.businessId, role, nowISO(),
    );
    res.status(201).json({
      ok: true,
      added: true,
      member: { id: existing.id, name: existing.name, email, role, joined_at: nowISO() },
    });
    return;
  }

  const password = generateTempPassword();
  const userId = uid('u_');
  run(
    'INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)',
    userId, email, name, hashPassword(password), nowISO(),
  );
  run(
    'INSERT INTO memberships (user_id,business_id,role,created_at) VALUES (?,?,?,?)',
    userId, req.businessId, role, nowISO(),
  );

  res.status(201).json({
    ok: true,
    added: true,
    temp_password: password,
    member: { id: userId, name, email, role, joined_at: nowISO() },
  });
});

/**
 * Change a team member's role.
 *
 * Available as `PATCH /api/team/:userId` and as the more explicit
 * `PATCH /api/team/:userId/role`.
 */
function changeRole(req, res) {
  const body = readBody(req);
  const target = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId,
  );
  if (!target) fail(404, 'Team member not found');
  if (target.role === 'owner') fail(400, 'The workspace owner role cannot be changed here');

  const requested = str(body.role, 20);
  const role = ROLES.includes(requested) && requested !== 'owner' ? requested : target.role;

  run(
    'UPDATE memberships SET role = ? WHERE user_id = ? AND business_id = ?',
    role, req.params.userId, req.businessId,
  );
  res.json({ ok: true, role });
}

router.patch('/:userId', requireBusiness, requireAdmin, changeRole);
router.patch('/:userId/role', requireBusiness, requireAdmin, changeRole);

router.delete('/:userId', requireBusiness, requireAdmin, (req, res) => {
  const target = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId,
  );
  if (!target) fail(404, 'Team member not found');
  if (target.role === 'owner') fail(400, 'The workspace owner cannot be removed');
  if (req.params.userId === req.user.id) fail(400, 'You cannot remove yourself');

  // Never leave the workspace without an owner.
  const owners = one(
    "SELECT COUNT(*) AS v FROM memberships WHERE business_id = ? AND role = 'owner'",
    req.businessId,
  ).v;
  if (target.role === 'owner' && owners <= 1) {
    fail(400, 'A workspace must keep at least one owner');
  }

  run(
    'DELETE FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId,
  );
  res.json({ ok: true });
});

export default router;
