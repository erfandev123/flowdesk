# CLAUDE.md

Guidance for AI coding agents working in this repository.

---

## What this project is

Flowdesk is a multi-tenant web application for managing clients, quotes,
invoices, payments and cashflow. It is a Node monorepo with an Express API and
a React SPA, backed by SQLite.

It ships as a **sellable product**: it is self-hosted, white-labelable, and
includes a public marketing landing page.

---

## Commands

Run from the `Node Project/` directory.

```bash
npm run install:all     # install server + web dependencies
npm run seed            # create the demo workspace (skips if a DB exists)
npm run dev:server      # API on :4318 with --watch
npm run dev:web         # Vite dev server on :5183, proxies /api
npm run build           # production build of the web app
npm start               # serve API + built SPA on :4318
node scripts/deploy.js  # one-command install + build + seed
node scripts/export-sql.js  # regenerate database/schema.sql and seed.sql
```

---

## Architecture

```
Node Project/
├── server/src/
│   ├── config.js         PORT, cookie name, role level, demo account
│   ├── db.js             schema, indexes, query helpers, password hashing
│   ├── seed-data.js      seedDemoWorkspace() — the demo workspace
│   ├── seed.js           CLI wrapper for the seed
│   ├── server.js         app setup, route mounting, static host, boot
│   ├── middleware/
│   │   ├── auth.js       requireAuth, requireBusiness, requireRole
│   │   └── errors.js     HttpError, fail
│   ├── routes/           one module per area
│   │   ├── auth.js       register, login, logout, me, switch
│   │   ├── business.js   settings, clients, products
│   │   ├── billing.js    quotes, invoices, payments, reminders, recurring
│   │   ├── team.js       members, roles
│   │   ├── expenses.js
│   │   ├── reports.js    dashboard, cashflow, velocity
│   │   ├── exports.js    CSV
│   │   └── portal.js     the public client portal
│   ├── services/
│   │   ├── money.js      invoiceTotals, quoteTotals, refreshInvoiceStatus
│   │   └── reminders.js  buildReminder
│   └── utils/
│       ├── password.js   hashPassword, verifyPassword, generateTempPassword
│       └── validation.js str, num, bool, oneOf, validateEmail, …
└── web/src/
    ├── main.tsx            Routes, providers, guards
    ├── styles.css          Design tokens (@theme) + component classes
    ├── types.ts            Shared API types
    ├── context/AuthContext.tsx  User, business, session, workspace switching
    ├── lib/api.ts          fetch wrapper + API_ENDPOINTS constants
    ├── lib/format.ts       Currency, date, relative-time formatting
    ├── components/         AppShell, Charts, Modal, StatusChip, Feedback
    └── pages/              One file per screen
```

### Request flow

1. `requireAuth` verifies the `fd_session` HTTP-only cookie and resolves the user.
2. `requireBusiness` resolves the workspace from the `x-business-id` header (or
   the session default) **and verifies the user holds a membership in it**.
   Every query is then scoped by `business_id`.
3. `requireRole('member' | 'admin' | 'owner')` enforces the role hierarchy on
   mutating routes.

### Data model

SQLite via Node's built-in `node:sqlite` — no native dependencies, no ORM.
Tables: `users`, `businesses`, `memberships`, `clients`, `products`, `quotes`,
`quote_items`, `invoices`, `invoice_items`, `payments`, `expenses`,
`reminders`, `sessions`.

Money is stored as **integer cents**. Never use floats for money.

### Boot behaviour

`server.js` calls `seedOnBoot()` **before** `app.listen()`. When the database
has no users, the demo workspace is created so the instance is usable
immediately. This is what makes the app work on hosts with an ephemeral
filesystem. Set `SEED_ON_BOOT=false` to disable it.

---

## Conventions that matter

### Money

- Store and compute in integer cents.
- Format only at the presentation layer, via `formatMoney()` in
  `web/src/lib/format.ts`, which respects the workspace currency and locale.

### Dates

- Store `YYYY-MM-DD` for dates (issue date, due date) and ISO-8601 UTC
  timestamps for instants (`created_at`, `paid_at`).
