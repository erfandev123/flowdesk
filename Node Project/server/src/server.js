import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  db, uid, hashPassword, verifyPassword, nowISO, today,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const SESSION_DAYS = 30;
const PORT = Number(process.env.PORT || 4318);

const q = (sql, ...params) => db.prepare(sql).all(...params);
const one = (sql, ...params) => db.prepare(sql).get(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);

/* ---------------------------------------------------------------- helpers */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};

function readBody(req) {
  const b = req.body || {};
  if (!b || typeof b !== 'object') fail(400, 'Invalid request body');
  return b;
}

function str(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, max);
}

function int(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function oneOf(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

const money = (cents) => Math.round(num(cents));

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round(
    (new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000,
  );
}

/* --------------------------------------------------------------- session */

function createSession(userId, businessId) {
  const token = uid('s_');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  run(
    'INSERT INTO sessions (token, user_id, business_id, expires_at, created_at) VALUES (?,?,?,?,?)',
    token, userId, businessId || null, expires, nowISO(),
  );
  return { token, expires };
}

function destroySession(token) {
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
}

function currentUser(req) {
  const token = req.cookies?.fd_session;
  if (!token) return null;
  const s = one('SELECT * FROM sessions WHERE token = ?', token);
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  const user = one('SELECT id, email, name FROM users WHERE id = ?', s.user_id);
  if (!user) return null;
  return { ...user, token, businessId: s.business_id };
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

function requireBusiness(req, res, next) {
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

/* ------------------------------------------------------------- roles */

/**
 * Role hierarchy, highest first.
 *
 *   owner  — full control, including team management and workspace settings
 *   admin  — manage team, clients, invoices, reports and settings
 *   member — create and edit clients, quotes, invoices, payments, expenses
 *   viewer — read-only; every mutating route is rejected
 */
const ROLE_LEVEL = { viewer: 1, member: 2, admin: 3, owner: 4 };

/**
 * Requires the signed-in member of the current workspace to hold at least the
 * given role. Must be used after `requireBusiness`.
 *
 * Every mutating endpoint in this API is protected by this guard, so a
 * `viewer` can never create, update or delete data.
 */
function requireRole(minimumRole) {
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

/** Mutating business data: members and above. */
const requireWrite = requireRole('member');
/** Workspace administration and team management: admins and above. */
const requireAdmin = requireRole('admin');
/** Owner-only operations. */
const requireOwnerRole = requireRole('owner');

const cookieOpts = (expires) => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  expires: new Date(expires),
});

/* --------------------------------------------------------------- routing */

const api = express.Router();

/* ------------------------------------------------------------------ auth */

api.post('/auth/register', (req, res) => {
  const b = readBody(req);
  const email = str(b.email, 160).trim().toLowerCase();
  const password = str(b.password, 200);
  const name = str(b.name, 120).trim() || email.split('@')[0];
  const businessName = str(b.business_name, 120).trim() || `${name}'s Business`;
  if (!email || !email.includes('@')) fail(400, 'Valid email required');
  if (password.length < 8) fail(400, 'Password must be at least 8 characters');
  if (one('SELECT id FROM users WHERE email = ?', email)) fail(409, 'Email already registered');

  const userId = uid('u_');
  const businessId = uid('b_');
  const ts = nowISO();
  run(
    'INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)',
    userId, email, name, hashPassword(password), ts,
  );
  run(
    `INSERT INTO businesses (id,name,currency,locale,logo_text,created_at) VALUES (?,?,?,?,?,?)`,
    businessId, businessName, str(b.currency, 8) || 'USD', 'en-US',
    businessName.slice(0, 2).toUpperCase(), ts,
  );
  run(
    'INSERT INTO memberships (user_id,business_id,role,created_at) VALUES (?,?,?,?)',
    userId, businessId, 'owner', ts,
  );
  const session = createSession(userId, businessId);
  res.cookie('fd_session', session.token, cookieOpts(session.expires));
  res.status(201).json({ ok: true, user: { id: userId, email, name }, businessId });
});

api.post('/auth/login', (req, res) => {
  const b = readBody(req);
  const email = str(b.email, 160).trim().toLowerCase();
  const password = str(b.password, 200);
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
  res.cookie('fd_session', session.token, cookieOpts(session.expires));
  res.json({
    ok: true, user: { id: user.id, email: user.email, name: user.name }, businessId,
  });
});

api.post('/auth/logout', (req, res) => {
  destroySession(req.cookies?.fd_session);
  res.clearCookie('fd_session', { path: '/' });
  res.json({ ok: true });
});

api.get('/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const businesses = q(
    `SELECT b.*, m.role FROM businesses b
     JOIN memberships m ON m.business_id = b.id
     WHERE m.user_id = ? ORDER BY b.created_at ASC`,
    user.id,
  );
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    businessId: user.businessId,
    businesses: businesses.map((b) => ({
      id: b.id, name: b.name, currency: b.currency, role: b.role, logo_text: b.logo_text,
    })),
  });
});

