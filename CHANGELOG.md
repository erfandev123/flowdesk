# Changelog

All notable changes to Flowdesk are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-10-21

First public release.

### Added — Core

- **Dashboard** — collected / outstanding / overdue / net-profit KPIs, monthly
  revenue trend chart, expense breakdown, aging list sorted oldest-first, top
  clients by lifetime value, quote pipeline, recent invoices.
- **Client book** — contacts, company, notes, status (active / lead /
  archived), lifetime value, outstanding balance, invoice count, search across
  name, company and email.
- **Quotes** — create, send, accept, decline, expire. One-click conversion of an
  accepted quote into a numbered invoice with line items, tax and total copied
  across.
- **Invoices** — line items with per-line tax, discount, issue and due dates,
  notes and terms, sequential per-workspace numbering with a configurable
  prefix, statuses `draft` / `sent` / `partial` / `paid` / `overdue` /
  `cancelled`, automatic overdue detection, print-ready document layout.
- **Payments** — partial and full payments with method, reference and note;
  one-click reversal that recalculates balance and status.
- **Recurring billing** — weekly, monthly, quarterly and yearly schedules with
  one-click generation of the next invoice.
- **Payment reminders** — auto-generated email, SMS and WhatsApp messages built
  from a configurable template with `{{client}}`, `{{number}}`, `{{amount}}`,
  `{{due}}`, `{{link}}` and `{{business}}` placeholders. Every sent reminder is
  logged against the invoice.
- **Client portal** — public token-based URL where a client reviews their
  invoices and records a payment without creating an account or signing in.
- **Expenses** — categorised tracking feeding net profit and cashflow.
- **Catalog** — reusable services and products that auto-fill invoice lines.
- **Reports** — cashflow by month, revenue-versus-expenses donut, net margin,
  average days-to-pay, and invoice velocity for the last 180 days.
- **CSV export** — invoices, clients, expenses and payments.
- **Marketing landing page** — a complete, responsive sales page at `/`.

### Added — Platform

- Multi-tenant workspaces with strict `business_id` scoping on every query.
- Role-based access control: `owner`, `admin`, `member`, `viewer`.
  Every mutating endpoint requires a signed-in user with the correct role.
- `scrypt` password hashing with per-user random salts.
- HTTP-only, SameSite=Lax session cookies with server-side revocation.
- Workspace switching from the sidebar.
- Team management: invite members, assign roles, remove members. Owner
  accounts are protected from demotion and removal.
- Per-workspace branding: logo initials, primary and accent colours, currency,
  locale, invoice and quote prefixes, default tax rate, default payment terms
  and the reminder template.
- Locales: English (US / UK / India), বাংলা, العربية, Deutsch, Español.
- Responsive layout across mobile, tablet and desktop, with a drawer plus
  bottom navigation on small screens.
- Dedicated print stylesheet that removes all application chrome.
- `GET /api/health` endpoint for monitoring and container health checks.
- Docker image and `docker-compose.yml` with a persistent data volume.
- PM2 ecosystem configuration.
- One-command deployment script (`scripts/deploy.js`).
- Database export tooling that regenerates `database/schema.sql` and
  `database/seed.sql` from the live database.

### Technical

- **Frontend** — React 19, TypeScript in strict mode, Vite 6, Tailwind CSS 4,
  React Router 7, Phosphor Icons.
- **Backend** — Node 22.5+ (24 LTS recommended), Express 4.
- **Database** — SQLite through Node's built-in `node:sqlite` module. Zero
  native dependencies, nothing to compile, no database server to install.
- **Charts** — hand-rolled SVG. No chart library.
- **Accessibility** — Lighthouse 100/100 for accessibility and best practices.
  Visible focus states, `prefers-reduced-motion` support, accessible names on
  every interactive element, 44×44px minimum touch targets.
- **Bundle** — approximately 95 KB gzip for the main chunk after vendor
  splitting.
- **Codebase** — roughly 6,400 lines across 35 source files.

### Security

- Passwords hashed with `scrypt`; no plaintext credentials anywhere.
- Session cookies are HTTP-only and SameSite=Lax.
- Workspace access is verified on every request; a user who is not a member
  receives `404`, not `403`, to avoid leaking workspace existence.
- The `viewer` role cannot mutate any data — every write path is guarded.
- Only owners and admins can manage the team or change workspace settings.
- The demo account in the seed data contains no real customer information.

### Known limitations

- Client portal payments are **recorded**, not charged through a payment
  gateway. Integration points for Stripe, bKash, Nagad, PayPal and Razorpay
  are documented in `HowToSetup.md`.
- Payment reminders are **generated and copied**, not sent automatically. An
  SMTP integration point is documented in `HowToSetup.md`.
- Invoices print to PDF through the browser rather than a server-side renderer.
- Single-tenant storage is SQLite in one file, suited to individual
  workspaces and small-to-medium deployments.
