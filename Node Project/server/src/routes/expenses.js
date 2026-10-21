/**
 * Expense tracking routes.
 */

import express from 'express';
import { q, one, run, uid, nowISO, today } from '../db.js';
import { fail } from '../middleware/errors.js';
import { requireBusiness, requireWrite } from '../middleware/auth.js';
import { readBody, str, money } from '../utils/validation.js';

const router = express.Router();

router.get('/', requireBusiness, (req, res) => {
  const rows = q(
    'SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC, created_at DESC',
    req.businessId,
  );
  res.json(rows);
});

router.post('/', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const id = uid('ex_');
  run(
    `INSERT INTO expenses (id,business_id,category,vendor,amount,expense_date,note,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    id, req.businessId, str(body.category, 60) || 'general', str(body.vendor, 120),
    money(body.amount), str(body.expense_date, 20) || today(), str(body.note, 500), nowISO(),
  );
  res.status(201).json(one('SELECT * FROM expenses WHERE id = ?', id));
});

router.patch('/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT * FROM expenses WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Expense not found');

  const merged = { ...existing, ...readBody(req) };
  run(
    'UPDATE expenses SET category=?,vendor=?,amount=?,expense_date=?,note=? WHERE id=?',
    str(merged.category, 60), str(merged.vendor, 120), money(merged.amount),
    str(merged.expense_date, 20) || existing.expense_date, str(merged.note, 500), existing.id,
  );
  res.json(one('SELECT * FROM expenses WHERE id = ?', existing.id));
});

router.delete('/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT id FROM expenses WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Expense not found');
  run('DELETE FROM expenses WHERE id = ? AND business_id = ?', existing.id, req.businessId);
  res.json({ ok: true });
});

export default router;
