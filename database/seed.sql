-- =====================================================================
-- Flowdesk — demo seed data
-- Target: SQLite 3
--
-- Run AFTER database/schema.sql:
--   sqlite3 flowdesk.db < database/schema.sql
--   sqlite3 flowdesk.db < database/seed.sql
--
-- Creates one demo workspace you can sign into immediately. The demo
-- credentials are documented in HowToSetup.md, section 5.
--
-- The demo account is intentionally included so a reviewer can explore the
-- application without creating anything. It holds no real customer data.
-- Change or delete this account before using Flowdesk in production.
-- =====================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- --------------------------------------------------------------------
-- users — Demo owner account. See HowToSetup.md section 5 for the demo credentials.
-- --------------------------------------------------------------------
INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u_V09lYXmrhqrZ', 'demo@flowdesk.app', 'Demo Owner', '4afdc1019e232c9b98bca87df85ce23f:0d7b9e842e0caf31b7c5eb298dadbd33ae33e559f8224db7a309978cb65d524414d8322e07fb2d260ab9b724d379b7703d964d8867312bc77266fd33cde5c218', '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- businesses — One demo workspace: Northlight Studio.
-- --------------------------------------------------------------------
INSERT INTO businesses (id, name, currency, locale, timezone, brand_color, accent_color, logo_text, invoice_prefix, quote_prefix, next_invoice_seq, next_quote_seq, default_tax, default_terms, reminder_template, created_at) VALUES ('b_tXUAYxGqpU7S', 'Northlight Studio', 'USD', 'en-US', 'UTC', '#1E3A5F', '#059669', 'NS', 'INV', 'QUO', 1002, 1001, 8.5, 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 'Hi {{client}},

A friendly reminder that invoice {{number}} for {{amount}} is due on {{due}}. You can view and pay it here: {{link}}

Thank you,
{{business}}', '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- memberships — Links the owner to the workspace.
-- --------------------------------------------------------------------
INSERT INTO memberships (user_id, business_id, role, created_at) VALUES ('u_V09lYXmrhqrZ', 'b_tXUAYxGqpU7S', 'owner', '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- clients — Seven demo clients with fictional contact details.
-- --------------------------------------------------------------------
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_VEi7DvrySvqs', 'b_tXUAYxGqpU7S', 'Ava Bennett', 'Ava Bennett Studio', 'ava@studio.co', '+1 415 555 0142', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_d_EtCaDitPFQ', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_JCw_rHXQ30KW', 'b_tXUAYxGqpU7S', 'Marcus Lee', 'Kite & Co. Retail', 'marcus@kiteco.com', '+1 212 555 0198', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_XqbyUBDyhJbZ', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_4OnX50xcNBnw', 'b_tXUAYxGqpU7S', 'Priya Raman', 'Lumen Health', 'priya@lumenhealth.io', '+1 617 555 0117', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_DiGvYGOUfDpJ', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_d2vzRQWLzeQK', 'b_tXUAYxGqpU7S', 'Tomás Ortega', 'Ortega Legal', 'tomas@ortegalaw.com', '+1 305 555 0173', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_V1qdll7sJ9Xk', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_4ChBbnxETmld', 'b_tXUAYxGqpU7S', 'Sofia Almeida', 'Atelier Almeida', 'sofia@atelieralmeida.com', '+1 213 555 0164', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_H0PArx0UR7aB', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_sj5HZBV0kTy6', 'b_tXUAYxGqpU7S', 'Daniel Okoye', 'Okoye Logistics', 'daniel@okoyelogistics.com', '+1 404 555 0155', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'lead', 'p_jwOWcBM8i_lM', '2026-10-21T17:52:55.113Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_466gJKJJxN1N', 'b_tXUAYxGqpU7S', 'Hannah Weiss', 'Weiss Fitness Studio', 'hannah@weissfit.com', '+1 206 555 0186', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_IH42UGv_FZwd', '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- products — Service catalog used by the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_LDYIS6IHtwVk', 'b_tXUAYxGqpU7S', 'Brand Identity Sprint', 'Logo system, palette, type scale and brand guide', 240000, 'project', 8.5, 1, '2026-10-21T17:52:55.113Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_pHecpdF76oie', 'b_tXUAYxGqpU7S', 'Website Design', 'Responsive marketing site design, up to 8 pages', 180000, 'project', 8.5, 1, '2026-10-21T17:52:55.113Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_qjVNfSmj4DzT', 'b_tXUAYxGqpU7S', 'Frontend Build', 'Production React implementation with CMS hooks', 320000, 'project', 8.5, 1, '2026-10-21T17:52:55.113Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_0XE4y7X80wu3', 'b_tXUAYxGqpU7S', 'Monthly Retainer', 'Ongoing design and development support', 65000, 'month', 8.5, 1, '2026-10-21T17:52:55.113Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_w2CsXMyoQlkb', 'b_tXUAYxGqpU7S', 'Motion Graphics', 'Animated logo sting and social cutdowns', 120000, 'project', 8.5, 1, '2026-10-21T17:52:55.113Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_dH-RNYh73_EJ', 'b_tXUAYxGqpU7S', 'Copywriting', 'Web copy for landing and product pages', 95000, 'project', 8.5, 1, '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- quotes — Demo quotes in different pipeline states.
-- --------------------------------------------------------------------
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_9khuURhkchfb', 'b_tXUAYxGqpU7S', 'c_VEi7DvrySvqs', 'QUO-2001', 'sent', '2026-10-17', '2026-11-16', 'Scope includes two revision rounds per deliverable.', 740000, 62900, 802900, '2026-10-21T17:52:55.113Z');
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_tt-pFW1if5Y2', 'b_tXUAYxGqpU7S', 'c_sj5HZBV0kTy6', 'QUO-2002', 'draft', '2026-10-11', '2026-11-10', 'Scope includes two revision rounds per deliverable.', 240000, 20400, 260400, '2026-10-21T17:52:55.113Z');
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_orIXrhymgMEM', 'b_tXUAYxGqpU7S', 'c_4ChBbnxETmld', 'QUO-2003', 'accepted', '2026-10-05', '2026-11-04', 'Scope includes two revision rounds per deliverable.', 160000, 13600, 173600, '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- quote_items — Line items belonging to the demo quotes.
-- --------------------------------------------------------------------
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_ab3-vI-v1pd4', 'qt_9khuURhkchfb', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint', 1, 240000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_BtBZts9OLuOA', 'qt_9khuURhkchfb', 'pr_pHecpdF76oie', 'Website Design', 1, 180000, 8.5, 1);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_NXlM2CcEOtOm', 'qt_9khuURhkchfb', 'pr_qjVNfSmj4DzT', 'Frontend Build', 1, 320000, 8.5, 2);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_vfh4wg4hYeSY', 'qt_tt-pFW1if5Y2', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint', 1, 240000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_ottUK3r8nSCU', 'qt_orIXrhymgMEM', 'pr_0XE4y7X80wu3', 'Monthly Retainer', 1, 65000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_oi9ecszcWtOJ', 'qt_orIXrhymgMEM', 'pr_dH-RNYh73_EJ', 'Copywriting', 1, 95000, 8.5, 1);

