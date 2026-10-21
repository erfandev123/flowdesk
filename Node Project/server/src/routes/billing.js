/**
 * Quotes, invoices, payments, reminders and recurring billing.
 *
 * Every lookup by primary key is scoped to `req.businessId`, and every
 * mutation carries a role guard. Payment **reversal** is treated as a
 * sensitive operation and requires the `admin` role — recording a payment is
 * routine work a `member` can do, but removing a recorded payment is not.
 */

import express from 'express';
import { q, one, run, uid, nowISO, today } from '../db.js';
import { fail } from '../middleware/errors.js';
import { requireBusiness, requireWrite, requireAdmin } from '../middleware/auth.js';
import {
  readBody, str, num, oneOf, money, addDays,
} from '../utils/validation.js';
import { invoiceTotals, quoteTotals, refreshInvoiceStatus } from '../services/money.js';
import { buildReminder } from '../services/reminders.js';

const router = express.Router();

const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'];
const PAYMENT_METHODS = ['cash', 'card', 'bank', 'mobile', 'other'];
const REMINDER_CHANNELS = ['email', 'whatsapp', 'sms'];

/* --------------------------------------------------------------- quotes */

function syncQuoteItems(quoteId, items) {
  run('DELETE FROM quote_items WHERE quote_id = ?', quoteId);
  items.forEach((raw, index) => {
    const description = str(raw.description, 300).trim();
    if (!description) return;
    run(
      `INSERT INTO quote_items (id,quote_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('qi_'), quoteId, str(raw.product_id, 64) || null, description,
      num(raw.qty, 1), money(raw.unit_price), num(raw.tax_rate), index,
    );
  });
}

router.get('/quotes', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT qt.*, c.name AS client_name, c.company AS client_company
     FROM quotes qt JOIN clients c ON c.id = qt.client_id
     WHERE qt.business_id = ? ORDER BY qt.issue_date DESC, qt.created_at DESC`,
    req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, ...quoteTotals(r.id) })));
});

