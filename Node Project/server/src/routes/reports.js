/**
 * Reporting routes — the dashboard and the report endpoints.
 */

import express from 'express';
import { q, one, today } from '../db.js';
import { requireBusiness } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', requireBusiness, (req, res) => {
  const bid = req.businessId;
  const year = today().slice(0, 4);
  const month = today().slice(0, 7);

  const revenueThisMonth = one(
    `SELECT COALESCE(SUM(total),0) AS v FROM invoices
     WHERE business_id = ? AND status = 'paid' AND substr(paid_at,1,7) = ?`,
    bid, month,
  ).v;

  const outstanding = one(
    `SELECT COALESCE(SUM(total - paid_amount),0) AS v FROM invoices
     WHERE business_id = ? AND status IN ('sent','partial','overdue')`,
    bid,
  ).v;

  const overdue = one(
    `SELECT COALESCE(SUM(total - paid_amount),0) AS v FROM invoices
     WHERE business_id = ? AND status = 'overdue'`,
    bid,
  ).v;

  const expensesThisMonth = one(
    `SELECT COALESCE(SUM(amount),0) AS v FROM expenses
     WHERE business_id = ? AND substr(expense_date,1,7) = ?`,
    bid, month,
  ).v;

  const invoiceCount = one('SELECT COUNT(*) AS v FROM invoices WHERE business_id = ?', bid).v;
  const clientCount = one(
    'SELECT COUNT(*) AS v FROM clients WHERE business_id = ? AND status != ?', bid, 'archived',
  ).v;

  const paidOnTime = one(
    `SELECT COUNT(*) AS v FROM invoices WHERE business_id = ? AND status = 'paid'
       AND paid_at IS NOT NULL AND substr(paid_at,1,10) <= due_date`,
    bid,
  ).v;
  const paidTotal = one(
    'SELECT COUNT(*) AS v FROM invoices WHERE business_id = ? AND status = ?', bid, 'paid',
  ).v;

  const monthly = q(
    `SELECT substr(paid_at,1,7) AS month, COALESCE(SUM(total),0) AS revenue
     FROM invoices WHERE business_id = ? AND status = 'paid' AND substr(paid_at,1,4) = ?
     GROUP BY month ORDER BY month ASC`,
    bid, year,
  );

  const aging = q(
    `SELECT c.name AS client_name, iv.number, iv.due_date, (iv.total - iv.paid_amount) AS amount,
            CAST(julianday('now') - julianday(iv.due_date) AS INTEGER) AS days_overdue
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ? AND iv.status IN ('sent','partial','overdue')
       AND iv.total > iv.paid_amount
     ORDER BY days_overdue DESC LIMIT 8`,
    bid,
  );

  const topClients = q(
    `SELECT c.name AS client_name, c.company AS client_company,
            COALESCE(SUM(CASE WHEN iv.status='paid' THEN iv.total ELSE 0 END),0) AS revenue
     FROM clients c LEFT JOIN invoices iv ON iv.client_id = c.id
     WHERE c.business_id = ? GROUP BY c.id ORDER BY revenue DESC LIMIT 5`,
    bid,
  );

  const recent = q(
    `SELECT iv.id, iv.number, iv.status, iv.total, iv.paid_amount, iv.due_date, iv.issue_date,
            iv.paid_at, c.name AS client_name, c.company AS client_company
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ? ORDER BY iv.created_at DESC LIMIT 6`,
    bid,
  );

  const pipeline = q(
    'SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS amount FROM quotes WHERE business_id = ? GROUP BY status',
    bid,
  );

  const expenseByCategory = q(
    `SELECT category, COALESCE(SUM(amount),0) AS amount FROM expenses
     WHERE business_id = ? AND substr(expense_date,1,7) = ? GROUP BY category ORDER BY amount DESC`,
    bid, month,
  );

  res.json({
    revenueThisMonth,
    outstanding,
    overdue,
    expensesThisMonth,
    netThisMonth: revenueThisMonth - expensesThisMonth,
    invoiceCount,
    clientCount,
    collectionRate: paidTotal ? Math.round((paidOnTime / paidTotal) * 100) : 0,
    monthly,
    aging,
    topClients,
    recent,
    pipeline,
    expenseByCategory,
    currency: req.business.currency,
    locale: req.business.locale,
  });
});

router.get('/reports/cashflow', requireBusiness, (req, res) => {
  const rows = q(
    `WITH months AS (
       SELECT DISTINCT substr(COALESCE(paid_at, issue_date),1,7) AS m FROM invoices WHERE business_id = ?
       UNION SELECT DISTINCT substr(expense_date,1,7) FROM expenses WHERE business_id = ?
     )
     SELECT m AS month,
       COALESCE((SELECT SUM(total) FROM invoices WHERE business_id = ? AND status='paid' AND substr(paid_at,1,7)=m),0) AS revenue,
       COALESCE((SELECT SUM(amount) FROM expenses WHERE business_id = ? AND substr(expense_date,1,7)=m),0) AS expenses
     FROM months WHERE m <> '' ORDER BY m ASC`,
    req.businessId, req.businessId, req.businessId, req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, net: r.revenue - r.expenses })));
});

router.get('/reports/invoice-velocity', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT iv.id, iv.number, iv.issue_date, iv.due_date, iv.paid_at, iv.total, iv.paid_amount,
            c.name AS client_name,
            CAST(julianday(COALESCE(iv.paid_at, 'now')) - julianday(iv.issue_date) AS INTEGER) AS days_to_pay
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ? AND iv.issue_date >= date('now','-180 day')
     ORDER BY iv.issue_date DESC`,
    req.businessId,
  );
  res.json(rows);
});

export default router;