api.post('/auth/switch', requireAuth, (req, res) => {
  const businessId = str(readBody(req).business_id, 64);
  const member = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.user.id, businessId,
  );
  if (!member) fail(403, 'Access denied');
  run('UPDATE sessions SET business_id = ? WHERE token = ?', businessId, req.user.token);
  res.json({ ok: true, businessId });
});

/* ------------------------------------------------------------------ team */

const ROLES = ['owner', 'admin', 'member', 'viewer'];

api.get('/team', requireBusiness, (req, res) => {
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

api.post('/team/invite', requireBusiness, requireAdmin, (req, res) => {
  const b = readBody(req);
  const email = str(b.email, 160).trim().toLowerCase();
  const name = str(b.name, 120).trim();
  const role = oneOf(str(b.role, 20), ROLES, 'member');
  if (!email || !email.includes('@')) fail(400, 'Valid email required');
  if (!name) fail(400, 'Name is required');
  if (role === 'owner') fail(400, 'Ownership is transferred separately');

  const existing = one('SELECT id FROM users WHERE email = ?', email);
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
      ok: true, added: true,
      member: { id: existing.id, name: existing.name, email, role, joined_at: nowISO() },
    });
    return;
  }

  const password = uid('');
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

api.patch('/team/:userId', requireBusiness, requireAdmin, (req, res) => {
  const b = readBody(req);
  const target = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId,
  );
  if (!target) fail(404, 'Team member not found');
  if (target.role === 'owner') fail(400, 'The workspace owner role cannot be changed here');
  const role = oneOf(str(b.role, 20), ROLES, target.role);
  run('UPDATE memberships SET role = ? WHERE user_id = ? AND business_id = ?',
    role, req.params.userId, req.businessId);
  res.json({ ok: true });
});

api.delete('/team/:userId', requireBusiness, requireAdmin, (req, res) => {
  const target = one(
    'SELECT * FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId,
  );
  if (!target) fail(404, 'Team member not found');
  if (target.role === 'owner') fail(400, 'The workspace owner cannot be removed');
  if (req.params.userId === req.user.id) fail(400, 'You cannot remove yourself');
  run('DELETE FROM memberships WHERE user_id = ? AND business_id = ?',
    req.params.userId, req.businessId);
  res.json({ ok: true });
});

/* -------------------------------------------------------------- business */

api.get('/business', requireBusiness, (req, res) => {
  res.json(req.business);
});

api.patch('/business', requireBusiness, requireAdmin, (req, res) => {
  const b = readBody(req);
  const map = {
    name: 'name', currency: 'currency', locale: 'locale', timezone: 'timezone',
    brand_color: 'brand_color', accent_color: 'accent_color', logo_text: 'logo_text',
    invoice_prefix: 'invoice_prefix', quote_prefix: 'quote_prefix',
    default_terms: 'default_terms', reminder_template: 'reminder_template',
  };
  for (const [key, col] of Object.entries(map)) {
    if (b[key] !== undefined) {
      run(`UPDATE businesses SET ${col} = ? WHERE id = ?`, str(b[key], 4000), req.businessId);
    }
  }
  if (b.default_tax !== undefined) {
    run('UPDATE businesses SET default_tax = ? WHERE id = ?', num(b.default_tax), req.businessId);
  }
  res.json(one('SELECT * FROM businesses WHERE id = ?', req.businessId));
});

/* ---------------------------------------------------------------- clients */

const clientFields = (b) => ({
  name: str(b.name, 160).trim(),
  company: str(b.company, 160),
  email: str(b.email, 160),
  phone: str(b.phone, 60),
  address: str(b.address, 400),
  notes: str(b.notes, 2000),
  status: oneOf(str(b.status, 20), ['active', 'lead', 'archived'], 'active'),
});

