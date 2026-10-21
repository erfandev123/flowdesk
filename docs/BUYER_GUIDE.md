# Buyer Guide — Setup in 10 Minutes

This is the document your buyer receives. Everything here works on a fresh
machine with no prior setup beyond Node.js and (optionally) Docker.

---

## 1. What you need before you start

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **22.5 or newer** | Node 24 LTS recommended. `node -v` to check. |
| npm | 9+ | Ships with Node. |
| Docker Desktop | optional | Only for the Docker path. |
| A server | optional | Any VPS: Hetzner, DigitalOcean, Contabo, Vultr, AWS Lightsail — $4–6/month. |

**No database installation is required.** Flowdesk uses Node's built-in
`node:sqlite` module — no MySQL, no PostgreSQL, no native compilation.

---

## 2. Quick start (local)

```bash
# 1. Install dependencies
npm run install:all

# 2. Seed the demo workspace (optional but recommended to explore)
npm run seed

# 3. Build the web app and serve everything on one port
npm run serve
```

Open **http://localhost:4318** and sign in:

```
demo@flowdesk.app
demo1234
```

> The seed script is safe to run only once. It skips if the database already
> exists, so re-running it never duplicates data.

### Development mode (hot reload)

```bash
npm run dev:server   # API on :4318
npm run dev:web      # UI on :5183 with /api proxied to :4318
```

---

## 3. Production deployment — pick one

### Option A: Docker (recommended — most portable)

```bash
docker compose up -d --build
```

That is it. The `flowdesk-data` volume keeps the database across rebuilds.

Check it is alive:

```bash
curl http://localhost:4318/api/health
# {"ok":true,"service":"flowdesk","workspaces":1,"uptime":12}
```

**Important:** the database lives in the `/data` volume. If you ever run
`docker compose down -v`, that volume is deleted and you lose all data.
Back up `/data` regularly.

### Option B: PM2 (Node server directly)

```bash
npm run install:all
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup      # follow the printed command to enable boot persistence
```

### Option C: Plain systemd (Linux VPS)

```bash
npm run install:all
npm run build
sudo mkdir -p /opt/flowdesk
sudo cp -r server web scripts package.json /opt/flowdesk/
sudo cp server/.env.example /opt/flowdesk/.env   # then edit it
```

`/etc/systemd/system/flowdesk.service`:

```ini
[Unit]
Description=Flowdesk
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/flowdesk
EnvironmentFile=/opt/flowdesk/.env
Environment=PORT=4318
Environment=DATA_DIR=/opt/flowdesk/server/data
ExecStart=/usr/bin/node server/src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flowdesk
sudo systemctl status flowdesk
```

### Option D: Shared hosting (cPanel, Hostinger, Namecheap)

Shared hosting usually cannot run a Node server. If your host supports Node
apps (most do now via "Setup Node.js App"), use it:

- **Application root:** the project folder
- **Startup file:** `server/src/server.js`
- **Node version:** 22+
- **Environment:** `PORT=4318`, `DATA_DIR=./server/data`
- **Install:** run `npm run install:all && npm run build` from the terminal first

---

## 4. nginx + HTTPS (recommended for anything public)

```nginx
server {
    listen 80;
    server_name billing.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name billing.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/billing.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billing.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4318;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/flowdesk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d billing.yourdomain.com
```

---

## 5. First-run checklist