-- --------------------------------------------------------------------
-- invoices — Demo invoices across every status: draft, sent, partial, paid, overdue.
-- --------------------------------------------------------------------
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_0hPzrVp8qBzp', 'b_tXUAYxGqpU7S', 'c_VEi7DvrySvqs', NULL, 'INV-1001', 'paid', '2026-07-17', '2026-07-31', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 420000, 0, 35700, 455700, 455700, '', NULL, '2026-07-17T09:00:00.000Z', '2026-07-25T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_UvPPcSwCWTqf', 'b_tXUAYxGqpU7S', 'c_JCw_rHXQ30KW', NULL, 'INV-1002', 'paid', '2026-08-08', '2026-08-22', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 500000, 0, 42500, 542500, 542500, '', NULL, '2026-08-08T09:00:00.000Z', '2026-08-16T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_JtLU-Hoa6Y9L', 'b_tXUAYxGqpU7S', 'c_4OnX50xcNBnw', NULL, 'INV-1003', 'paid', '2026-08-20', '2026-09-03', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 70525, '', NULL, '2026-08-20T09:00:00.000Z', '2026-08-28T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_ZbwzYuIYwtJh', 'b_tXUAYxGqpU7S', 'c_d2vzRQWLzeQK', NULL, 'INV-1004', 'paid', '2026-09-03', '2026-09-17', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 335000, 0, 28475, 363475, 363475, '', NULL, '2026-09-03T09:00:00.000Z', '2026-09-11T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_N0z8fmXqmtBJ', 'b_tXUAYxGqpU7S', 'c_4ChBbnxETmld', NULL, 'INV-1005', 'paid', '2026-09-18', '2026-10-02', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 300000, 0, 25500, 325500, 325500, '', NULL, '2026-09-18T09:00:00.000Z', '2026-09-26T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_JK48jSPNIWWR', 'b_tXUAYxGqpU7S', 'c_466gJKJJxN1N', NULL, 'INV-1006', 'paid', '2026-09-26', '2026-10-10', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 70525, '', NULL, '2026-09-26T09:00:00.000Z', '2026-10-04T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_nIBhVTA2gW4a', 'b_tXUAYxGqpU7S', 'c_VEi7DvrySvqs', NULL, 'INV-1007', 'paid', '2026-10-03', '2026-10-17', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 320000, 0, 27200, 347200, 347200, '', NULL, '2026-10-03T09:00:00.000Z', '2026-10-11T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_wuZImLCFLiTI', 'b_tXUAYxGqpU7S', 'c_4OnX50xcNBnw', NULL, 'INV-1008', 'partial', '2026-09-29', '2026-10-13', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 360000, 0, 30600, 390600, 156240, '', NULL, '2026-09-29T09:00:00.000Z', '2026-10-03T15:10:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_ERF9MGG3QNfY', 'b_tXUAYxGqpU7S', 'c_JCw_rHXQ30KW', NULL, 'INV-1009', 'sent', '2026-10-12', '2026-10-26', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 0, '', NULL, '2026-10-12T09:00:00.000Z', NULL, '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_CnupIc8Ca0bs', 'b_tXUAYxGqpU7S', 'c_sj5HZBV0kTy6', NULL, 'INV-1010', 'sent', '2026-10-16', '2026-10-30', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 420000, 0, 35700, 455700, 0, '', NULL, '2026-10-16T09:00:00.000Z', NULL, '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_2wlGlJg0KtPQ', 'b_tXUAYxGqpU7S', 'c_466gJKJJxN1N', NULL, 'INV-1011', 'sent', '2026-10-18', '2026-11-01', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 0, 'monthly', '2026-11-01', '2026-10-18T09:00:00.000Z', NULL, '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_A50DWRjs_w6V', 'b_tXUAYxGqpU7S', 'c_d2vzRQWLzeQK', NULL, 'INV-1012', 'overdue', '2026-09-04', '2026-09-18', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 95000, 0, 8075, 103075, 0, '', NULL, '2026-09-04T09:00:00.000Z', NULL, '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_O6G4_OdD-oeR', 'b_tXUAYxGqpU7S', 'c_4ChBbnxETmld', NULL, 'INV-1013', 'overdue', '2026-09-21', '2026-10-05', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 180000, 0, 15300, 195300, 0, '', NULL, '2026-09-21T09:00:00.000Z', NULL, '2026-10-21T17:52:55.113Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_8UMA8sob7010', 'b_tXUAYxGqpU7S', 'c_4OnX50xcNBnw', NULL, 'INV-1014', 'draft', '2026-10-19', '2026-11-02', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 120000, 0, 10200, 130200, 0, '', NULL, NULL, NULL, '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- invoice_items — Line items belonging to the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_L5QOXpx9dRcn', 'iv_0hPzrVp8qBzp', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint — Ava Bennett Studio', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_VU0RLXbpBNqj', 'iv_0hPzrVp8qBzp', 'pr_pHecpdF76oie', 'Website Design — Ava Bennett Studio', 1, 180000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_iahgO6xgldlT', 'iv_UvPPcSwCWTqf', 'pr_pHecpdF76oie', 'Website Design — Kite & Co. Retail', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_z0dv-owhjCNU', 'iv_UvPPcSwCWTqf', 'pr_qjVNfSmj4DzT', 'Frontend Build — Kite & Co. Retail', 1, 320000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_xcfcvpPH5NES', 'iv_JtLU-Hoa6Y9L', 'pr_0XE4y7X80wu3', 'Monthly Retainer — Lumen Health', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii__cG3SMwfDNrB', 'iv_ZbwzYuIYwtJh', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint — Ortega Legal', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_Yv9DU-JQ1v7C', 'iv_ZbwzYuIYwtJh', 'pr_dH-RNYh73_EJ', 'Copywriting — Ortega Legal', 1, 95000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_uDImEURRfKX3', 'iv_N0z8fmXqmtBJ', 'pr_pHecpdF76oie', 'Website Design — Atelier Almeida', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_y8AkWOkAO4Ek', 'iv_N0z8fmXqmtBJ', 'pr_w2CsXMyoQlkb', 'Motion Graphics — Atelier Almeida', 1, 120000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_rT0aB9W32gte', 'iv_JK48jSPNIWWR', 'pr_0XE4y7X80wu3', 'Monthly Retainer — Weiss Fitness Studio', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_d0xzq5wd7hOt', 'iv_nIBhVTA2gW4a', 'pr_qjVNfSmj4DzT', 'Frontend Build — Ava Bennett Studio', 1, 320000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_tHF4qf_QPWZu', 'iv_wuZImLCFLiTI', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint — Lumen Health', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_mVTA9FjYu465', 'iv_wuZImLCFLiTI', 'pr_w2CsXMyoQlkb', 'Motion Graphics — Lumen Health', 1, 120000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_0_BDxVsrPTSi', 'iv_ERF9MGG3QNfY', 'pr_0XE4y7X80wu3', 'Monthly Retainer — Kite & Co. Retail', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_CDSvsnsLTjyg', 'iv_CnupIc8Ca0bs', 'pr_LDYIS6IHtwVk', 'Brand Identity Sprint — Okoye Logistics', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_UPl4I03HGBJt', 'iv_CnupIc8Ca0bs', 'pr_pHecpdF76oie', 'Website Design — Okoye Logistics', 1, 180000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_nfl1YVga6ekb', 'iv_2wlGlJg0KtPQ', 'pr_0XE4y7X80wu3', 'Monthly Retainer — Weiss Fitness Studio', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_3X1by-kY3Y0X', 'iv_A50DWRjs_w6V', 'pr_dH-RNYh73_EJ', 'Copywriting — Ortega Legal', 1, 95000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_e0Fm58uUnLr3', 'iv_O6G4_OdD-oeR', 'pr_pHecpdF76oie', 'Website Design — Atelier Almeida', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_H56MaLmKjYwu', 'iv_8UMA8sob7010', 'pr_w2CsXMyoQlkb', 'Motion Graphics — Lumen Health', 1, 120000, 8.5, 0);

