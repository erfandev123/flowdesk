-- =====================================================================
-- Flowdesk — database schema
-- Target: SQLite 3 (Node's built-in node:sqlite module, or the sqlite3 CLI)
--
-- Creates the complete database from scratch. Safe to run on an empty file.
-- The application also applies this schema automatically on first boot,
-- so running this script is optional for Node deployments — it exists so
-- the schema can be reviewed, versioned and applied with standard tooling.
--
-- Usage:
--   sqlite3 flowdesk.db < database/schema.sql
-- =====================================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'en-US',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  brand_color TEXT NOT NULL DEFAULT '#1E3A5F',
  accent_color TEXT NOT NULL DEFAULT '#059669',
  logo_text TEXT NOT NULL DEFAULT '',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  quote_prefix TEXT NOT NULL DEFAULT 'QUO',
  next_invoice_seq INTEGER NOT NULL DEFAULT 1001,
  next_quote_seq INTEGER NOT NULL DEFAULT 1001,
  default_tax REAL NOT NULL DEFAULT 0,
  default_terms TEXT NOT NULL DEFAULT 'Payment due within 14 days.',
  reminder_template TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  portal_token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  vendor TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  expense_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id TEXT,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  recurring_rule TEXT NOT NULL DEFAULT '',
  next_invoice_date TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, business_id)
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'other',
  reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  tax_rate REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id TEXT,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  message TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_clients_business ON clients(business_id);
CREATE INDEX idx_clients_business_name ON clients(business_id, name);
CREATE INDEX idx_clients_portal_token ON clients(portal_token);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_business_date ON expenses(business_id, expense_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_business_issue ON invoices(business_id, issue_date);
CREATE INDEX idx_invoices_business_paid ON invoices(business_id, paid_at);
CREATE INDEX idx_invoices_business_status ON invoices(business_id, status);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_recurring ON invoices(business_id, recurring_rule);
CREATE INDEX idx_memberships_business ON memberships(business_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_quote_items_product ON quote_items(product_id);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quotes_business ON quotes(business_id);
CREATE INDEX idx_quotes_business_status ON quotes(business_id, status);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_reminders_invoice ON reminders(invoice_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);

PRAGMA foreign_keys = ON;
