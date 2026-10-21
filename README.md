# Flowdesk — Client & Cashflow Workspace

A production-ready, multi-tenant web application for freelancers, agencies and
small service businesses to manage **clients, quotes, invoices, payments and
cashflow** — including a private client portal where clients pay from their
phone without creating an account.

Self-hosted. White-label ready. Zero native dependencies.

---

## Quick start

```bash
cd "Node Project"
npm run install:all
npm run seed
npm run serve
```

`npm run serve` builds the web app and then serves everything from one port.

Open <http://localhost:4318> and sign in:

```
demo@flowdesk.app
demo1234
```

Full step-by-step instructions, deployment options and troubleshooting are in
**[HowToSetup.md](HowToSetup.md)**.

> **Live demo:** the deployed instance is reachable at `<your-demo-url>` with the
> credentials above. See [docs/DEPLOY_FOR_DEMO.md](docs/DEPLOY_FOR_DEMO.md) to
> publish your own instance in about 15 minutes on a free tier.

### Requirements

**Node.js 22.5 or newer** (24 LTS recommended) — Flowdesk stores its data in
SQLite through Node's built-in `node:sqlite` module. No database server to
install, nothing to compile.

---

## What it does

| Area | Highlights |
|---|---|
| **Dashboard** | Collected / outstanding / overdue / net profit, revenue trend chart, aging list sorted oldest-first, top clients, quote pipeline, expense split |
| **Clients** | CRM with lifetime value, outstanding balance, invoice count, notes, and a private portal link per client |
| **Quotes** | Create, send, accept, decline — convert an accepted quote into a numbered invoice in one click |
| **Invoices** | Line items with per-line tax, discount, currency, sequential numbering with a configurable prefix, print-ready document |
| **Payments** | Partial or full payments with method, reference and note; one-click reversal (admin only) with automatic recalculation |
| **Recurring billing** | Weekly / monthly / quarterly / yearly schedules with one-click generation of the next invoice |
| **Reminders** | Auto-generated email, SMS and WhatsApp chase messages built from your own template |
| **Client portal** | A private token URL — clients review invoices and pay, no account and no password needed |
| **Expenses** | Categorised tracking feeding net profit and cashflow |
| **Catalog** | Reusable services and products that auto-fill invoice line items |
| **Reports** | Cashflow, revenue-versus-expenses, net margin, average days-to-pay, invoice velocity |
| **Team** | Invite people, assign roles (Owner / Admin / Member / Viewer), remove them |
| **Branding** | Logo initials, primary and accent colours, currency, locale (English / বাংলা / العربية), invoice and quote prefixes, tax defaults, terms, reminder template |
| **Export** | CSV for invoices, clients, expenses and payments |
| **Landing page** | A complete responsive marketing page at `/`, included for reselling as a hosted SaaS |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, React Router 7 |
| Icons | Phosphor Icons — vector only, no emoji |
| Charts | Hand-rolled SVG — no chart library |
| Backend | Node 22.5+ (24 LTS recommended), Express 4 |
| Database | SQLite via Node's built-in `node:sqlite` — **zero native dependencies** |
| Auth | `scrypt` password hashing, HTTP-only session cookies, role-based access control |

**No database server to install. Nothing to compile. No ORM.** A clean machine
with Node.js runs the whole thing.

---

## Architecture at a glance

```
Browser
  │
  ▼
Express API (:4318)  ── serves the built SPA and /api from one origin
  │
  ├─ requireAuth       session cookie → user
  ├─ requireBusiness   workspace resolution + membership check
  ├─ requireRole       owner > admin > member > viewer
  │
  ▼
SQLite (node:sqlite) ── every query scoped by business_id
```

Multi-tenant workspaces with strict data isolation: one install safely serves
many clients. See [docs/ERD.md](docs/ERD.md) and
[docs/SECURITY.md](docs/SECURITY.md).

---

## Roles

| Role | Can read | Can create/edit business data | Can change settings | Can manage the team |
|---|---|---|---|---|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |

Every mutating endpoint is role-guarded. A `viewer` receives `403` on any
write attempt.

---

## Project structure