-- --------------------------------------------------------------------
-- payments — Payments recorded against the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_zRMSM6wih85p', 'iv_0hPzrVp8qBzp', 'b_tXUAYxGqpU7S', 455700, 'card', 'REF-481249', '', '2026-07-25T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_ceTVJPZsjWCJ', 'iv_UvPPcSwCWTqf', 'b_tXUAYxGqpU7S', 542500, 'card', 'REF-754488', '', '2026-08-16T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_VxS0H2_WcIUG', 'iv_JtLU-Hoa6Y9L', 'b_tXUAYxGqpU7S', 70525, 'card', 'REF-941699', '', '2026-08-28T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_GODliqrEdYYD', 'iv_ZbwzYuIYwtJh', 'b_tXUAYxGqpU7S', 363475, 'card', 'REF-589978', '', '2026-09-11T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_joUdbZJgdNiN', 'iv_N0z8fmXqmtBJ', 'b_tXUAYxGqpU7S', 325500, 'card', 'REF-481684', '', '2026-09-26T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_Hcovw2jJG6Y9', 'iv_JK48jSPNIWWR', 'b_tXUAYxGqpU7S', 70525, 'card', 'REF-681017', '', '2026-10-04T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_QG-ykVm6Zwll', 'iv_nIBhVTA2gW4a', 'b_tXUAYxGqpU7S', 347200, 'card', 'REF-566698', '', '2026-10-11T10:24:00.000Z', '2026-10-21T17:52:55.113Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_gI73aft0LjFP', 'iv_wuZImLCFLiTI', 'b_tXUAYxGqpU7S', 156240, 'bank', 'REF-892244', '', '2026-10-03T15:10:00.000Z', '2026-10-21T17:52:55.113Z');

