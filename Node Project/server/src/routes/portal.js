/**
 * Public client portal routes.
 *
 * These are the only write endpoints that do not require a session, and they
 * are scoped by an unguessable per-client token:
 *
 *   GET  /api/portal/:token              — the client's invoices
 *   POST /api/portal/:token/pay/:invoiceId — the client records a payment
 *
 * A token resolves to exactly one client, and a payment can only ever be
 * added to an invoice that belongs to that client. Nothing else in the
 * workspace is reachable through these routes.
 */

import express from 'express';
import { q, one, run, uid, nowISO } from '../db.js';
import { fail } from '../middleware/errors.js';
import { readBody, str, oneOf, money } from '../utils/validation.js';
import { invoiceTotals, refreshInvoiceStatus } from '../services/money.js';

const router = express.Router();

const PAYMENT_METHODS = ['cash', 'card', 'bank', 'mobile', 'other'];

/** Resolve a portal token to its client, or fail. */
function clientByToken(token) {
  const client = one('SELECT * FROM clients WHERE portal_token = ?', token);
  if (!client) fail(404, 'Portal not found');
  return client;
}

router.get('/:token', (req, res) => {
  const client = clientByToken(req.params.token);

  const invoices = q(
    `SELECT * FROM invoices WHERE client_id = ? AND status != 'draft' ORDER BY issue_date DESC`,
    client.id,
  ).map((i) => ({ ...i, ...invoiceTotals(i.id) }));

  const business = one('SELECT * FROM businesses WHERE id = ?', client.business_id);

  res.json({
    client: { name: client.name, company: client.company, email: client.email },
    business: {
      name: business.name,
      currency: business.currency,
      locale: business.locale,
      brand_color: business.brand_color,
      accent_color: business.accent_color,
      logo_text: business.logo_text,
      default_terms: business.default_terms,
    },
    invoices,
  });
});

router.post('/:token/pay/:invoiceId', (req, res) => {
  const client = clientByToken(req.params.token);

  // The invoice must belong to the client the token resolves to.
  const invoice = one(
    'SELECT * FROM invoices WHERE id = ? AND client_id = ? AND business_id = ?',
    req.params.invoiceId, client.id, client.business_id,
  );
  if (!invoice) fail(404, 'Invoice not found');
  if (invoice.status === 'cancelled') fail(400, 'Invoice cancelled');

  const body = readBody(req);
  const amount = money(body.amount) || (invoice.total - invoice.paid_amount);
  if (amount <= 0) fail(400, 'Nothing left to pay');

  run(
    `INSERT INTO payments (id,invoice_id,business_id,amount,method,reference,note,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid('pay_'), invoice.id, client.business_id, amount,
    oneOf(str(body.method, 24), PAYMENT_METHODS, 'other'),
    str(body.reference, 120), 'Paid via client portal', nowISO(), nowISO(),
  );
  run('UPDATE invoices SET paid_amount = paid_amount + ? WHERE id = ?', amount, invoice.id);

  const updated = refreshInvoiceStatus(invoice.id);
  res.status(201).json({
    ok: true, invoice: updated, remaining: updated.total - updated.paid_amount,
  });
});

export default router;
