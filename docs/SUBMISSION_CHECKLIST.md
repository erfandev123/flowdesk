# Marketplace Submission Checklist

Everything the submission form asks for, where to find it, and how to fill it
in. Use this as a final pass before you submit.

---

## The archive

**File:** `flowdesk-source-code.zip` (2.5 MB)

Regenerate it at any time:

```bash
cd "Node Project"
npm run package:release
```

The packaging script refuses to build an archive that is missing a required
file or that contains an excluded artifact, so the zip is always compliant.

---

## Folder structure — matches the requirement exactly

```
your-project.zip
├── README.md              ✓
├── HowToSetup.md          ✓
├── CLAUDE.md              ✓
├── CHANGELOG.md           ✓
├── LICENSE-NOTE.md        ✓
├── LICENSE                ✓ (extra — the full MIT text)
├── Node Project/          ✓ the application
│   ├── package.json
│   ├── .env.example
│   ├── ecosystem.config.cjs
│   ├── server/
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── public/robots.txt
│   │   └── src/{db.js, server.js, seed.js}
│   ├── web/
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── index.html
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/…
│   └── scripts/           ✓ deploy, packaging and verification tooling
├── database/
│   ├── schema.sql         ✓ creates the database from scratch
│   └── seed.sql           ✓ demo data
├── docs/                  ✓ API.md, ERD.md, FEATURES.md, SECURITY.md,
│                            DEPLOY_FOR_DEMO.md, BUYER_GUIDE.md, PRICING.md,
│                            SELLING_POST.md
├── screenshots/            ✓ 14 product screenshots
├── docker-compose.yml     ✓
├── Dockerfile             ✓
└── .gitignore / .dockerignore
```

Excluded, as required: `node_modules`, `dist`, `build`, `bin`, `obj`, `.git`,
any database file, and any real `.env`.

---

## Requirement-by-requirement

### 1. Complete source for every component ✅

Everything is in the archive as editable source. There is no compiled-only
part and nothing is obfuscated.

- **Web app** — `Node Project/web/src/`, 21 TypeScript/TSX files plus
  `styles.css`. Standard Vite + React + Tailwind source.
- **API** — `Node Project/server/src/server.js`, one readable Express file with
  every route, plus `db.js` for the schema and `seed.js` for the demo data.
- **Admin area** — there is no separate admin application. The owner and admin
  roles are protected areas *inside* the same app (Settings, Team management),
  guarded server-side by `requireRole('admin')`.
- **Mobile app** — there is no native mobile app. The web app is fully
  responsive, which is why the client portal works on a phone. Nothing is
  missing.

### 2. No real credentials in the archive ✅

- `Node Project/.env.example` ships with placeholder values only
  (`sk_test_xxx`, `xxx`, `yourdomain.com`).
- No `.env` file is included.
- The only credential in the archive is the **demo account**
  (`demo@flowdesk.app` / `demo1234`), which is required by requirement 8 and
  is documented in `HowToSetup.md` §5 and `database/seed.sql`. It holds no real
  data.
- The packaging script fails the build if a real `.env` or a database file is
  ever present.

### 3. Builds from a clean machine ✅

`HowToSetup.md` walks a reviewer through it with no assumptions:

```bash
cd "Node Project"
npm run install:all
npm run seed
npm run build
npm start
```

Then open `http://localhost:4318`.

This path is verified automatically. `npm run verify:release` unzips the actual
release archive into a clean temporary directory and runs the whole flow:
unzip → structure check → credential scan → restore packages → build →
create the database from the SQL files → start the server → sign in with the
demo credentials → confirm the demo data loads → confirm an unauthenticated
write is rejected.

```bash
cd "Node Project"
npm run verify:release
```

Expected output ends with:

```
 RELEASE ARCHIVE VERIFIED
  unzip                  OK
  required structure     OK
  no excluded artifacts  OK
  no real credentials    OK
  packages restored      OK
  web build              OK
  database from SQL      OK
  server started         OK
  demo login             OK
  demo data loaded       OK
  auth guard active      OK
```

### 4. Database script or migrations ✅

- `database/schema.sql` — every `CREATE TABLE` and `CREATE INDEX`, with
  comments. Creates the database from scratch.
- `database/seed.sql` — 75 INSERT statements across 12 tables: 1 user, 1
  workspace, 7 clients, 6 catalog items, 3 quotes, 15 invoices, 21 invoice
  lines, 8 payments and 6 expenses.

Both files are exported from the live database by
`npm run export:sql`, so they can never drift from the running application.

Apply them with the `sqlite3` CLI:

```bash
sqlite3 flowdesk.db < database/schema.sql
sqlite3 flowdesk.db < database/seed.sql
```

or with Node (no CLI needed):

```bash
node -e "
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const db = new DatabaseSync('flowdesk.db');
db.exec(fs.readFileSync('database/schema.sql','utf8'));
db.exec(fs.readFileSync('database/seed.sql','utf8'));
db.close();
"
```

The application also applies the schema itself on first boot, so this step is
optional for a Node deployment.

### 5. Authentication and roles on every mutating endpoint ✅

**Every** route that creates, updates or deletes data requires a signed-in
user with the right role. The guard runs server-side — hiding a button in the
interface is never the only protection.

