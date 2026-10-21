# Deploy to a public URL — gives you the live demo the marketplace asks for.

The submission checklist requires a reachable demo URL that accepts the demo
credentials. This guide gets you there in about 15 minutes on a free tier.

---

## Option A — Render (recommended, free tier available)

### 1. Push to GitHub

```bash
cd "Node Project"
git init
git add .
git commit -m "Flowdesk v1.0.0"
```

Create a repository on GitHub and push it:

```bash
git remote add origin https://github.com/<your-user>/flowdesk.git
git branch -M main
git push -u origin main
```

> Commit the lockfiles. `server/package-lock.json` and
> `web/package-lock.json` must be in the repository.

### 2. Create the service

On [render.com](https://render.com):

1. **New → Web Service** → connect your repository.
2. **Runtime:** Node
3. **Root directory:** `Node Project`
4. **Build command:**

   ```bash
   npm --prefix web ci && npm --prefix web run build && npm --prefix server ci --omit=dev
   ```

5. **Start command:**

   ```bash
   node server/src/server.js
   ```

6. **Health check path:** `/api/health`
7. **Environment variables:**

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (Render sets this) |
   | `DATA_DIR` | `/var/data` |

8. **Add a disk** (optional but recommended — Render's filesystem is ephemeral
   without one). Mount it at `/var/data` and set `DATA_DIR=/var/data`.

### 3. Create the demo data

**You do not have to.** Flowdesk seeds the demo workspace by itself.

The server checks the database on every boot. If there are no users, it creates
the demo workspace — clients, catalog, quotes, invoices, payments, expenses —
before it starts listening. So the demo is populated on the very first request
and after every restart.

Set `SEED_ON_BOOT=false` to turn this off in a real deployment.

If you want to seed by hand instead:

```bash
cd "Node Project"
node server/src/seed.js
```

### 4. Your demo URL

```
https://flowdesk-demo-xxxx.onrender.com
```

Demo credentials: `demo@flowdesk.app` / `demo1234`

> Render's free tier spins down after 15 minutes of inactivity, so the first
> load can take up to a minute. **Open the URL a few minutes before you
> submit** so it is warm.

---

## ⚠️ Free tier and the SQLite file

This matters, so here is the honest picture.

| | Free instance | Paid instance |
|---|---|---|
| Cost | $0 | from $7/month |
| Persistent disk | **not available** | $0.25/GB/month |
| Filesystem on restart | **wiped** | preserved with a disk |
| Demo data | **recreated automatically on boot** | preserved |

Render's free web services have an **ephemeral filesystem**: the SQLite file
is deleted every time the service redeploys, restarts, or spins down after
15 minutes idle. A free instance also **cannot** have a persistent disk
attached, so there is no way to keep the file across restarts.

**This is fine for a demo, because the app re-seeds itself.** The sequence is:

1. The service spins down after 15 minutes idle.
2. A visitor opens your URL.
3. Render restarts the container.
4. The server finds an empty database and creates the demo workspace.
5. The visitor sees the full demo.

It costs a few seconds of start-up time on the first request after a sleep.
If that matters to you, upgrading to the $7/month plan gives you a persistent
disk and no sleep.

---

## Option B — Railway

1. **New Project → Deploy from GitHub.**
2. **Root directory:** `Node Project`
3. **Build command:** `npm --prefix web ci && npm --prefix web run build && npm --prefix server ci --omit=dev`
4. **Start command:** `node server/src/server.js`
5. **Variables:** `NODE_ENV=production`, `DATA_DIR=/data`
6. **Volumes:** add a volume mounted at `/data`
7. **Generate the demo data** once from the Railway CLI:
   `railway run node server/src/seed.js`
8. Railway gives you `https://<app>.up.railway.app`

---

## Option C — A VPS (Hetzner, DigitalOcean, Contabo — $4–6/month)

```bash
# On the server
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
git clone <your-repo> /opt/flowdesk
cd "/opt/flowdesk/Node Project"

npm --prefix web ci
npm --prefix web run build
npm --prefix server ci --omit=dev
node server/src/seed.js

# Run it under systemd — see the unit file in HowToSetup.md
sudo systemctl enable --now flowdesk

# Point nginx at it and add TLS
sudo certbot --nginx -d yourdomain.com
```

Your demo URL is your domain.

---

## Option D — The simplest possible (no server, no domain)

If you only need a reachable demo and a static host will not work because the
app has a backend, use a tunnel while your machine is on:

```bash
cd "Node Project"
npm run build
node server/src/server.js
```

Then, in another terminal:

```bash
npx localtunnel --port 4318
```

or

```bash
ngrok http 4318
```

This gives you a public URL immediately. **It only works while your machine is
running and the tunnel is open**, so use it for a quick demo, not for the
submission.

---

## After it is live — check it yourself

| Check | Expected |
|---|---|
| `https://your-url/api/health` | `{"ok":true,"service":"flowdesk",...}` |
| `https://your-url/` | Landing page renders |
| `https://your-url/login` | Sign-in form renders |
| Sign in with the demo credentials | Dashboard with 7 clients and 15 invoices |
| Open a client portal link | Invoices and a **Pay now** button render |
| Try a write while signed out | `401` from the API |

---

## Before you submit

- [ ] The demo URL loads over HTTPS
- [ ] The demo credentials work
- [ ] The database is persistent (a disk or volume is attached) — otherwise
      the demo resets on every deploy
- [ ] You have re-run the seed if the data disappeared
- [ ] You have noted the URL and credentials to enter in the submission form