api.get('/clients', requireBusiness, (req, res) => {
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

api.post('/clients', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const f = clientFields(b);
  if (!f.name) fail(400, 'Client name required');
  const id = uid('c_');
  run(
    `INSERT INTO clients (id,business_id,name,company,email,phone,address,notes,status,portal_token,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, f.name, f.company, f.email, f.phone, f.address, f.notes,
    f.status, uid('p_'), nowISO(),
  );
  res.status(201).json(one('SELECT * FROM clients WHERE id = ?', id));
});

api.patch('/clients/:id', requireBusiness, requireWrite, (req, res) => {
  const id = req.params.id;
  const existing = one('SELECT * FROM clients WHERE id = ? AND business_id = ?', id, req.businessId);
  if (!existing) fail(404, 'Client not found');
  const f = clientFields({ ...existing, ...readBody(req) });
  run(
    `UPDATE clients SET name=?,company=?,email=?,phone=?,address=?,notes=?,status=? WHERE id=?`,
    f.name, f.company, f.email, f.phone, f.address, f.notes, f.status, id,
  );
  res.json(one('SELECT * FROM clients WHERE id = ?', id));
});

api.delete('/clients/:id', requireBusiness, requireWrite, (req, res) => {
  run('DELETE FROM clients WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  res.json({ ok: true });
});

api.get('/clients/:id', requireBusiness, (req, res) => {
  const client = one('SELECT * FROM clients WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!client) fail(404, 'Client not found');
  const invoices = q(
    'SELECT * FROM invoices WHERE client_id = ? ORDER BY issue_date DESC',
    client.id,
  );
  const quotes = q('SELECT * FROM quotes WHERE client_id = ? ORDER BY issue_date DESC', client.id);
  res.json({ client, invoices, quotes });
});

api.post('/clients/:id/rotate-portal', requireBusiness, requireWrite, (req, res) => {
  const token = uid('p_');
  const r = run(
    'UPDATE clients SET portal_token = ? WHERE id = ? AND business_id = ?',
    token, req.params.id, req.businessId,
  );
  if (!r.changes) fail(404, 'Client not found');
  res.json({ ok: true, portal_token: token });
});

/* --------------------------------------------------------------- products */

api.get('/products', requireBusiness, (req, res) => {
  const includeInactive = bool(req.query.include_inactive);
  const rows = q(
    `SELECT * FROM products WHERE business_id = ? ${includeInactive ? '' : 'AND active = 1'}
     ORDER BY active DESC, name ASC`,
    req.businessId,
  );
  res.json(rows);
});

api.post('/products', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const name = str(b.name, 160).trim();
  if (!name) fail(400, 'Product name required');
  const id = uid('pr_');
  run(
    `INSERT INTO products (id,business_id,name,description,unit_price,unit,tax_rate,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, name, str(b.description, 600), money(b.unit_price),
    str(b.unit, 24) || 'unit', num(b.tax_rate), bool(b.active) ? 1 : 0, nowISO(),
  );
  res.status(201).json(one('SELECT * FROM products WHERE id = ?', id));
});

api.patch('/products/:id', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const existing = one('SELECT * FROM products WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!existing) fail(404, 'Product not found');
  const merged = { ...existing, ...b };
  run(
    `UPDATE products SET name=?,description=?,unit_price=?,unit=?,tax_rate=?,active=? WHERE id=?`,
    str(merged.name, 160), str(merged.description, 600), money(merged.unit_price),
    str(merged.unit, 24), num(merged.tax_rate), bool(merged.active) ? 1 : 0, existing.id,
  );
  res.json(one('SELECT * FROM products WHERE id = ?', existing.id));
});

api.delete('/products/:id', requireBusiness, requireWrite, (req, res) => {
  run('UPDATE products SET active = 0 WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  res.json({ ok: true });
});

/* ------------------------------------------------------- quotes + items */

function quoteTotals(quoteId) {
  const items = q('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY position ASC', quoteId);
  let subtotal = 0;
  let taxTotal = 0;
  for (const it of items) {
    const line = money(it.qty * it.unit_price);
    subtotal += line;
    taxTotal += money(line * (num(it.tax_rate) / 100));
  }
  const total = subtotal + taxTotal;
  run('UPDATE quotes SET subtotal=?, tax_total=?, total=? WHERE id=?', subtotal, taxTotal, total, quoteId);
  return { items, subtotal, taxTotal, total };
}

api.get('/quotes', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT qt.*, c.name AS client_name, c.company AS client_company
     FROM quotes qt JOIN clients c ON c.id = qt.client_id
     WHERE qt.business_id = ? ORDER BY qt.issue_date DESC, qt.created_at DESC`,
    req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, ...quoteTotals(r.id) })));
});

api.post('/quotes', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const clientId = str(b.client_id, 64);
  if (!one('SELECT id FROM clients WHERE id = ? AND business_id = ?', clientId, req.businessId)) {
    fail(400, 'Valid client required');
  }
  const id = uid('qt_');
  const seq = req.business.next_quote_seq;
  run('UPDATE businesses SET next_quote_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.quote_prefix}-${seq}`;
  const issue = str(b.issue_date, 20) || today();
  run(
    `INSERT INTO quotes (id,business_id,client_id,number,status,issue_date,valid_until,notes,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, clientId, number,
    oneOf(str(b.status, 20), ['draft', 'sent', 'accepted', 'declined', 'expired'], 'draft'),
    issue, str(b.valid_until, 20) || addDays(issue, 30), str(b.notes, 2000), nowISO(),
  );
  syncQuoteItems(id, Array.isArray(b.items) ? b.items : []);
  res.status(201).json(one('SELECT * FROM quotes WHERE id = ?', id));
});

function syncQuoteItems(quoteId, items) {
  run('DELETE FROM quote_items WHERE quote_id = ?', quoteId);
  items.forEach((raw, idx) => {
    const description = str(raw.description, 300).trim();
    if (!description) return;
    run(
      `INSERT INTO quote_items (id,quote_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('qi_'), quoteId, str(raw.product_id, 64) || null, description,
      num(raw.qty, 1), money(raw.unit_price), num(raw.tax_rate), idx,
    );
  });
}

api.get('/quotes/:id', requireBusiness, (req, res) => {
  const quote = one('SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!quote) fail(404, 'Quote not found');
  res.json({ ...quote, ...quoteTotals(quote.id) });
});

api.patch('/quotes/:id', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const existing = one('SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!existing) fail(404, 'Quote not found');
  if (b.items !== undefined) syncQuoteItems(existing.id, Array.isArray(b.items) ? b.items : []);
  run(
    `UPDATE quotes SET status=?, issue_date=?, valid_until=?, notes=? WHERE id=?`,
    oneOf(str(b.status, 20) || existing.status, ['draft', 'sent', 'accepted', 'declined', 'expired'], existing.status),
    str(b.issue_date, 20) || existing.issue_date,
    str(b.valid_until, 20) || existing.valid_until,
    b.notes !== undefined ? str(b.notes, 2000) : existing.notes,
    existing.id,
  );
  quoteTotals(existing.id);
  res.json(one('SELECT * FROM quotes WHERE id = ?', existing.id));
});

api.delete('/quotes/:id', requireBusiness, requireWrite, (req, res) => {
  run('DELETE FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  res.json({ ok: true });
});

api.post('/quotes/:id/convert', requireBusiness, requireWrite, (req, res) => {
  const quote = one('SELECT * FROM quotes WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!quote) fail(404, 'Quote not found');
  const totals = quoteTotals(quote.id);
  const b = readBody(req);
  const issue = str(b.issue_date, 20) || today();
  const due = str(b.due_date, 20) || addDays(issue, 14);
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
  totals.items.forEach((it, idx) => {
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), id, it.product_id, it.description, it.qty, it.unit_price, it.tax_rate, idx,
    );
  });
  run('UPDATE quotes SET status = ? WHERE id = ?', 'accepted', quote.id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

/* -------------------------------------------------------------- invoices */

function invoiceTotals(invoiceId) {
  const items = q('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY position ASC', invoiceId);
  let subtotal = 0;
  let taxTotal = 0;
  for (const it of items) {
    const line = money(it.qty * it.unit_price);
    subtotal += line;
    taxTotal += money(line * (num(it.tax_rate) / 100));
  }
  const discount = num(one('SELECT discount FROM invoices WHERE id = ?', invoiceId)?.discount || 0);
  const total = Math.max(0, subtotal + taxTotal - discount);
  run('UPDATE invoices SET subtotal=?, tax_total=?, total=? WHERE id=?', subtotal, taxTotal, total, invoiceId);
  return { items, subtotal, taxTotal, discount, total };
}

function refreshInvoiceStatus(invoiceId) {
  const inv = one('SELECT * FROM invoices WHERE id = ?', invoiceId);
  if (!inv) return null;
  const paid = inv.paid_amount;
  let status = inv.status;
  if (inv.status !== 'cancelled') {
    if (paid >= inv.total && inv.total > 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else if (inv.status === 'draft') status = 'draft';
    else if (inv.due_date < today()) status = 'overdue';
    else status = 'sent';
  }
  const paidAt = status === 'paid' ? (inv.paid_at || nowISO()) : inv.paid_at;
  run('UPDATE invoices SET status=?, paid_at=? WHERE id=?', status, paidAt, invoiceId);
  return { ...one('SELECT * FROM invoices WHERE id = ?', invoiceId), ...invoiceTotals(invoiceId) };
}

api.get('/invoices', requireBusiness, (req, res) => {
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

api.post('/invoices', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const clientId = str(b.client_id, 64);
  if (!one('SELECT id FROM clients WHERE id = ? AND business_id = ?', clientId, req.businessId)) {
    fail(400, 'Valid client required');
  }
  const id = uid('iv_');
  const seq = req.business.next_invoice_seq;
  run('UPDATE businesses SET next_invoice_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.invoice_prefix}-${seq}`;
  const issue = str(b.issue_date, 20) || today();
  const due = str(b.due_date, 20) || addDays(issue, 14);
  const discount = money(b.discount);
  run(
    `INSERT INTO invoices (id,business_id,client_id,number,status,issue_date,due_date,notes,terms,discount,recurring_rule,next_invoice_date,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, clientId, number, 'draft', issue, due,
    str(b.notes, 2000), str(b.terms, 2000) || req.business.default_terms, discount,
    str(b.recurring_rule, 40), b.next_invoice_date ? str(b.next_invoice_date, 20) : null, nowISO(),
  );
  syncInvoiceItems(id, Array.isArray(b.items) ? b.items : []);
  invoiceTotals(id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

function syncInvoiceItems(invoiceId, items) {
  run('DELETE FROM invoice_items WHERE invoice_id = ?', invoiceId);
  items.forEach((raw, idx) => {
    const description = str(raw.description, 300).trim();
    if (!description) return;
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), invoiceId, str(raw.product_id, 64) || null, description,
      num(raw.qty, 1), money(raw.unit_price), num(raw.tax_rate), idx,
    );
  });
}

api.get('/invoices/:id', requireBusiness, (req, res) => {
  const inv = one('SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!inv) fail(404, 'Invoice not found');
  const payments = q('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC', inv.id);
  const reminders = q('SELECT * FROM reminders WHERE invoice_id = ? ORDER BY sent_at DESC', inv.id);
  const client = one('SELECT * FROM clients WHERE id = ?', inv.client_id);
  res.json({ ...inv, ...invoiceTotals(inv.id), payments, reminders, client });
});

api.patch('/invoices/:id', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const existing = one('SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!existing) fail(404, 'Invoice not found');
  if (b.items !== undefined) syncInvoiceItems(existing.id, Array.isArray(b.items) ? b.items : []);
  run(
    `UPDATE invoices SET issue_date=?, due_date=?, notes=?, terms=?, discount=?, recurring_rule=?, next_invoice_date=? WHERE id=?`,
    str(b.issue_date, 20) || existing.issue_date,
    str(b.due_date, 20) || existing.due_date,
    b.notes !== undefined ? str(b.notes, 2000) : existing.notes,
    b.terms !== undefined ? str(b.terms, 2000) : existing.terms,
    b.discount !== undefined ? money(b.discount) : existing.discount,
    b.recurring_rule !== undefined ? str(b.recurring_rule, 40) : existing.recurring_rule,
    b.next_invoice_date !== undefined
      ? (b.next_invoice_date ? str(b.next_invoice_date, 20) : null)
      : existing.next_invoice_date,
    existing.id,
  );
  invoiceTotals(existing.id);
  const refreshed = refreshInvoiceStatus(existing.id);
  res.json(refreshed);
});

api.post('/invoices/:id/send', requireBusiness, requireWrite, (req, res) => {
  const inv = one('SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!inv) fail(404, 'Invoice not found');
  if (!inv.sent_at) run('UPDATE invoices SET sent_at = ? WHERE id = ?', nowISO(), inv.id);
  if (inv.status === 'draft') run('UPDATE invoices SET status = ? WHERE id = ?', 'sent', inv.id);
  res.json(refreshInvoiceStatus(inv.id));
});

api.post('/invoices/:id/payments', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const inv = one('SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!inv) fail(404, 'Invoice not found');
  const amount = money(b.amount);
  if (amount <= 0) fail(400, 'Payment amount must be greater than zero');
  run(
    `INSERT INTO payments (id,invoice_id,business_id,amount,method,reference,note,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid('pay_'), inv.id, req.businessId, amount,
    oneOf(str(b.method, 24), ['cash', 'card', 'bank', 'mobile', 'other'], 'other'),
    str(b.reference, 120), str(b.note, 500), str(b.paid_at, 30) || nowISO(), nowISO(),
  );
  run('UPDATE invoices SET paid_amount = paid_amount + ? WHERE id = ?', amount, inv.id);
  res.status(201).json(refreshInvoiceStatus(inv.id));
});

api.delete('/payments/:id', requireBusiness, requireWrite, (req, res) => {
  const pay = one(
    'SELECT * FROM payments WHERE id = ? AND business_id = ?', req.params.id, req.businessId,
  );
  if (!pay) fail(404, 'Payment not found');
  run('DELETE FROM payments WHERE id = ?', pay.id);
  run('UPDATE invoices SET paid_amount = MAX(0, paid_amount - ?) WHERE id = ?', pay.amount, pay.invoice_id);
  res.json(refreshInvoiceStatus(pay.invoice_id));
});

api.delete('/invoices/:id', requireBusiness, requireWrite, (req, res) => {
  run('DELETE FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  res.json({ ok: true });
});

api.post('/invoices/:id/remind', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const inv = one(
    `SELECT iv.*, c.name AS client_name, c.email AS client_email
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.id = ? AND iv.business_id = ?`,
    req.params.id, req.businessId,
  );
  if (!inv) fail(404, 'Invoice not found');
  const channel = oneOf(str(b.channel, 20), ['email', 'whatsapp', 'sms'], 'email');
  const outstanding = inv.total - inv.paid_amount;
  const message = str(b.message, 2000) || buildReminder(req.business, inv, channel, outstanding);
  run(
    `INSERT INTO reminders (id,invoice_id,channel,message,sent_at,created_at) VALUES (?,?,?,?,?,?)`,
    uid('rm_'), inv.id, channel, message, nowISO(), nowISO(),
  );
  res.status(201).json({ ok: true, message, channel });
});

function buildReminder(business, inv, channel, outstanding) {
  const money = (cents) => new Intl.NumberFormat(business.locale || 'en-US', {
    style: 'currency', currency: business.currency,
  }).format(cents / 100);
  const clientName = inv.client_name || 'there';
  if (channel === 'whatsapp') {
    return `Hi ${clientName}, a friendly reminder that invoice ${inv.number} for ${money(outstanding)} is due on ${inv.due_date}. You can view and pay it here: ${inv.portal_url || '(client portal link)'}. Thank you!`;
  }
  if (channel === 'sms') {
    return `Hi ${clientName}, invoice ${inv.number} (${money(outstanding)}) is due ${inv.due_date}. Pay: ${inv.portal_url || '(portal link)'}`;
  }
  return business.reminder_template
    ? business.reminder_template
      .replace(/\{\{client\}\}/g, clientName)
      .replace(/\{\{number\}\}/g, inv.number)
      .replace(/\{\{amount\}\}/g, money(outstanding))
      .replace(/\{\{due\}\}/g, inv.due_date)
      .replace(/\{\{link\}\}/g, inv.portal_url || '')
    : `Hi ${clientName},\n\nJust a friendly reminder that invoice ${inv.number} for ${money(outstanding)} is due on ${inv.due_date}.\n\nYou can view and pay it online: ${inv.portal_url || ''}\n\nThank you,\n${business.name}`;
}

/* ----------------------------------------------------- recurring billing */

api.get('/recurring', requireBusiness, (req, res) => {
  const rows = q(
    `SELECT iv.*, c.name AS client_name, c.company AS client_company
     FROM invoices iv JOIN clients c ON c.id = iv.client_id
     WHERE iv.business_id = ? AND iv.recurring_rule <> '' ORDER BY iv.next_invoice_date ASC`,
    req.businessId,
  );
  res.json(rows.map((r) => ({ ...r, ...invoiceTotals(r.id) })));
});

api.post('/recurring/:id/run', requireBusiness, requireWrite, (req, res) => {
  const src = one('SELECT * FROM invoices WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!src) fail(404, 'Recurring invoice not found');
  const totals = invoiceTotals(src.id);
  const id = uid('iv_');
  const seq = req.business.next_invoice_seq;
  run('UPDATE businesses SET next_invoice_seq = ? WHERE id = ?', seq + 1, req.businessId);
  const number = `${req.business.invoice_prefix}-${seq}`;
  const issue = str(readBody(req).issue_date, 20) || today();
  const due = addDays(issue, 14);
  run(
    `INSERT INTO invoices (id,business_id,client_id,number,status,issue_date,due_date,notes,terms,subtotal,tax_total,total,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, req.businessId, src.client_id, number, 'draft', issue, due, src.notes, src.terms,
    totals.subtotal, totals.taxTotal, totals.total, nowISO(),
  );
  totals.items.forEach((it, idx) => {
    run(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
      uid('ii_'), id, it.product_id, it.description, it.qty, it.unit_price, it.tax_rate, idx,
    );
  });
  const rule = src.recurring_rule;
  const nextDate = rule === 'weekly' ? addDays(issue, 7)
    : rule === 'monthly' ? addDays(issue, 30)
      : rule === 'quarterly' ? addDays(issue, 91)
        : rule === 'yearly' ? addDays(issue, 365)
          : addDays(issue, 30);
  run('UPDATE invoices SET next_invoice_date = ? WHERE id = ?', nextDate, src.id);
  res.status(201).json(one('SELECT * FROM invoices WHERE id = ?', id));
});

/* -------------------------------------------------------------- expenses */

api.get('/expenses', requireBusiness, (req, res) => {
  const rows = q(
    'SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC, created_at DESC',
    req.businessId,
  );
  res.json(rows);
});

api.post('/expenses', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const id = uid('ex_');
  run(
    `INSERT INTO expenses (id,business_id,category,vendor,amount,expense_date,note,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    id, req.businessId, str(b.category, 60) || 'general', str(b.vendor, 120),
    money(b.amount), str(b.expense_date, 20) || today(), str(b.note, 500), nowISO(),
  );
  res.status(201).json(one('SELECT * FROM expenses WHERE id = ?', id));
});

api.patch('/expenses/:id', requireBusiness, requireWrite, (req, res) => {
  const b = readBody(req);
  const existing = one('SELECT * FROM expenses WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  if (!existing) fail(404, 'Expense not found');
  const merged = { ...existing, ...b };
  run(
    'UPDATE expenses SET category=?,vendor=?,amount=?,expense_date=?,note=? WHERE id=?',
    str(merged.category, 60), str(merged.vendor, 120), money(merged.amount),
    str(merged.expense_date, 20) || existing.expense_date, str(merged.note, 500), existing.id,
  );
  res.json(one('SELECT * FROM expenses WHERE id = ?', existing.id));
});

api.delete('/expenses/:id', requireBusiness, requireWrite, (req, res) => {
  run('DELETE FROM expenses WHERE id = ? AND business_id = ?', req.params.id, req.businessId);
  res.json({ ok: true });
});

/* -------------------------------------------------------------- dashboard */

api.get('/dashboard', requireBusiness, (req, res) => {
  const bid = req.businessId;
  const y = today().slice(0, 4);
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
    `SELECT COUNT(*) AS v FROM clients WHERE business_id = ? AND status != 'archived'`, bid,
  ).v;

  const paidOnTime = one(
    `SELECT COUNT(*) AS v FROM invoices WHERE business_id = ? AND status = 'paid'
       AND paid_at IS NOT NULL AND substr(paid_at,1,10) <= due_date`,
    bid,
  ).v;
  const paidTotal = one('SELECT COUNT(*) AS v FROM invoices WHERE business_id = ? AND status = \'paid\'', bid).v;

  const monthly = q(
    `SELECT substr(paid_at,1,7) AS month, COALESCE(SUM(total),0) AS revenue
     FROM invoices WHERE business_id = ? AND status = 'paid' AND substr(paid_at,1,4) = ?
     GROUP BY month ORDER BY month ASC`,
    bid, y,
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
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS amount
     FROM quotes WHERE business_id = ? GROUP BY status`,
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

api.get('/reports/cashflow', requireBusiness, (req, res) => {
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

api.get('/reports/invoice-velocity', requireBusiness, (req, res) => {
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

/* ------------------------------------------------------------ CSV export */

api.get('/export/:kind.csv', requireBusiness, (req, res) => {
  const kind = req.params.kind;
  let headers = [];
  let rows = [];
  if (kind === 'invoices') {
    headers = ['Number', 'Client', 'Company', 'Status', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Outstanding'];
    rows = q(
      `SELECT iv.number, c.name, c.company, iv.status, iv.issue_date, iv.due_date, iv.total, iv.paid_amount
       FROM invoices iv JOIN clients c ON c.id=iv.client_id WHERE iv.business_id=?
       ORDER BY iv.issue_date DESC`,
      req.businessId,
    ).map((r) => [r.number, r.name, r.company, r.status, r.issue_date, r.due_date, r.total / 100, r.paid_amount / 100, (r.total - r.paid_amount) / 100]);
  } else if (kind === 'clients') {
    headers = ['Name', 'Company', 'Email', 'Phone', 'Status'];
    rows = q('SELECT * FROM clients WHERE business_id = ? ORDER BY name ASC', req.businessId)
      .map((r) => [r.name, r.company, r.email, r.phone, r.status]);
  } else if (kind === 'expenses') {
    headers = ['Date', 'Category', 'Vendor', 'Amount', 'Note'];
    rows = q('SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC', req.businessId)
      .map((r) => [r.expense_date, r.category, r.vendor, r.amount / 100, r.note]);
  } else if (kind === 'payments') {
    headers = ['Invoice', 'Client', 'Amount', 'Method', 'Reference', 'Paid At'];
    rows = q(
      `SELECT iv.number, c.name, p.amount, p.method, p.reference, p.paid_at
       FROM payments p JOIN invoices iv ON iv.id=p.invoice_id JOIN clients c ON c.id=iv.client_id
       WHERE p.business_id=? ORDER BY p.paid_at DESC`,
      req.businessId,
    ).map((r) => [r.number, r.name, r.amount / 100, r.method, r.reference, r.paid_at]);
  } else {
    fail(404, 'Unknown export type');
  }
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="flowdesk-${kind}.csv"`);
  res.send(csv);
});

/* ------------------------------------------------------- public portal */

api.get('/portal/:token', (req, res) => {
  const client = one('SELECT * FROM clients WHERE portal_token = ?', req.params.token);
  if (!client) fail(404, 'Portal not found');
  const invoices = q(
    `SELECT * FROM invoices WHERE client_id = ? AND status != 'draft' ORDER BY issue_date DESC`,
    client.id,
  ).map((i) => ({ ...i, ...invoiceTotals(i.id) }));
  const business = one('SELECT * FROM businesses WHERE id = ?', client.business_id);
  res.json({
    client: { name: client.name, company: client.company, email: client.email },
    business: {
      name: business.name, currency: business.currency, locale: business.locale,
      brand_color: business.brand_color, accent_color: business.accent_color,
      logo_text: business.logo_text, default_terms: business.default_terms,
    },
    invoices,
  });
});

api.post('/portal/:token/pay/:invoiceId', (req, res) => {
  const client = one('SELECT * FROM clients WHERE portal_token = ?', req.params.token);
  if (!client) fail(404, 'Portal not found');
  const inv = one(
    'SELECT * FROM invoices WHERE id = ? AND client_id = ?', req.params.invoiceId, client.id,
  );
  if (!inv) fail(404, 'Invoice not found');
  if (inv.status === 'cancelled') fail(400, 'Invoice cancelled');
  const amount = money(readBody(req).amount) || (inv.total - inv.paid_amount);
  if (amount <= 0) fail(400, 'Nothing left to pay');
  run(
    `INSERT INTO payments (id,invoice_id,business_id,amount,method,reference,note,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid('pay_'), inv.id, client.business_id, amount,
    oneOf(str(readBody(req).method, 24), ['cash', 'card', 'bank', 'mobile', 'other'], 'other'),
    str(readBody(req).reference, 120), 'Paid via client portal', nowISO(), nowISO(),
  );
  run('UPDATE invoices SET paid_amount = paid_amount + ? WHERE id = ?', amount, inv.id);
  const updated = refreshInvoiceStatus(inv.id);
  res.status(201).json({
    ok: true, invoice: updated, remaining: updated.total - updated.paid_amount,
  });
});

/* --------------------------------------------------------------- health */

api.get('/health', (req, res) => {
  try {
    const rows = q('SELECT COUNT(*) AS v FROM businesses')[0];
    res.json({ ok: true, service: 'flowdesk', workspaces: rows.v, uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

/* --------------------------------------------------------------- errors */

api.use((req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

app.use('/api', api);

app.use('/api', (err, req, res, next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
});

/* -------------------------------------------------------- static client */

const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Flowdesk API listening on http://127.0.0.1:${PORT}`);
});

export { app };