router.post('/quotes', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const clientId = str(body.client_id, 64);
  const client = one(
    'SELECT id FROM clients WHERE id = ? AND business_id = ?', clientId, req.businessId,
  );
  if (!client) fail(400, 'Valid client required');

  const id = uid('qt_');
  const seq = req.business.next_quote_seq;
  run('UPDATE businesses SET next_quote_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.quote_prefix}-${seq}`;
  const issue = str(body.issue_date, 20) || today();

  run(
    `INSERT INTO quotes (id,business_id,client_id,number,status,issue_date,valid_until,notes,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, clientId, number,
    oneOf(str(body.status, 20), QUOTE_STATUSES, 'draft'),
    issue, str(body.valid_until, 20) || addDays(issue, 30), str(body.notes, 2000), nowISO(),
  );
  syncQuoteItems(id, Array.isArray(body.items) ? body.items : []);
  res.status(201).json(one('SELECT * FROM quotes WHERE id = ?', id));
});

router.get('/quotes/:id', requireBusiness, (req, res) => {
  const quote = one(
    'SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!quote) fail(404, 'Quote not found');
  res.json({ ...quote, ...quoteTotals(quote.id) });
});

router.patch('/quotes/:id', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const existing = one(
    'SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Quote not found');

  if (body.items !== undefined) {
    syncQuoteItems(existing.id, Array.isArray(body.items) ? body.items : []);
  }

  run(
    'UPDATE quotes SET status=?, issue_date=?, valid_until=?, notes=? WHERE id=?',
    oneOf(str(body.status, 20) || existing.status, QUOTE_STATUSES, existing.status),
    str(body.issue_date, 20) || existing.issue_date,
    str(body.valid_until, 20) || existing.valid_until,
    body.notes !== undefined ? str(body.notes, 2000) : existing.notes,
    existing.id,
  );
  quoteTotals(existing.id);
  res.json(one('SELECT * FROM quotes WHERE id = ?', existing.id));
});

router.delete('/quotes/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT id FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Quote not found');
  run('DELETE FROM quotes WHERE id = ? AND business_id = ?', existing.id, req.businessId);
  res.json({ ok: true });
});

router.post('/quotes/:id/convert', requireBusiness, requireWrite, (req, res) => {
  const quote = one(
    'SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!quote) fail(404, 'Quote not found');

  const totals = quoteTotals(quote.id);
  const body = readBody(req);
  const issue = str(body.issue_date, 20) || today();
  const due = str(body.due_date, 20) || addDays(issue, 14);

  const id = uid('iv_');
  const seq = req.business.next_invoice_seq;
  run('UPDATE businesses SET next_invoice_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.invoice_prefix}-${seq}`;

  run(
    `INSERT INTO invoices (id,business_id,client_id,quote_id,number,status,issue_date,due_date,notes,terms,subtotal,tax_total,total,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, quote.client_id, quote.id, number, 'draft', issue, due,
    quote.notes, req.business.default_terms, totals.subtotal, totals.taxTotal, totals.total, nowISO(),
  );

  totals.items.forEach((item, index) => {
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), id, item.product_id, item.description, item.qty, item.unit_price,
      item.tax_rate, index,
    );
  });

  run('UPDATE quotes SET status = ? WHERE id = ?', 'accepted', quote.id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

/* ------------------------------------------------------------- invoices */

function syncInvoiceItems(invoiceId, items) {
  run('DELETE FROM invoice_items WHERE invoice_id = ?', invoiceId);
  items.forEach((raw, index) => {
    const description = str(raw.description, 300).trim();
    if (!description) return;
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), invoiceId, str(raw.product_id, 64) || null, description,
      num(raw.qty, 1), money(raw.unit_price), num(raw.tax_rate), index,
    );
  });
}

router.get('/invoices', requireBusiness, (req, res) => {
  const status = str(req.query.status, 20);
  const search = str(req.query.search, 120).trim();
  const rows = q(
    `SELECT iv.*, c.name AS client_name, c.company AS client_company, c.email AS client_email
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ?
       AND (? = '' OR iv.status = ?)
       AND (? = '' OR c.name LIKE ? OR c.company LIKE ? OR iv.number LIKE ?)
     ORDER BY iv.issue_date DESC, iv.created_at DESC`,
    req.businessId, status, status, search, `%${search}%`, `%${search}%`, `%${search}%`,
  );
  res.json(rows.map((r) => ({ ...r, ...invoiceTotals(r.id) })));
});

router.post('/invoices', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const clientId = str(body.client_id, 64);
  const client = one(
    'SELECT id FROM clients WHERE id = ? AND business_id = ?', clientId, req.businessId,
  );
  if (!client) fail(400, 'Valid client required');

  const id = uid('iv_');
  const seq = req.business.next_invoice_seq;
  run('UPDATE businesses SET next_invoice_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.invoice_prefix}-${seq}`;
  const issue = str(body.issue_date, 20) || today();
  const due = str(body.due_date, 20) || addDays(issue, 14);

  run(
    `INSERT INTO invoices (id,business_id,client_id,number,status,issue_date,due_date,notes,terms,discount,recurring_rule,next_invoice_date,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, clientId, number, 'draft', issue, due,
    str(body.notes, 2000), str(body.terms, 2000) || req.business.default_terms,
    money(body.discount), str(body.recurring_rule, 40),
    body.next_invoice_date ? str(body.next_invoice_date, 20) : null, nowISO(),
  );
  syncInvoiceItems(id, Array.isArray(body.items) ? body.items : []);
  invoiceTotals(id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

router.get('/invoices/:id', requireBusiness, (req, res) => {
  const invoice = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!invoice) fail(404, 'Invoice not found');

  const payments = q(
    'SELECT * FROM payments WHERE invoice_id = ? AND business_id = ? ORDER BY paid_at DESC',
    invoice.id, req.businessId,
  );
  const reminders = q(
    'SELECT * FROM reminders WHERE invoice_id = ? ORDER BY sent_at DESC', invoice.id,
  );
  const client = one(
    'SELECT * FROM clients WHERE id = ? AND business_id = ?', invoice.client_id, req.businessId,
  );
  res.json({ ...invoice, ...invoiceTotals(invoice.id), payments, reminders, client });
});

router.patch('/invoices/:id', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const existing = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Invoice not found');

  if (body.items !== undefined) {
    syncInvoiceItems(existing.id, Array.isArray(body.items) ? body.items : []);
  }

  run(
    'UPDATE invoices SET issue_date=?, due_date=?, notes=?, terms=?, discount=?, recurring_rule=?, next_invoice_date=? WHERE id=?',
    str(body.issue_date, 20) || existing.issue_date,
    str(body.due_date, 20) || existing.due_date,
    body.notes !== undefined ? str(body.notes, 2000) : existing.notes,
    body.terms !== undefined ? str(body.terms, 2000) : existing.terms,
    body.discount !== undefined ? money(body.discount) : existing.discount,
    body.recurring_rule !== undefined ? str(body.recurring_rule, 40) : existing.recurring_rule,
    body.next_invoice_date !== undefined
      ? (body.next_invoice_date ? str(body.next_invoice_date, 20) : null)
      : existing.next_invoice_date,
    existing.id,
  );
  invoiceTotals(existing.id);
  res.json(refreshInvoiceStatus(existing.id));
});

router.post('/invoices/:id/send', requireBusiness, requireWrite, (req, res) => {
  const invoice = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!invoice) fail(404, 'Invoice not found');
  if (!invoice.sent_at) {
    run('UPDATE invoices SET sent_at = ? WHERE id = ?', nowISO(), invoice.id);
  }
  if (invoice.status === 'draft') {
    run('UPDATE invoices SET status = ? WHERE id = ?', 'sent', invoice.id);
  }
  res.json(refreshInvoiceStatus(invoice.id));
});

router.post('/invoices/:id/payments', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const invoice = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!invoice) fail(404, 'Invoice not found');

  const amount = money(body.amount);
  if (amount <= 0) fail(400, 'Payment amount must be greater than zero');

  run(
    `INSERT INTO payments (id,invoice_id,business_id,amount,method,reference,note,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid('pay_'), invoice.id, req.businessId, amount,
    oneOf(str(body.method, 24), PAYMENT_METHODS, 'other'),
    str(body.reference, 120), str(body.note, 500),
    str(body.paid_at, 30) || nowISO(), nowISO(),
  );
  run('UPDATE invoices SET paid_amount = paid_amount + ? WHERE id = ?', amount, invoice.id);
  res.status(201).json(refreshInvoiceStatus(invoice.id));
});

/**
 * Reverse a payment.
 *
 * Removing a recorded payment changes the money a client is recorded as
 * having paid, so it requires the `admin` role rather than `member`.
 */
router.delete('/payments/:id', requireBusiness, requireAdmin, (req, res) => {
  const payment = one(
    'SELECT * FROM payments WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!payment) fail(404, 'Payment not found');

  const invoice = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?',
    payment.invoice_id, req.businessId,
  );
  if (!invoice) fail(404, 'Invoice not found');

  run('DELETE FROM payments WHERE id = ?', payment.id);
  run(
    'UPDATE invoices SET paid_amount = MAX(0, paid_amount - ?) WHERE id = ?',
    payment.amount, invoice.id,
  );
  res.json(refreshInvoiceStatus(invoice.id));
});

router.delete('/invoices/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT id FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Invoice not found');
  run('DELETE FROM invoices WHERE id = ? AND business_id = ?', existing.id, req.businessId);
  res.json({ ok: true });
});

router.post('/invoices/:id/remind', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const invoice = one(
    `SELECT iv.*, c.name AS client_name, c.email AS client_email, c.portal_token
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.id = ? AND iv.business_id = ?`,
    req.params.id, req.businessId,
  );
  if (!invoice) fail(404, 'Invoice not found');

  const channel = oneOf(str(body.channel, 20), REMINDER_CHANNELS, 'email');
  const outstanding = invoice.total - invoice.paid_amount;
  const portalUrl = invoice.portal_token
    ? `${req.business.portal_base_url || ''}/portal/${invoice.portal_token}`
    : '';

  const message = str(body.message, 2000)
    || buildReminder(req.business, invoice, channel, outstanding, portalUrl);

  run(
    'INSERT INTO reminders (id,invoice_id,channel,message,sent_at,created_at) VALUES (?,?,?,?,?,?)',
    uid('rm_'), invoice.id, channel, message, nowISO(), nowISO(),
  );
  res.status(201).json({ ok: true, message, channel });
});

