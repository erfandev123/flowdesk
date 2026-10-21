# How To Setup

This guide takes you from a clean machine to a running Flowdesk instance.
Follow it top to bottom — no prior knowledge is assumed.

---

## 0. Prerequisites

| Requirement | Version | How to check |
|---|---|---|
| **Node.js** | **22.5.0 or newer** (24 LTS recommended) | `node -v` |
| npm | 9 or newer (ships with Node) | `npm -v` |
| Docker Desktop | optional — only for the Docker path | `docker -v` |

> **Node.js 22.5 is the minimum** because Flowdesk stores its data in SQLite
> through Node's built-in `node:sqlite` module, which was added in 22.5.
> The `engines` field in `package.json` enforces the same constraint.

> **No database installation is required.** There is no MySQL or PostgreSQL to
> install, and no native module to compile.

If you do not have Node.js, download the LTS installer from
<https://nodejs.org/> and run it.

---

## 1. Quick start

```bash
cd "Node Project"
npm run install:all     # restore packages for the server and the web app
npm run seed            # create the demo workspace
npm run serve           # build the web app, then serve everything on :4318
```

`npm run serve` is the one-liner equivalent of `npm run build && npm start`.

Open <http://localhost:4318> and sign in:

```
demo@flowdesk.app
demo1234
```

> **Wait for `npm run seed` to finish before opening the browser.** It prints
> `Seed complete.` when the demo account has been created. If you sign in
> before that, you will be told the email or password is wrong.
>
> If the app is deployed somewhere with an ephemeral filesystem — a free
> container host, for example — the server seeds the demo workspace by itself
> on every boot, so the data is always there.

Full step-by-step instructions, deployment options and troubleshooting are in
**[HowToSetup.md](HowToSetup.md)**.

---

## 1. Get the code

Unzip the archive. It has this layout:

```
your-project/
├── README.md
├── HowToSetup.md
├── CLAUDE.md
├── CHANGELOG.md
├── LICENSE-NOTE.md
├── Node Project/      ← run every command from here
├── database/
├── docs/
└── docker-compose.yml
```

Open a terminal **inside the `Node Project` folder**. All commands in this
guide are run from `Node Project/`.

---

## 2. Restore packages

```bash
npm --prefix server install
npm --prefix web install
```

Or, equivalently, from inside `Node Project/`:

```bash
npm run install:all
```

Both lockfiles are committed (`server/package-lock.json` and
`web/package-lock.json`), so the exact dependency versions in this release are
restored.

---

## 3. Create the database

### Option A — let the app create it (simplest)

The server applies the schema automatically on first boot. Skip to step 4.

### Option B — apply the SQL scripts explicitly

The repository ships a full schema and seed script under `database/`:

```bash
sqlite3 "Node Project/server/data/flowdesk.db" < database/schema.sql
sqlite3 "Node Project/server/data/flowdesk.db" < database/seed.sql
```

If the `sqlite3` command-line tool is not installed, the same two files can be
applied with Node:

```bash
node -e "
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const db = new DatabaseSync('Node Project/server/data/flowdesk.db');
db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
db.exec(fs.readFileSync('database/seed.sql', 'utf8'));
db.close();
console.log('database created');
"
```

Either way, the database file lives at:

```
Node Project/server/data/flowdesk.db
```

---

## 4. Run the app

### Development mode (two processes, hot reload)

Terminal 1 — API:

```bash
npm run dev:server
```

Terminal 2 — UI with hot reload:

```bash
npm run dev:web
```

Open <http://localhost:5183>. The dev server proxies `/api` to the API on
port 4318.

### Production mode (single process, one port)

```bash
npm run build
npm start
```

Open <http://localhost:4318> — the Express server serves both the API and the
built frontend from the same origin.

### One-command setup

```bash
node scripts/deploy.js
```

Installs dependencies, builds the web app, seeds the demo data if the database
is empty, and prints the next steps.

---

## 5. Sign in

The seed script creates a demo workspace you can explore immediately:

```
Email:    demo@flowdesk.app
Password: demo1234
```

You will land on the dashboard with 7 clients, 15 invoices and a full set of
sample data.

> **Before using this in production:** delete the demo account and the demo
> data. Either remove `Node Project/server/data/flowdesk.db` and restart (the
> schema is recreated automatically), or delete the demo user from the Team
> page.

---

## 6. Configuration

No configuration is required to run the app. To customise it, copy the example
environment file:

```bash
cp "Node Project/.env.example" "Node Project/.env"
```

> On Windows PowerShell: `Copy-Item "Node Project/.env.example" "Node Project/.env"`

`Node Project/.env.example` documents every supported setting — port, data
directory, and placeholders for optional integrations (Stripe, bKash, SMTP,
WhatsApp Business API). **No live credentials are shipped in this archive.**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4318` | HTTP port |
| `DATA_DIR` | `./server/data` | Where the SQLite database is stored |
| `NODE_ENV` | — | Set to `production` in production |

---

## 7. Deploy

### Docker (recommended)

From the archive root (the folder containing `docker-compose.yml`):

```bash
docker compose up -d --build
```

The database lives in the `flowdesk-data` volume and survives rebuilds.
**Never run `docker compose down -v` unless you intend to delete all data.**

Check it is healthy:

```bash
curl http://localhost:4318/api/health
# {"ok":true,"service":"flowdesk","workspaces":1,"uptime":9}
```

### PM2 (Node process manager)

```bash
cd "Node Project"
npm run install:all
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

### systemd (Linux VPS)

```ini
# /etc/systemd/system/flowdesk.service
[Unit]
Description=Flowdesk
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/flowdesk/Node Project
EnvironmentFile=/opt/flowdesk/Node Project/.env
Environment=PORT=4318
Environment=DATA_DIR=/opt/flowdesk/Node Project/server/data
ExecStart=/usr/bin/node server/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flowdesk
```

### nginx reverse proxy + HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name billing.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/billing.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billing.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4318;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d billing.yourdomain.com
```

---

## 8. Backups

Everything lives in one SQLite file. Back it up:

```bash
cp "Node Project/server/data/flowdesk.db" /backups/flowdesk-$(date +%F).db
```

Schedule it with cron, for example nightly at 02:00:

```cron
0 2 * * * cp /opt/flowdesk/Node\ Project/server/data/flowdesk.db /backups/flowdesk-$(date +\%F).db
```

---

## 9. Verify the installation

| Check | Expected |
|---|---|
| `curl http://localhost:4318/api/health` | `{"ok":true,...}` |
| Open <http://localhost:4318> | Landing page renders |
| Open <http://localhost:4318/login> | Sign-in form renders |
| Sign in with the demo account | Dashboard loads with sample data |
| Visit a client's portal link | Invoices and a **Pay now** button render |

---

## 10. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `node:sqlite` not found | Node older than 22.5 | Upgrade Node to 24 LTS |
| `Cannot POST /api/auth/login` | API router not mounted | Confirm `app.use('/api', api)` exists in `server/src/server.js` |
| Blank page, no data | Frontend not built | Run `npm run build` |
| `EADDRINUSE` | Port already in use | `PORT=8080 npm start`, or stop the other process |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm run install:all` |
| Demo account missing | Database was reset | Run `npm run seed` |
| Data gone after a rebuild | Docker volume removed | Back up `/data`; avoid `docker compose down -v` |
| Fonts look different | No internet on the server | The app falls back to system fonts and still works |

---

## 11. Project layout

```
your-project/
├── README.md               Overview, features, API summary
├── HowToSetup.md           This file
├── CLAUDE.md               Architecture and conventions for AI agents
├── CHANGELOG.md            Release history
├── LICENSE-NOTE.md         Licensing and resale terms
├── Node Project/           The application
│   ├── package.json        Workspace scripts
│   ├── .env.example        Every configuration option, placeholder values only
│   ├── ecosystem.config.cjs PM2 configuration
│   ├── server/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── db.js       Schema, migrations, password hashing
│   │   │   ├── server.js   REST API, auth, role guards, static hosting
│   │   │   └── seed.js     Demo data generator
│   │   └── public/
│   └── web/
│       ├── package.json
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── main.tsx    Router and providers
│           ├── styles.css  Design tokens and component classes
│           ├── types.ts    Shared TypeScript types
│           ├── context/    Auth context
│           ├── components/ Shell, charts, modal, chips
│           └── pages/      All screens
├── database/
│   ├── schema.sql          Full schema — creates the database from scratch
│   └── seed.sql            Demo seed data
├── docs/
│   ├── API.md              Full endpoint reference
│   ├── ERD.md              Entity relationship diagram and data model
│   ├── FEATURES.md         Detailed feature reference
│   └── SECURITY.md         Auth model and role matrix
└── docker-compose.yml
```