- Use the `today()` and `addDays()` helpers rather than ad-hoc date maths.

### Database access

- Use the prepared-statement helpers in `server/src/server.js`:
  `q(sql, ...)` for many rows, `one(sql, ...)` for one, `run(sql, ...)` for
  writes. **Always pass parameters — never interpolate user input into SQL.**

### Auth and roles

- Passwords are hashed with `scrypt` (`hashPassword` / `verifyPassword` in
  `utils/password.js`). Never store or log plaintext passwords.
- **Every mutating route must carry a role guard.** The hierarchy is
  `owner > admin > member > viewer`; `viewer` is read-only.
  - Business data (clients, quotes, invoices, payments, expenses, products):
    `requireWrite` (`member`)
  - Workspace settings and team management: `requireAdmin`
  - Reversing a recorded payment: `requireAdmin` — it changes what a client is
    recorded as having paid
- New endpoints must not be added without a guard.
- Every lookup by primary key must include `AND business_id = ?`.

### API conventions

- All business endpoints require the `x-business-id` header.
- All responses are JSON. Errors are `{ "error": "message" }`.
- Validation errors return `400`, missing auth `401`, forbidden `403`,
  missing resource `404`.
- Public endpoints are limited to: `/api/health`, `/api/auth/*`,
  `/api/portal/:token` and `/api/portal/:token/pay/:invoiceId`. The portal
  endpoints are scoped by an unguessable token and intentionally allow a
  client to record their own payment.

### Frontend

- **TypeScript strict mode.** No `any`. No unused locals or parameters.
- Icons: **Phosphor** (`@phosphor-icons/react`) only. Never use emoji as icons.
- Charts: hand-rolled SVG in `components/Charts.tsx`. Do not add a chart library.
- Styling: Tailwind utilities plus the semantic component classes defined in
  `styles.css` (`.card`, `.btn`, `.btn-primary`, `.field`, `.label`, `.chip`,
  `.data-table`). Use the tokens — do not hard-code hex values in components.
- Accessibility: every interactive element needs an accessible name, visible
  focus, and a minimum 44×44px touch target. Respect `prefers-reduced-motion`.
- Responsive: desktop sidebar collapses to a drawer plus a bottom nav under
  `lg`. Tables become cards on small screens.

### Design tokens

```
primary   #1E3A5F   brand-600      money, structure, trust
accent    #059669   accent-500     paid, success, positive
danger    #DC2626   danger-500     overdue, destructive
warn      #D97706   warn-500       partial, caution
canvas    #F8FAFC   canvas        page background
ink       #0F172A   ink           primary text
```

---

## Adding a feature

1. **Schema** — add the table/column to `server/src/db.js` using
   `CREATE TABLE IF NOT EXISTS`. For an existing deployment also add an
   `ALTER TABLE` guarded by a check for the column's existence.
2. **Regenerate SQL** — run `node scripts/export-sql.js` so `database/schema.sql`
   and `database/seed.sql` stay in sync with the live database.
3. **API** — add the route in `server/src/server.js` with the correct guard.
   Mutating routes need `requireWrite` or `requireAdmin`.
4. **Types** — update `web/src/types.ts`.
5. **UI** — add a page under `web/src/pages/`, register the route in
   `main.tsx`, and add it to the sidebar in `components/AppShell.tsx`.
6. **Docs** — update `docs/API.md`, `docs/ERD.md` and `docs/FEATURES.md`.

---

## Testing

There is no automated test suite yet. Verify changes manually:

```bash
npm run seed
npm run build
npm start
```

Then exercise the endpoint and check the UI. `scripts/verify-fresh.js`
simulates a clean-machine install (copy → install → build → seed → start) and
is the fastest way to confirm the project still builds from scratch.

---

## Do not

- Do not add a chart library, UI kit, ORM, or ORM-like abstraction.
- Do not use floats for money.
- Do not add a mutating endpoint without a role guard.
- Do not commit real credentials, `.env` files, or a populated database.
- Do not use emoji as icons.
- Do not hard-code colours instead of using the tokens in `styles.css`.
- Do not remove the demo seed data path — reviewers rely on it to explore.