| Guard | Role needed | Applied to |
|---|---|---|
| `requireAuth` | signed in | All non-public routes |
| `requireBusiness` | workspace member | All business routes |
| `requireWrite` | `member` or above | Clients, products, quotes, invoices, payments, reminders, recurring, expenses |
| `requireAdmin` | `admin` or above | Workspace settings and branding, team management |

Role hierarchy: `owner` > `admin` > `member` > `viewer`. A `viewer` is
read-only and receives `403` on every write attempt.

**23 mutating routes are role-guarded.** Verified behaviour:

| Attempt | Result |
|---|---|
| Viewer creates a client | `403` |
| Viewer creates an invoice | `403` |
| Viewer deletes an expense | `403` |
| Viewer records a payment | `403` |
| Viewer changes workspace settings | `403` |
| Viewer invites a team member | `403` |
| No session, any write | `401` |
| Viewer reads data | allowed |

Admin areas are role-protected: the Team page and the Settings page require
`admin`. The owner's role cannot be changed and the owner cannot be removed.

The full matrix is in `docs/SECURITY.md`.

### 6. Pinned dependencies without critical CVEs ✅

Both lockfiles are committed:

- `Node Project/server/package-lock.json`
- `Node Project/web/package-lock.json`

`npm ci` restores the exact versions in this release.

The runtime dependency surface is deliberately tiny — `express` and
`cookie-parser` on the server, nothing on the browser side beyond React, the
router and the icon set. There is no ORM, no chart library, no UI kit, no
date library and no native module.

To re-check for advisories:

```bash
cd "Node Project/server" && npm audit
cd "Node Project/web"    && npm audit
```

### 7. Documentation set ✅

| File | Contents |
|---|---|
| `README.md` | Overview, feature table, stack, architecture, role matrix, API tour, project layout |
| `HowToSetup.md` | Requirements, install, database creation, run, configuration, four deployment paths, backups, verification, troubleshooting, security checklist |
| `CLAUDE.md` | Architecture, request pipeline, conventions (money, dates, SQL, auth, API, frontend), how to add a feature, what not to do |
| `CHANGELOG.md` | Full 1.0.0 release notes and known limitations |
| `LICENSE-NOTE.md` | MIT summary, what you may and may not do, third-party licences |
| `LICENSE` | The full MIT licence text |
| `docs/API.md` | Every endpoint with request and response shapes |
| `docs/ERD.md` | Full data model with the ER diagram and table reference |
| `docs/SECURITY.md` | Auth model, role matrix, isolation, known limitations |
| `docs/FEATURES.md` | Detailed feature reference |
| `docs/DEPLOY_FOR_DEMO.md` | How to publish a live demo |
| `docs/BUYER_GUIDE.md` | Handover guide for whoever runs it |
| `docs/PRICING.md` | Price sheet and pitch script |
| `docs/SELLING_POST.md` | Ready-to-copy marketing posts |

### 8. Working live demo — you need to publish this ⚠️

This is the one item that **cannot be satisfied from the archive alone**. You
need to deploy the app and submit the resulting URL.

Follow `docs/DEPLOY_FOR_DEMO.md`. The fastest route is Render:

1. Push `Node Project/` to GitHub.
2. Render → New Web Service → root directory `Node Project`.
3. Build: `npm --prefix web ci && npm --prefix web run build && npm --prefix server ci --omit=dev`
4. Start: `node server/src/server.js`
5. Health check: `/api/health`
6. Attach a disk at `/var/data`, set `DATA_DIR=/var/data`.
7. Run the seed once: `node server/src/seed.js`.
8. Your URL looks like `https://flowdesk-xxxx.onrender.com`.

**Credentials to submit:**

```
demo@flowdesk.app
demo1234
```

> Render's free tier sleeps after 15 minutes idle, so open the URL a few
> minutes before you submit to make sure it responds immediately.

---

## Form fields — quick reference

| Field | Value |
|---|---|
| Project name | Flowdesk — Client & Cashflow Workspace |
| Category | Full Stack Web App · Business & Finance (Invoice & Billing Management) |
| Technology stack | React 19, TypeScript, Tailwind CSS 4, Vite 6, Express 4, SQLite (node:sqlite) |
| Source code | ✅ included in the archive |
| Database | ✅ `database/schema.sql` + `database/seed.sql` |
| Documentation | ✅ README, HowToSetup, CLAUDE, CHANGELOG, LICENSE-NOTE, docs/ |
| Docker | ✅ `docker-compose.yml` + `Dockerfile` |
| Demo URL | *(fill in after deploying)* |
| Demo credentials | `demo@flowdesk.app` / `demo1234` |
| License | MIT — resale and modification permitted |
| Price | *(your call — see `docs/PRICING.md`)* |

---

## Final pre-submission checklist

- [ ] `npm run package:release` ran and the zip is regenerated
- [ ] `npm run verify:release` passed on the exact zip you are submitting
- [ ] The demo is deployed and reachable over HTTPS
- [ ] You opened the demo URL and signed in with the demo credentials
- [ ] The demo still shows the sample data (7 clients, 15 invoices)
- [ ] A client portal link opens and shows a **Pay now** button
- [ ] The zip does **not** contain `node_modules`, `dist` or a database file
- [ ] The docs list is complete at the zip root
- [ ] You know your price and your pitch
