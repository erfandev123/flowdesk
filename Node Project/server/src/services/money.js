/**
 * Money calculations for quotes and invoices.
 *
 * All amounts are integer cents. Tax is applied per line and rounded to the
 * nearest cent, then summed. Discounts are subtracted after tax.
 */

import { q, one, run, today, nowISO } from '../db.js';
import { num } from '../utils/validation.js';

const lineTotal = (item) => Math.round(num(item.qty) * num(item.unit_price));
const lineTax = (item) => Math.round(lineTotal(item) * (num(item.tax_rate) / 100));

/** Recalculate and store the totals of a quote. */
export function quoteTotals(quoteId) {
  const items = q('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY position ASC', quoteId);
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    subtotal += lineTotal(item);
    taxTotal += lineTax(item);
  }
  const total = subtotal + taxTotal;
  run(
    'UPDATE quotes SET subtotal=?, tax_total=?, total=? WHERE id=?',
    subtotal, taxTotal, total, quoteId,
  );
  return { items, subtotal, taxTotal, total };
}

/** Recalculate and store the totals of an invoice. */
export function invoiceTotals(invoiceId) {
  const items = q('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position ASC', invoiceId);
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    subtotal += lineTotal(item);
    taxTotal += lineTax(item);
  }
  const discount = num(one('SELECT discount FROM invoices WHERE id = ?', invoiceId)?.discount || 0);
  const total = Math.max(0, subtotal + taxTotal - discount);
  run(
    'UPDATE invoices SET subtotal=?, tax_total=?, total=? WHERE id=?',
    subtotal, taxTotal, total, invoiceId,
  );
  return { items, subtotal, taxTotal, discount, total };
}

/**
 * Derive the status of an invoice from its balance and due date.
 *
 * The status is never stored inconsistently — it is always recalculated from
 * the payment total:
 *
 *   fully paid        -> paid
 *   partly paid       -> partial
 *   unpaid, past due  -> overdue
 *   unpaid, in term   -> sent
 *   never sent        -> draft
 */
export function refreshInvoiceStatus(invoiceId) {
  const invoice = one('SELECT * FROM invoices WHERE id = ?', invoiceId);
  if (!invoice) return null;

  const paid = invoice.paid_amount;
  let status = invoice.status;

  if (invoice.status !== 'cancelled') {
    if (paid >= invoice.total && invoice.total > 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else if (invoice.status === 'draft') status = 'draft';
    else if (invoice.due_date < today()) status = 'overdue';
    else status = 'sent';
  }

  const paidAt = status === 'paid' ? (invoice.paid_at || nowISO()) : invoice.paid_at;
  run('UPDATE invoices SET status=?, paid_at=? WHERE id=?', status, paidAt, invoiceId);

  return { ...one('SELECT * FROM invoices WHERE id = ?', invoiceId), ...invoiceTotals(invoiceId) };
}
