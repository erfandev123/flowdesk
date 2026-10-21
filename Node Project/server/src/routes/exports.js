/**
 * CSV export routes.
 *
 * Every query is scoped to `req.businessId`, so an export can never include
 * another workspace's data.
 */

import express from 'express';
import { q } from '../db.js';
import { fail } from '../middleware/errors.js';
import { requireBusiness } from '../middleware/auth.js';

const router = express.Router();

/** Escape a value for CSV output. */
const escapeCell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/:kind.csv', requireBusiness, (req, res) => {
  const kind = req.params.kind;
  let headers = [];
  let rows = [];

  if (kind === 'invoices') {
    headers = ['Number', 'Client', 'Company', 'Status', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Outstanding'];
    rows = q(
      `SELECT iv.number, c.name, c.company, iv.status, iv.issue_date, iv.due_date,
              iv.total, iv.paid_amount
       FROM invoices iv JOIN clients c ON c.id = iv.client_id
       WHERE iv.business_id = ?
       ORDER BY iv.issue_date DESC`,
      req.businessId,
    ).map((r) => [
      r.number, r.name, r.company, r.status, r.issue_date, r.due_date,
      r.total / 100, r.paid_amount / 100, (r.total - r.paid_amount) / 100,
    ]);
  } else if (kind === 'clients') {
    headers = ['Name', 'Company', 'Email', 'Phone', 'Status'];
    rows = q(
      'SELECT * FROM clients WHERE business_id = ? ORDER BY name ASC', req.businessId,
    ).map((r) => [r.name, r.company, r.email, r.phone, r.status]);
  } else if (kind === 'expenses') {
    headers = ['Date', 'Category', 'Vendor', 'Amount', 'Note'];
    rows = q(
      'SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC', req.businessId,
    ).map((r) => [r.expense_date, r.category, r.vendor, r.amount / 100, r.note]);
  } else if (kind === 'payments') {
    headers = ['Invoice', 'Client', 'Amount', 'Method', 'Reference', 'Paid At'];
    rows = q(
      `SELECT iv.number, c.name, p.amount, p.method, p.reference, p.paid_at
       FROM payments p
       JOIN invoices iv ON iv.id = p.invoice_id
       JOIN clients c ON c.id = iv.client_id
       WHERE p.business_id = ? ORDER BY p.paid_at DESC`,
      req.businessId,
    ).map((r) => [r.number, r.name, r.amount / 100, r.method, r.reference, r.paid_at]);
  } else {
    fail(404, 'Unknown export type');
  }

  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="flowdesk-${kind}.csv"`);
  res.send(csv);
});

export default router;