```
your-project/
├── README.md            This file
├── HowToSetup.md        Setup, deployment, backups, troubleshooting
├── CLAUDE.md            Architecture and conventions for AI agents
├── CHANGELOG.md         Release history
├── LICENSE-NOTE.md      Licensing and resale terms
├── Node Project/        The application
│   ├── package.json     Workspace scripts
│   ├── .env.example     Every option, placeholder values only
│   ├── ecosystem.config.cjs
│   ├── server/          Express API + SQLite
│   └── web/             React + TypeScript SPA
├── database/
│   ├── schema.sql       Full schema — creates the database from scratch
│   └── seed.sql         Demo seed data
├── docs/
│   ├── API.md           Endpoint reference
│   ├── ERD.md           Data model and entity relationships
│   ├── FEATURES.md      Detailed feature reference
│   └── SECURITY.md      Auth model and role matrix
└── docker-compose.yml
```

---

## API

A short tour — the full reference is in [docs/API.md](docs/API.md).

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` · `/login` · `/logout` | public | Session handling |
| `GET` | `/api/auth/me` | signed in | Current user and workspaces |
| `POST` | `/api/auth/switch` | signed in | Change the active workspace |
| `GET` | `/api/health` | public | Liveness probe |
| `GET` `PATCH` | `/api/business` | viewer / admin | Workspace settings and branding |
| `GET` `POST` `PATCH` `DELETE` | `/api/clients` | viewer / member | Client book |
| `GET` `POST` `PATCH` `DELETE` | `/api/products` | viewer / member | Catalog |
| `GET` `POST` `PATCH` `DELETE` | `/api/quotes` | viewer / member | Quotes |
| `POST` | `/api/quotes/:id/convert` | member | Quote → invoice |
| `GET` `POST` `PATCH` `DELETE` | `/api/invoices` | viewer / member | Invoices |
| `POST` | `/api/invoices/:id/send` | member | Mark as sent |
| `POST` `DELETE` | `/api/invoices/:id/payments` | member | Payment records |
| `POST` | `/api/invoices/:id/remind` | member | Generate a chase message |
| `GET` `POST` | `/api/recurring` | viewer / member | Recurring billing |
| `GET` `POST` `PATCH` `DELETE` | `/api/expenses` | viewer / member | Expenses |
| `GET` | `/api/dashboard` · `/api/reports/*` | viewer | Reporting |
| `GET` | `/api/export/:kind.csv` | viewer | CSV export |
| `GET` `POST` `PATCH` `DELETE` | `/api/team` | viewer / admin | Team management |
| `GET` | `/api/portal/:token` | public (token) | Client portal data |
| `POST` | `/api/portal/:token/pay/:invoiceId` | public (token) | Client records a payment |

Business endpoints expect the `x-business-id` header naming the active
workspace.

---

## Documentation

| Document | Purpose |
|---|---|
| [HowToSetup.md](HowToSetup.md) | Setup, deployment, backups, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | Architecture and coding conventions |
| [CHANGELOG.md](CHANGELOG.md) | Release history and known limitations |
| [LICENSE-NOTE.md](LICENSE-NOTE.md) | Licensing and resale terms |
| [docs/API.md](docs/API.md) | Full endpoint reference |
| [docs/ERD.md](docs/ERD.md) | Data model and entity relationships |
| [docs/FEATURES.md](docs/FEATURES.md) | Detailed feature reference |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication model and role matrix |
| [docs/DEPENDENCY-AUDIT.md](docs/DEPENDENCY-AUDIT.md) | Audit result and every pinned version |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Requirement-by-requirement submission checklist |
| [docs/DEPLOY_FOR_DEMO.md](docs/DEPLOY_FOR_DEMO.md) | How to publish a live demo |

---

## Notes before production use

- **Delete the demo account and data.** The seed exists so a reviewer can
  explore immediately; it contains no real customer information.
- **Set a real data directory.** Point `DATA_DIR` at a backed-up volume.
- **Put it behind HTTPS.** See the nginx configuration in `HowToSetup.md`.
- **Client portal payments are recorded, not charged.** To accept real money,
  wire in a gateway — the integration point is documented in `HowToSetup.md`.
- **Reminders are generated and copied, not auto-sent.** An SMTP hook is
  documented in `HowToSetup.md`.

---

## Licence

MIT — commercial use, modification and resale permitted. See
[LICENSE-NOTE.md](LICENSE-NOTE.md) for the full terms and a summary of what
you may and may not do.

---

© 2026 Flowdesk
