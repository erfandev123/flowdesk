/**
 * Workspace settings, clients and the service catalog.
 *
 * Every lookup by primary key is scoped to `req.businessId`, so a record id
 * from another workspace can never be read or written.
 */

import express from 'express';
import { q, one, run, uid, nowISO } from '../db.js';
import { fail } from '../middleware/errors.js';
import { requireBusiness, requireAdmin, requireWrite } from '../middleware/auth.js';
import {
  readBody, str, num, bool, oneOf, money, validateEmail, validatePhone,
  validateCurrency, validateHexColor,
} from '../utils/validation.js';

const router = express.Router();

/* ------------------------------------------------------------- settings */

router.get('/business', requireBusiness, (req, res) => {
  res.json(req.business);
});

router.patch('/business', requireBusiness, requireAdmin, (req, res) => {
  const body = readBody(req);

  const textFields = {
    name: 'name',
    locale: 'locale',
    timezone: 'timezone',
    logo_text: 'logo_text',
    invoice_prefix: 'invoice_prefix',
    quote_prefix: 'quote_prefix',
    default_terms: 'default_terms',
    reminder_template: 'reminder_template',
  };

  for (const [key, column] of Object.entries(textFields)) {
    if (body[key] !== undefined) {
      run(
        `UPDATE businesses SET ${column} = ? WHERE id = ?`,
        str(body[key], 4000), req.businessId,
      );
    }
  }

  if (body.currency !== undefined) {
    run(
      'UPDATE businesses SET currency = ? WHERE id = ?',
      validateCurrency(body.currency, req.business.currency), req.businessId,
    );
  }
  if (body.brand_color !== undefined) {
    run(
      'UPDATE businesses SET brand_color = ? WHERE id = ?',
      validateHexColor(body.brand_color, req.business.brand_color), req.businessId,
    );
  }
  if (body.accent_color !== undefined) {
    run(
      'UPDATE businesses SET accent_color = ? WHERE id = ?',
      validateHexColor(body.accent_color, req.business.accent_color), req.businessId,
    );
  }
  if (body.default_tax !== undefined) {
    run(
      'UPDATE businesses SET default_tax = ? WHERE id = ?',
      num(body.default_tax), req.businessId,
    );
  }

  res.json(one('SELECT * FROM businesses WHERE id = ?', req.businessId));
});

/* -------------------------------------------------------------- clients */

const clientFields = (body) => ({
  name: str(body.name, 160).trim(),
  company: str(body.company, 160),
  email: str(body.email, 160),
  phone: validatePhone(body.phone),
  address: str(body.address, 400),
  notes: str(body.notes, 2000),
  status: oneOf(str(body.status, 20), ['active', 'lead', 'archived'], 'active'),
});

router.get('/clients', requireBusiness, (req, res) => {
  const search = str(req.query.search, 120).trim();
  const rows = q(
    `SELECT c.*,
       (SELECT COALESCE(SUM(i.total - i.paid_amount),0) FROM invoices i
        WHERE i.client_id = c.id AND i.status NOT IN ('draft','cancelled')) AS outstanding,
       (SELECT COALESCE(SUM(i.total),0) FROM invoices i
        WHERE i.client_id = c.id AND i.status = 'paid') AS lifetime_value,
       (SELECT COUNT(*) FROM invoices i WHERE i.client_id = c.id) AS invoice_count
     FROM clients c
     WHERE c.business_id = ? AND (? = '' OR c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)
     ORDER BY c.created_at DESC`,
    req.businessId, search, `%${search}%`, `%${search}%`, `%${search}%`,
  );
  res.json(rows);
});

router.post('/clients', requireBusiness, requireWrite, (req, res) => {
  const fields = clientFields(readBody(req));
  if (!fields.name) fail(400, 'Client name required');

  const id = uid('c_');
  run(
    `INSERT INTO clients (id,business_id,name,company,email,phone,address,notes,status,portal_token,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, fields.name, fields.company, fields.email, fields.phone,
    fields.address, fields.notes, fields.status, uid('p_'), nowISO(),
  );
  res.status(201).json(one('SELECT * FROM clients WHERE id = ?', id));
});

router.get('/clients/:id', requireBusiness, (req, res) => {
  const client = one(
    'SELECT * FROM clients WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!client) fail(404, 'Client not found');

  const invoices = q(
    'SELECT * FROM invoices WHERE client_id = ? AND business_id = ? ORDER BY issue_date DESC',
    client.id, req.businessId,
  );
  const quotes = q(
    'SELECT * FROM quotes WHERE client_id = ? AND business_id = ? ORDER BY issue_date DESC',
    client.id, req.businessId,
  );
  res.json({ client, invoices, quotes });
});

router.patch('/clients/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT * FROM clients WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Client not found');

  const fields = clientFields({ ...existing, ...readBody(req) });
  run(
    'UPDATE clients SET name=?,company=?,email=?,phone=?,address=?,notes=?,status=? WHERE id=?',
    fields.name, fields.company, fields.email, fields.phone, fields.address,
    fields.notes, fields.status, existing.id,
  );
  res.json(one('SELECT * FROM clients WHERE id = ?', existing.id));
});

router.delete('/clients/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT id FROM clients WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Client not found');
  run('DELETE FROM clients WHERE id = ? AND business_id = ?', existing.id, req.businessId);
  res.json({ ok: true });
});

router.post('/clients/:id/rotate-portal', requireBusiness, requireWrite, (req, res) => {
  const token = uid('p_');
  const result = run(
    'UPDATE clients SET portal_token = ? WHERE id = ? AND business_id = ?',
    token, req.params.id, req.businessId,
  );
  if (!result.changes) fail(404, 'Client not found');
  res.json({ ok: true, portal_token: token });
});

/* ------------------------------------------------------------- products */

router.get('/products', requireBusiness, (req, res) => {
  const includeInactive = bool(req.query.include_inactive);
  const rows = q(
    `SELECT * FROM products WHERE business_id = ? ${includeInactive ? '' : 'AND active = 1'}
     ORDER BY active DESC, name ASC`,
    req.businessId,
  );
  res.json(rows);
});

router.post('/products', requireBusiness, requireWrite, (req, res) => {
  const body = readBody(req);
  const name = str(body.name, 160).trim();
  if (!name) fail(400, 'Product name required');

  const id = uid('pr_');
  run(
    `INSERT INTO products (id,business_id,name,description,unit_price,unit,tax_rate,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, name, str(body.description, 600), money(body.unit_price),
    str(body.unit, 24) || 'unit', num(body.tax_rate), bool(body.active) ? 1 : 0, nowISO(),
  );
  res.status(201).json(one('SELECT * FROM products WHERE id = ?', id));
});

router.patch('/products/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT * FROM products WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Product not found');

  const merged = { ...existing, ...readBody(req) };
  run(
    'UPDATE products SET name=?,description=?,unit_price=?,unit=?,tax_rate=?,active=? WHERE id=?',
    str(merged.name, 160), str(merged.description, 600), money(merged.unit_price),
    str(merged.unit, 24), num(merged.tax_rate), bool(merged.active) ? 1 : 0, existing.id,
  );
  res.json(one('SELECT * FROM products WHERE id = ?', existing.id));
});

router.delete('/products/:id', requireBusiness, requireWrite, (req, res) => {
  const existing = one(
    'SELECT id FROM products WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!existing) fail(404, 'Product not found');
  run(
    'UPDATE products SET active = 0 WHERE id = ? AND business_id = ?', existing.id, req.businessId,
  );
  res.json({ ok: true });
});

export default router;
