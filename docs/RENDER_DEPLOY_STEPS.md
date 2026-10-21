# Render Deployment — Exact Steps

Screen-by-screen for https://render.com. Follow in order.

---

## Before you start

Your repository is already pushed:

```
https://github.com/erfandev123/flowdesk
```

Branch: `main` · Public · 72 files

---

## 1. Sign up

1. Go to **https://render.com**
2. Click **Get Started**
3. Choose **Continue with GitHub** → authorise the `erfandev123` account
4. You land on the dashboard

---

## 2. Create the web service

1. Click **New +** (top right) → **Web Service**
2. Find `flowdesk` in the repository list → click **Connect**
   - If it does not appear, click **Configure account** and give Render access
     to your repositories
3. Render opens the service configuration page

---

## 3. Fill the form

| Field | Value | Why |
|---|---|---|
| **Name** | `flowdesk-demo` | becomes `flowdesk-demo.onrender.com` |
| **Region** | **Singapore** | closest to Bangladesh/India → fastest for reviewers |
| **Branch** | `main` | |
| **Root Directory** | `Node Project` | ⚠️ **most important field** |
| **Runtime / Language** | `Node` | |
| **Build Command** | `npm --prefix web ci && npm --prefix web run build && npm --prefix server ci --omit=dev` | installs and builds the SPA, then installs the API deps |
| **Start Command** | `node server/src/server.js` | starts the API, which also serves the built SPA |
| **Health Check Path** | `/api/health` | Render uses it to know the service is alive |

> The build command runs from the **Root Directory**, so the `npm --prefix`
> paths are relative to `Node Project/`.

---

## 4. Pick the free instance

Scroll to **Instance Type** → select **Free** ($0).

> Free instances sleep after 15 minutes of inactivity. The first request then
> takes up to a minute to wake up. If a reviewer complains about a slow first
> load, open the URL yourself a few minutes before they check.

---

## 5. Environment variables

Scroll to **Environment Variables** → **Add Environment Variable** → add these three:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATA_DIR` | `/var/data` |

> `PORT=10000` is what Render injects. The server reads `process.env.PORT`, so
> this is correct.

---

## 6. Create it

Click **Create Web Service**.

Render clones the repo and runs the build command. This takes 2–4 minutes the
first time. Watch the **Logs** tab.

**Success looks like:**
```
==> Build succeeded
```

**If the build fails**, the usual causes are:
- Root Directory not set to `Node Project` → fix in Settings
- Build command typo → copy it exactly from the table above

---

## 7. Add a disk — DO NOT SKIP

Without a disk, the SQLite database is wiped on every deploy and the demo will
be empty.

1. Open your service dashboard
2. Click **Disks** in the left sidebar (or scroll to it on the service page)
3. Click **Add Disk**
4. Fill in:

   | Field | Value |
   |---|---|
   | Name | `flowdesk-data` |
   | Mount Path | `/var/data` |
   | Size | `1` GB |

5. Click **Save** and **Deploy** (Render restarts the service when a disk is
   attached)

> The free tier allows one 1 GB disk. This is what keeps `DATA_DIR=/var/data`
> persistent.

---

## 8. Seed the demo data

1. Open the service page → **Shell** tab
2. Run:

   ```bash
   cd "Node Project"
   node server/src/seed.js
   ```

3. You should see:

   ```
   Seed complete.
     Login: demo@flowdesk.app / demo1234
     Business: Northlight Studio (b_...)
   ```

> If the shell tab is unavailable on the free tier, use **Environment** →
> **Pre-deploy Command** instead and set it to
> `cd "Node Project" && node server/src/seed.js`. The seed script is safe to
> run repeatedly — it exits early if the demo account already exists.

---

## 9. Test your demo

Open **https://flowdesk-demo.onrender.com**

| Check | Expected |
|---|---|
| `/` | Marketing landing page |
| `/login` | Sign-in form |
| Sign in `demo@flowdesk.app` / `demo1234` | Dashboard with **7 clients, 15 invoices** |
| `/api/health` | `{"ok":true,"service":"flowdesk","workspaces":1,...}` |
| Clients → open a client → **Open portal** | Invoices with a **Pay now** button |

---

## 10. Submit

```
Demo URL:         https://flowdesk-demo.onrender.com
Demo credentials: demo@flowdesk.app / demo1234
```

**Just before you submit**, open the URL once so it is awake and fast.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails immediately | Root Directory is not `Node Project` |
| "Module not found: express" | Build command missing `npm --prefix server ci --omit=dev` |
| Site 404s after build | Start Command must be `node server/src/server.js` |
| Demo shows an empty dashboard | Seed did not run — do step 8 again |
| Data disappears on every deploy | No disk attached — do step 7 |
| First load takes ~1 minute | Free tier sleep — open the URL before the reviewer looks |
| Shell tab missing | Use a pre-deploy command instead |

---

## Rolling back a bad deploy

Render keeps previous builds. **Deploys** tab → pick an earlier successful
build → **Rollback**. The disk keeps the database, so your data survives.

---

## Optional: a custom domain

Free Render gives you `*.onrender.com`. A custom domain needs a paid plan, so
for a demo submission the default URL is fine.
