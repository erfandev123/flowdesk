-- =====================================================================
-- Flowdesk — demo seed data
-- Target: SQLite 3
--
-- Run AFTER database/schema.sql:
--   sqlite3 flowdesk.db < database/schema.sql
--   sqlite3 flowdesk.db < database/seed.sql
--
-- Creates one demo workspace you can sign into immediately:
--
--   Email:    demo@flowdesk.app
--   Password: demo1234
--
-- The demo account is intentionally included so a reviewer can explore the
-- application without creating anything. It holds no real customer data.
-- Change or delete this account before using Flowdesk in production.
-- =====================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- --------------------------------------------------------------------
-- users — Demo owner account. Password for demo@flowdesk.app is "demo1234"
-- (stored as a scrypt hash with a per-user random salt).
-- --------------------------------------------------------------------
INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u_P_nThkLZval4', 'demo@flowdesk.app', 'Demo Owner', '791d8c36ad539ac4b8eb5ddcc6781fb3:3332d9aaebb48e6845078ee26103c44d3127a583e0f3dabaad375d74c33cc27013007a4a11eaf6a5c40afce3298e72c9d2ec6bc7c70919b44d7e67e83e6bafdb', '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- businesses — One demo workspace: Northlight Studio.
-- --------------------------------------------------------------------
INSERT INTO businesses (id, name, currency, locale, timezone, brand_color, accent_color, logo_text, invoice_prefix, quote_prefix, next_invoice_seq, next_quote_seq, default_tax, default_terms, reminder_template, created_at) VALUES ('b_Z_3OZktb3amD', 'Northlight Studio', 'USD', 'en-US', 'UTC', '#1E3A5F', '#059669', 'NS', 'INV', 'QUO', 1005, 1002, 8.5, 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 'Hi {{client}},

A friendly reminder that invoice {{number}} for {{amount}} is due on {{due}}. You can view and pay it here: {{link}}

Thank you,
{{business}}', '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- memberships — Links the owner to the workspace.
-- --------------------------------------------------------------------
INSERT INTO memberships (user_id, business_id, role, created_at) VALUES ('u_P_nThkLZval4', 'b_Z_3OZktb3amD', 'owner', '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- clients — Seven demo clients with realistic contact details.
-- --------------------------------------------------------------------
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_OBinierFHYDP', 'b_Z_3OZktb3amD', 'Ava Bennett', 'Ava Bennett Studio', 'ava@studio.co', '+1 415 555 0142', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_7fTyR3t4Pqnk', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_JzD8keQXokaH', 'b_Z_3OZktb3amD', 'Marcus Lee', 'Kite & Co. Retail', 'marcus@kiteco.com', '+1 212 555 0198', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_y7wBzuIMzLyG', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_04PVSv2rf1Et', 'b_Z_3OZktb3amD', 'Priya Raman', 'Lumen Health', 'priya@lumenhealth.io', '+1 617 555 0117', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_aDuCeB4UaoWG', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_zUsceLxmrVi7', 'b_Z_3OZktb3amD', 'Tomás Ortega', 'Ortega Legal', 'tomas@ortegalaw.com', '+1 305 555 0173', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_QeFxArfbnMFw', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_Gev_96-w_luJ', 'b_Z_3OZktb3amD', 'Sofia Almeida', 'Atelier Almeida', 'sofia@atelieralmeida.com', '+1 213 555 0164', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_-R67ESEBZ0LZ', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_wv1Zj0HE8ujj', 'b_Z_3OZktb3amD', 'Daniel Okoye', 'Okoye Logistics', 'daniel@okoyelogistics.com', '+1 404 555 0155', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'lead', 'p_95cUqWh9LMUJ', '2026-10-21T10:06:07.389Z');
INSERT INTO clients (id, business_id, name, company, email, phone, address, notes, status, portal_token, created_at) VALUES ('c_AA5yQczHtYRl', 'b_Z_3OZktb3amD', 'Hannah Weiss', 'Weiss Fitness Studio', 'hannah@weissfit.com', '+1 206 555 0186', '1200 Market Street, Suite 400', 'Prefers email invoices. Net-14 terms agreed.', 'active', 'p_CBR8Ibm_FHo_', '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- products — Service catalog used by the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_LFMxight3M61', 'b_Z_3OZktb3amD', 'Brand Identity Sprint', 'Logo system, palette, type scale and brand guide', 240000, 'project', 8.5, 1, '2026-10-21T10:06:07.389Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_lq4Slf4rIa3w', 'b_Z_3OZktb3amD', 'Website Design', 'Responsive marketing site design, up to 8 pages', 180000, 'project', 8.5, 1, '2026-10-21T10:06:07.389Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_PnPrT4uHckaR', 'b_Z_3OZktb3amD', 'Frontend Build', 'Production React implementation with CMS hooks', 320000, 'project', 8.5, 1, '2026-10-21T10:06:07.389Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_BF2D_v9cQloO', 'b_Z_3OZktb3amD', 'Monthly Retainer', 'Ongoing design and development support', 65000, 'month', 8.5, 1, '2026-10-21T10:06:07.389Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_fuxIcbQerauU', 'b_Z_3OZktb3amD', 'Motion Graphics', 'Animated logo sting and social cutdowns', 120000, 'project', 8.5, 1, '2026-10-21T10:06:07.389Z');
INSERT INTO products (id, business_id, name, description, unit_price, unit, tax_rate, active, created_at) VALUES ('pr_wVOkFhuHn1pr', 'b_Z_3OZktb3amD', 'Copywriting', 'Web copy for landing and product pages', 95000, 'project', 8.5, 1, '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- quotes — Demo quotes in different pipeline states.
-- --------------------------------------------------------------------
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_6RoZUMNRlq9h', 'b_Z_3OZktb3amD', 'c_OBinierFHYDP', 'QUO-2001', 'sent', '2026-10-17', '2026-11-16', 'Scope includes two revision rounds per deliverable.', 740000, 62900, 802900, '2026-10-21T10:06:07.389Z');
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_ot75LfoKDOBP', 'b_Z_3OZktb3amD', 'c_wv1Zj0HE8ujj', 'QUO-2002', 'sent', '2026-10-11', '2026-11-10', 'Scope includes two revision rounds per deliverable.', 240000, 20400, 260400, '2026-10-21T10:06:07.389Z');
INSERT INTO quotes (id, business_id, client_id, number, status, issue_date, valid_until, notes, subtotal, tax_total, total, created_at) VALUES ('qt_rpYCkdWVOHtw', 'b_Z_3OZktb3amD', 'c_Gev_96-w_luJ', 'QUO-2003', 'accepted', '2026-10-05', '2026-11-04', 'Scope includes two revision rounds per deliverable.', 160000, 13600, 173600, '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- quote_items — Line items belonging to the demo quotes.
-- --------------------------------------------------------------------
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_h9sALtc84aRo', 'qt_6RoZUMNRlq9h', 'pr_LFMxight3M61', 'Brand Identity Sprint', 1, 240000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_OFRg4yFQ_dRJ', 'qt_6RoZUMNRlq9h', 'pr_lq4Slf4rIa3w', 'Website Design', 1, 180000, 8.5, 1);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_v2ug0NQ6Va8S', 'qt_6RoZUMNRlq9h', 'pr_PnPrT4uHckaR', 'Frontend Build', 1, 320000, 8.5, 2);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_xaa0r6wOtAaI', 'qt_ot75LfoKDOBP', 'pr_LFMxight3M61', 'Brand Identity Sprint', 1, 240000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_-v9O3k22sbKl', 'qt_rpYCkdWVOHtw', 'pr_BF2D_v9cQloO', 'Monthly Retainer', 1, 65000, 8.5, 0);
INSERT INTO quote_items (id, quote_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('qi_CJBPH3uSdkF6', 'qt_rpYCkdWVOHtw', 'pr_wVOkFhuHn1pr', 'Copywriting', 1, 95000, 8.5, 1);

-- --------------------------------------------------------------------
-- invoices — Demo invoices across every status: draft, sent, partial, paid, overdue.
-- --------------------------------------------------------------------
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_IWalKd3WkbpL', 'b_Z_3OZktb3amD', 'c_OBinierFHYDP', NULL, 'INV-1630', 'paid', '2026-07-17', '2026-07-31', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 420000, 0, 35700, 455700, 455700, '', NULL, '2026-07-17T09:00:00.000Z', '2026-07-25T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_Zl6eviFunzNs', 'b_Z_3OZktb3amD', 'c_JzD8keQXokaH', NULL, 'INV-1248', 'paid', '2026-08-08', '2026-08-22', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 500000, 0, 42500, 542500, 542500, '', NULL, '2026-08-08T09:00:00.000Z', '2026-08-16T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_96nO_vlRHsHF', 'b_Z_3OZktb3amD', 'c_04PVSv2rf1Et', NULL, 'INV-1610', 'paid', '2026-08-20', '2026-09-03', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 70525, '', NULL, '2026-08-20T09:00:00.000Z', '2026-08-28T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_4hsnDEdZndr9', 'b_Z_3OZktb3amD', 'c_zUsceLxmrVi7', NULL, 'INV-1511', 'paid', '2026-09-03', '2026-09-17', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 335000, 0, 28475, 363475, 363475, '', NULL, '2026-09-03T09:00:00.000Z', '2026-09-11T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_WKKBvocPYBXL', 'b_Z_3OZktb3amD', 'c_Gev_96-w_luJ', NULL, 'INV-1046', 'paid', '2026-09-18', '2026-10-02', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 300000, 0, 25500, 325500, 325500, '', NULL, '2026-09-18T09:00:00.000Z', '2026-09-26T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_64RYb6BaKE4F', 'b_Z_3OZktb3amD', 'c_AA5yQczHtYRl', NULL, 'INV-1482', 'paid', '2026-09-26', '2026-10-10', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 70525, '', NULL, '2026-09-26T09:00:00.000Z', '2026-10-04T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_D62d0CWgfrwK', 'b_Z_3OZktb3amD', 'c_OBinierFHYDP', NULL, 'INV-1614', 'paid', '2026-10-03', '2026-10-17', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 320000, 0, 27200, 347200, 347200, '', NULL, '2026-10-03T09:00:00.000Z', '2026-10-11T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_-7kpJilzHPzv', 'b_Z_3OZktb3amD', 'c_04PVSv2rf1Et', NULL, 'INV-1442', 'partial', '2026-09-29', '2026-10-13', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 360000, 0, 30600, 390600, 156240, '', NULL, '2026-09-29T09:00:00.000Z', '2026-10-03T15:10:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_6Ze8vxk0AOnG', 'b_Z_3OZktb3amD', 'c_JzD8keQXokaH', NULL, 'INV-1137', 'sent', '2026-10-12', '2026-10-26', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 0, '', NULL, '2026-10-12T09:00:00.000Z', NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_NbJuWyui8YUu', 'b_Z_3OZktb3amD', 'c_wv1Zj0HE8ujj', NULL, 'INV-1666', 'sent', '2026-10-16', '2026-10-30', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 420000, 0, 35700, 455700, 0, '', NULL, '2026-10-16T09:00:00.000Z', NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_fbsb8krTg_gn', 'b_Z_3OZktb3amD', 'c_AA5yQczHtYRl', NULL, 'INV-1104', 'sent', '2026-10-18', '2026-11-01', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 0, 'monthly', '2026-11-20', '2026-10-18T09:00:00.000Z', NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_pr_EtoAlffb6', 'b_Z_3OZktb3amD', 'c_zUsceLxmrVi7', NULL, 'INV-1422', 'overdue', '2026-09-04', '2026-09-18', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 95000, 0, 8075, 103075, 0, '', NULL, '2026-09-04T09:00:00.000Z', NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_oounuAUT2Den', 'b_Z_3OZktb3amD', 'c_Gev_96-w_luJ', NULL, 'INV-1072', 'overdue', '2026-09-21', '2026-10-05', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 180000, 0, 15300, 195300, 0, '', NULL, '2026-09-21T09:00:00.000Z', NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_DE5U_n4rToFr', 'b_Z_3OZktb3amD', 'c_04PVSv2rf1Et', NULL, 'INV-1241', 'draft', '2026-10-19', '2026-11-02', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 120000, 0, 10200, 130200, 0, '', NULL, NULL, NULL, '2026-10-21T10:06:07.389Z');
INSERT INTO invoices (id, business_id, client_id, quote_id, number, status, issue_date, due_date, notes, terms, subtotal, discount, tax_total, total, paid_amount, recurring_rule, next_invoice_date, sent_at, paid_at, created_at) VALUES ('iv_C1ZF6xpBsg90', 'b_Z_3OZktb3amD', 'c_AA5yQczHtYRl', NULL, 'INV-1004', 'draft', '2026-10-21', '2026-11-04', 'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.', 65000, 0, 5525, 70525, 0, '', NULL, NULL, NULL, '2026-10-21T10:24:42.908Z');

-- --------------------------------------------------------------------
-- invoice_items — Line items belonging to the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_ytj0NrMj1BfM', 'iv_IWalKd3WkbpL', 'pr_LFMxight3M61', 'Brand Identity Sprint — Ava Bennett Studio', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_WNc5tHqeIFus', 'iv_IWalKd3WkbpL', 'pr_lq4Slf4rIa3w', 'Website Design — Ava Bennett Studio', 1, 180000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_5oBM1vdZsSe1', 'iv_Zl6eviFunzNs', 'pr_lq4Slf4rIa3w', 'Website Design — Kite & Co. Retail', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_DQY1YWTXas5M', 'iv_Zl6eviFunzNs', 'pr_PnPrT4uHckaR', 'Frontend Build — Kite & Co. Retail', 1, 320000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_WOwraf8VojW7', 'iv_96nO_vlRHsHF', 'pr_BF2D_v9cQloO', 'Monthly Retainer — Lumen Health', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_voGdruvqpZM-', 'iv_4hsnDEdZndr9', 'pr_LFMxight3M61', 'Brand Identity Sprint — Ortega Legal', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_3Wrn6nvBoLNx', 'iv_4hsnDEdZndr9', 'pr_wVOkFhuHn1pr', 'Copywriting — Ortega Legal', 1, 95000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_o-BnMwVxOfpu', 'iv_WKKBvocPYBXL', 'pr_lq4Slf4rIa3w', 'Website Design — Atelier Almeida', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_7Q07BV09MXAv', 'iv_WKKBvocPYBXL', 'pr_fuxIcbQerauU', 'Motion Graphics — Atelier Almeida', 1, 120000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_zbCDCUfhxV8Q', 'iv_64RYb6BaKE4F', 'pr_BF2D_v9cQloO', 'Monthly Retainer — Weiss Fitness Studio', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_qKo06N8jRUB5', 'iv_D62d0CWgfrwK', 'pr_PnPrT4uHckaR', 'Frontend Build — Ava Bennett Studio', 1, 320000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_9RCzvU4fG_rc', 'iv_-7kpJilzHPzv', 'pr_LFMxight3M61', 'Brand Identity Sprint — Lumen Health', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_ka_W1XO6Xlbd', 'iv_-7kpJilzHPzv', 'pr_fuxIcbQerauU', 'Motion Graphics — Lumen Health', 1, 120000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_R2mDd-napreI', 'iv_6Ze8vxk0AOnG', 'pr_BF2D_v9cQloO', 'Monthly Retainer — Kite & Co. Retail', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_daiG5ew69tva', 'iv_NbJuWyui8YUu', 'pr_LFMxight3M61', 'Brand Identity Sprint — Okoye Logistics', 1, 240000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_3j29YeCynZLe', 'iv_NbJuWyui8YUu', 'pr_lq4Slf4rIa3w', 'Website Design — Okoye Logistics', 1, 180000, 8.5, 1);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_BrZcGED07n5j', 'iv_fbsb8krTg_gn', 'pr_BF2D_v9cQloO', 'Monthly Retainer — Weiss Fitness Studio', 1, 65000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_EcoMkUIMxMVi', 'iv_pr_EtoAlffb6', 'pr_wVOkFhuHn1pr', 'Copywriting — Ortega Legal', 1, 95000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_rgKwRFL-GDsE', 'iv_oounuAUT2Den', 'pr_lq4Slf4rIa3w', 'Website Design — Atelier Almeida', 1, 180000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_x8NMyB38_4gC', 'iv_DE5U_n4rToFr', 'pr_fuxIcbQerauU', 'Motion Graphics — Lumen Health', 1, 120000, 8.5, 0);
INSERT INTO invoice_items (id, invoice_id, product_id, description, qty, unit_price, tax_rate, position) VALUES ('ii_ef4XGwbT0gWG', 'iv_C1ZF6xpBsg90', 'pr_BF2D_v9cQloO', 'Monthly Retainer — Weiss Fitness Studio', 1, 65000, 8.5, 0);

-- --------------------------------------------------------------------
-- payments — Payments recorded against the demo invoices.
-- --------------------------------------------------------------------
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_k6Amm30zJPgm', 'iv_IWalKd3WkbpL', 'b_Z_3OZktb3amD', 455700, 'card', 'REF-821412', '', '2026-07-25T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_LahFHGK0TDOV', 'iv_Zl6eviFunzNs', 'b_Z_3OZktb3amD', 542500, 'card', 'REF-493018', '', '2026-08-16T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_HiboW-LrpE5N', 'iv_96nO_vlRHsHF', 'b_Z_3OZktb3amD', 70525, 'card', 'REF-325841', '', '2026-08-28T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_2sjxw4uiO9sV', 'iv_4hsnDEdZndr9', 'b_Z_3OZktb3amD', 363475, 'card', 'REF-414355', '', '2026-09-11T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_8J-tVY3Bx_yT', 'iv_WKKBvocPYBXL', 'b_Z_3OZktb3amD', 325500, 'card', 'REF-557537', '', '2026-09-26T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_E3WD2HMpGq62', 'iv_64RYb6BaKE4F', 'b_Z_3OZktb3amD', 70525, 'card', 'REF-580282', '', '2026-10-04T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_5BTKuGOt4mFH', 'iv_D62d0CWgfrwK', 'b_Z_3OZktb3amD', 347200, 'card', 'REF-292455', '', '2026-10-11T10:24:00.000Z', '2026-10-21T10:06:07.389Z');
INSERT INTO payments (id, invoice_id, business_id, amount, method, reference, note, paid_at, created_at) VALUES ('pay_yTWBpjPzUSBC', 'iv_-7kpJilzHPzv', 'b_Z_3OZktb3amD', 156240, 'bank', 'REF-129381', '', '2026-10-03T15:10:00.000Z', '2026-10-21T10:06:07.389Z');

-- --------------------------------------------------------------------
-- expenses — Categorised expenses feeding the net-profit figures.
-- --------------------------------------------------------------------
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_JNbCwWWVG2i5', 'b_Z_3OZktb3amD', 'software', 'Figma', 4500, '2026-10-15', '', '2026-10-21T10:06:07.389Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_oANebE2RLkto', 'b_Z_3OZktb3amD', 'contractors', 'Riley — 3D artist', 180000, '2026-10-09', '', '2026-10-21T10:06:07.389Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_TEs20SE1u0pf', 'b_Z_3OZktb3amD', 'marketing', 'Meta Ads', 32000, '2026-10-17', '', '2026-10-21T10:06:07.389Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_ES79nD_NUUQj', 'b_Z_3OZktb3amD', 'software', 'Adobe CC', 5299, '2026-10-19', '', '2026-10-21T10:06:07.389Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_I33yf_RhtOfM', 'b_Z_3OZktb3amD', 'office', 'Coworking studio', 24000, '2026-10-20', '', '2026-10-21T10:06:07.389Z');
INSERT INTO expenses (id, business_id, category, vendor, amount, expense_date, note, created_at) VALUES ('ex_NnjjrgctjJj6', 'b_Z_3OZktb3amD', 'travel', 'Client workshop travel', 68000, '2026-10-03', '', '2026-10-21T10:06:07.389Z');

COMMIT;

PRAGMA foreign_keys = ON;