/* ----------------------------------------------------- recurring billing */

router.get('/recurring', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT iv.*, c.name AS client_name, c.company AS client_company
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ? AND iv.recurring_rule <> '' ORDER BY iv.next_invoice_date ASC`,
    req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, ...invoiceTotals(r.id) })));
});

router.post('/recurring/:id/run', requireBusiness, requireWrite, (req, res) => {
  const source = one(
    'SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!source) fail(404, 'Recurring invoice not found');

  const totals = invoiceTotals(source.id);
  const id = uid('iv_');
  const seq = req.business.next_invoice_seq;
  run('UPDATE businesses SET next_invoice_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.invoice_prefix}-${seq}`;
  const issue = str(readBody(req).issue_date, 20) || today();
  const due = addDays(issue, 14);

  run(
    `INSERT INTO invoices (id,business_id,client_id,number,status,issue_date,due_date,notes,terms,subtotal,tax_total,total,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, source.client_id, number, 'draft', issue, due,
    source.notes, source.terms, totals.subtotal, totals.taxTotal, totals.total, nowISO(),
  );

  totals.items.forEach((item, index) => {
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), id, item.product_id, item.description, item.qty, item.unit_price,
      item.tax_rate, index,
    );
  });

  const rule = source.recurring_rule;
  const nextDate = rule === 'weekly' ? addDays(issue, 7)
    : rule === 'monthly' ? addDays(issue, 30)
      : rule === 'quarterly' ? addDays(issue, 91)
        : rule === 'yearly' ? addDays(issue, 365)
          : addDays(issue, 30);

  run('UPDATE invoices SET next_invoice_date = ? WHERE id = ?', nextDate, source.id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

export default router;