1. **Open the app** at your domain. Register a real account (don't ship the demo login).
2. **Delete the demo data.** In Settings, work in a fresh workspace, or delete
   `server/data/flowdesk.db` and restart.
3. **Brand it** — Settings → logo initials, primary color, accent color,
   currency, invoice prefix, default tax, payment terms.
4. **Set the reminder template** — Settings → Reminder template. Placeholders:
   `{{client}}`, `{{number}}`, `{{amount}}`, `{{due}}`, `{{link}}`, `{{business}}`.
5. **Add your service catalog** — Catalog → your services and prices. Then
   creating an invoice takes seconds.
6. **Import your clients** — Clients → Add client.
7. **Send your first invoice** — Invoices → New invoice → Share the client
   portal link from the invoice page.
8. **Back up** — copy `server/data/flowdesk.db` somewhere safe on a schedule.

```bash
# nightly backup
0 2 * * * cp /opt/flowdesk/server/data/flowdesk.db /backups/flowdesk-$(date +\%F).db
```

---

## 6. Giving each client their own branded workspace

This is the workflow that turns Flowdesk into a resellable product.

1. The client registers an account at your deployed URL.
2. You sign in as them (or they sign in themselves) and go to **Settings**:
   - logo initials → their initials
   - brand color → their brand color
   - accent color → their accent color
   - currency → their currency
   - invoice prefix → their naming convention (e.g. `ACME`)
3. Optionally create extra workspaces via the switcher in the sidebar for
   each of their own clients.

Each workspace is fully isolated — data, branding, invoice numbering and
portal links never leak between workspaces.

---

## 7. Adding a real payment gateway

The portal currently records a payment in the database. To accept real money,
add a gateway. The integration point is deliberately small.

**Where to hook in:** `server/src/server.js`, the
`POST /api/portal/:token/pay/:invoiceId` handler.

Flow:

1. The client clicks **Pay now** in the portal.
2. The client chooses a method and amount.
3. The server should create a charge with the gateway, and **only on a
   successful gateway response** insert the row into `payments`.
4. Return the updated invoice to the portal, which already refreshes.

A minimal Stripe shape:

```js
// inside the portal pay handler
if (method === 'card' && process.env.STRIPE_SECRET_KEY) {
  const charge = await createStripeCharge({
    amount,
    currency: business.currency.toLowerCase(),
    metadata: { invoice_id: inv.id },
  });
  if (!charge.paid) return res.status(402).json({ error: 'Payment declined' });
  reference = charge.id;
}
```

The same pattern works for bKash, Nagad, PayPal and Razorpay — create the
charge, verify the response, then write the payment row.

---

## 8. Enabling automatic email

Currently the reminder generator produces a message you copy and send.
To send it automatically, add SMTP.

**Where to hook in:** after the reminder is created, send it.

```js
// optional dependency: npm i nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
```

Send `message` to the client's email with a subject like
`Invoice ${inv.number} — ${money(outstanding)} due ${inv.due_date}`, and
include the portal link so the client can pay.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot POST /api/auth/login` | The API router is not mounted | Check `app.use('/api', api)` exists in `server/src/server.js` |
| Blank page, UI loads but no data | Frontend not built | Run `npm run build` |
| `EADDRINUSE` | Port already in use | `PORT=8080 npm start`, or stop the other process |
| Data disappears after rebuild | Docker volume removed | Never run `docker compose down -v`; back up `/data` |
| "No workspace yet" | Account has no business attached | Register a fresh account — every registration creates one |
| Login works but dashboard empty | Wrong workspace selected | Use the switcher in the sidebar |
| Fonts look wrong | No internet on the server | The app falls back to system fonts; it still works |

---

## 10. Security checklist before going public

- [ ] Changed or removed the demo account (`demo@flowdesk.app`)
- [ ] Deleted the seeded demo data
- [ ] HTTPS is configured (nginx + certbot)
- [ ] `server/data/` is not readable from the web root
- [ ] `DATA_DIR` is on a backed-up volume
- [ ] The `fd_session` cookie is served over HTTPS only
- [ ] Your reverse proxy sets `X-Forwarded-Proto` correctly
- [ ] You know where your database backup lives

---

## 11. Project structure reference

```
flowdesk/
├── server/
│   ├── src/
│   │   ├── db.js        Schema, migrations, password hashing
│   │   ├── server.js    All REST endpoints + static hosting
│   │   └── seed.js      Demo workspace generator
│   └── public/          robots.txt and other static files
├── web/
│   ├── src/
│   │   ├── main.tsx     Router and providers
│   │   ├── styles.css   Design tokens, component classes, print rules
│   │   ├── types.ts     Shared TypeScript types
│   │   ├── context/     Auth and workspace context
│   │   ├── components/  Shell, charts, modal, status chips
│   │   └── pages/       All screens
│   └── dist/            Build output (generated)
├── scripts/             Deploy and QA helpers
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
├── .env.example
└── README.md
```