-- --------------------------------------------------------------------
-- expenses — Categorised expenses feeding the net-profit figures.
-- --------------------------------------------------------------------
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_9htWcC4cRmxZ', 'b_tXUAYxGqpU7S', 'software', 'Figma', 4500, '2026-10-15', '', '2026-10-21T17:52:55.113Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_LdubKjdun0QW', 'b_tXUAYxGqpU7S', 'contractors', 'Riley — 3D artist', 180000, '2026-10-09', '', '2026-10-21T17:52:55.113Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_ebqG10Dky_pS', 'b_tXUAYxGqpU7S', 'marketing', 'Meta Ads', 32000, '2026-10-17', '', '2026-10-21T17:52:55.113Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_G7Zg2OjpxZE-', 'b_tXUAYxGqpU7S', 'software', 'Adobe CC', 5299, '2026-10-19', '', '2026-10-21T17:52:55.113Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_vJV63Qw2p2LL', 'b_tXUAYxGqpU7S', 'office', 'Coworking studio', 24000, '2026-10-20', '', '2026-10-21T17:52:55.113Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_zvni-FoVHdBz', 'b_tXUAYxGqpU7S', 'travel', 'Client workshop travel', 68000, '2026-10-03', '', '2026-10-21T17:52:55.113Z');

COMMIT;

PRAGMA foreign_keys = ON;
