# Flowdesk — Complete Feature Reference

Everything the system does, explained so you can present it accurately to a
buyer or a client.

---

## The core job

> Recover money that has already been earned but is sitting in spreadsheets,
> DMs and unanswered invoices — without spending more time chasing it.

Everything below exists to serve that job.

---

## 1. Authentication & workspaces

| Feature | Behaviour |
|---|---|
| Registration | Email + password creates a user **and** a brand-new workspace |
| Password storage | `scrypt` with a per-user random salt (Node built-in, no native crypto deps) |
| Sessions | HTTP-only, SameSite=Lax cookie, 30-day expiry, revocable server-side |
| Multi-workspace | One user can hold many workspaces and switch between them from the sidebar |
| Data isolation | Every query is filtered by `business_id`. A workspace can never read another workspace's data. Verified by test. |
| Role field | `memberships.role` — `owner`, `admin`, `member`, `viewer`. Managed through the **Team** page: invite a member, change their role, or remove them. |

---

## 1b. Team — roles that actually work

| Capability | Detail |
|---|---|
| Invite | Add a person by name and email. A temporary password is generated and shown once — send it to them. |
| Existing accounts | If the email already has an account, they are attached to the workspace with no password change needed. |
| Roles | **Owner** (full control) · **Admin** (manage team, clients, invoices, settings) · **Member** (create and edit clients, quotes, invoices, payments) · **Viewer** (read-only) |
| Change role | A dropdown on each member row. Owners cannot be demoted through this screen. |
| Remove | One click. The owner cannot be removed and you cannot remove yourself. |
| Protection | Only owners and admins can manage the team. Everyone else gets a `403`. |
| Shared data | Every team member sees the same clients and invoices in the workspace — the workspace is the unit of sharing, not the person. |
| Login guard | Unauthenticated API calls return `401`. Requests for a workspace the user doesn't belong to return `404` (not `403` — no information leak). |

---

## 2. Dashboard — the morning glance

| Widget | What it answers |
|---|---|
| **Collected this month** | How much money actually came in this month (paid invoices) |
| **Outstanding** | How much has been invoiced but not yet received |
| **Overdue** | How much is past due — the number that needs action today |
| **Net this month** | Collected minus expenses — your real profit |
| **Revenue trend** | Monthly bar chart of paid invoices, current year |
| **Where money went** | Expense breakdown by category for the current month |
| **Needs attention** | Unpaid invoices sorted by most overdue first, with a "33d late" badge |
| **Top clients** | Lifetime revenue per client |
| **Quote pipeline** | Open quote value grouped by status |
| **Recent invoices** | Last 6 invoices with live status |

Every figure is computed in SQL, not in the browser. The dashboard is one
API call.

---

## 3. Clients — a real client book, not a contact list

- Name, company, email, phone, address, free-form notes
- Status: `active` / `lead` / `archived`
- **Lifetime value** — total of all paid invoices
- **Outstanding balance** — total of all unpaid invoices
- **Invoice count**
- Search across name, company and email
- Client detail page shows their full invoice + quote history
- **Private portal link** per client, with the ability to rotate the token
  (important if a link ever leaks)

---

## 4. Quotes → Invoices

- Create a quote against a client with a validity date and scope notes
- Status: `draft` / `sent` / `accepted` / `declined` / `expired`
- **One-click conversion**: accepting a quote creates a numbered invoice with
  every line item, the tax and the total copied over
- The quote is automatically marked `accepted`
- Invoice numbering is sequential per workspace and respects a configurable
  prefix (`INV-1042`, `ACME-1042`, …)

---

## 5. Invoices

| Capability | Detail |
|---|---|
| Line items | Description, quantity (decimal allowed), rate, tax rate per line |
| Catalog picker | Pick a service from the catalog and the line fills itself |
| Discount | Workspace-currency amount subtracted before tax |
| Tax | Per-line percentage, summed automatically |
| Dates | Issue date and due date |
| Terms & notes | Per-invoice, defaults come from workspace settings |
| Status | `draft` → `sent` → `partial` → `paid`, plus `overdue` and `cancelled` |
| Automatic overdue | An unpaid invoice past its due date flips to `overdue` on every read |
| Print layout | A dedicated print stylesheet renders a clean document with the app chrome removed |
| Copy to clipboard | The portal link is one click away |

---

## 6. Payments

- Record partial or full payments
- Amount, method (`cash`, `card`, `bank`, `mobile`, `other`), reference, note
- Payment date and timestamp
- **Reversal** — deleting a payment recalculates the invoice balance and status
- Invoice status is derived, never stored inconsistently:
  - fully paid → `paid`
  - partly paid → `partial`
  - nothing paid and past due → `overdue`
  - nothing paid and within terms → `sent`
- Every payment is listed with its date and method on the invoice

---

## 7. Recurring billing

- Mark an invoice as recurring: `weekly`, `monthly`, `quarterly`, `yearly`
- The next invoice date is scheduled automatically
- One click generates the next invoice with the same line items, a new number
  and a fresh due date
- A dedicated page shows every active schedule with its next run date

---

## 8. Payment reminders — the feature that saves the most time

Three channels: **Email**, **SMS**, **WhatsApp**.

- The message is generated from your template in Settings
- Placeholders: `{{client}}`, `{{number}}`, `{{amount}}`, `{{due}}`,
  `{{link}}`, `{{business}}`
- Amount and due date are formatted in the workspace currency
- The client portal link is inserted automatically
- Every sent reminder is logged on the invoice with its channel and timestamp
- One click copies the message to your clipboard so you can paste it into
  WhatsApp or your mail client

> Currently the message is **generated and copied**, not auto-sent. See
> `BUYER_GUIDE.md` §8 for the SMTP hook that makes it automatic.

---

## 9. Client portal — the conversion engine

Each client gets a private, token-based URL:

```
https://yourdomain.com/portal/<token>
```

The client:
- Opens the link on any phone or laptop
- Sees a greeting, their outstanding balance and their total paid
- Sees every invoice with itemised lines
- Clicks **Pay now**, enters an amount, chooses a method, and confirms
- The payment is recorded and the invoice status updates immediately

The client needs **no account, no email and no password**. The portal is
public-readable only for that client's own data — the token is the credential.

> The portal records the payment. To accept real money, wire in a gateway —
> see `BUYER_GUIDE.md` §7.

---

## 10. Expenses

- Category, vendor, amount, date, note
- Categories: software, contractors, marketing, office, travel, equipment,
  tax, general (editable in the form)
- Expenses feed the net-profit figure on the dashboard and the cashflow report

---

## 11. Catalog

- Name, description, price, unit (`project`, `month`, `hour`, …), tax rate
- Soft-archive instead of delete, so old invoices stay intact
- On the invoice editor, picking an item fills the description, rate and tax
  automatically

---

## 12. Reports

| Report | Contents |
|---|---|
| **Cashflow** | Revenue vs expenses per month, with the net figure |
| **Revenue vs expenses** | Donut chart of the split |
| **Net margin** | Percentage, colour-coded positive or negative |
| **Average days to pay** | Mean days from invoice date to payment |
| **Invoice velocity** | Every invoice from the last 180 days with its days-to-pay, so slow payers are obvious |

---

## 13. Branding & localisation

Fully configurable per workspace:

- Logo initials (shown in the sidebar, the mobile header and on invoices)
- Primary and accent colours, with a live preview
- Currency — 10 presets, any ISO code works
- Locale — English (US/UK/India), বাংলা, العربية, Deutsch, Español
- Invoice and quote prefixes
- Default tax rate
- Default payment terms
- Reminder template

---

## 14. Export

CSV downloads for **invoices, clients, expenses and payments**. Proper
quoting and escaping so the files open cleanly in Excel and Sheets.

---

## 15. Marketing landing page

A complete, responsive sales page is included at `/`:
- Hero with a live product preview
- Feature grid, audience segments, pricing tiers, FAQ, CTA
- It is a real page you can point buyers at — or resell as your own SaaS front door

---

## 16. Technical characteristics

| Property | Detail |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, React Router 7 |
| Icons | Phosphor Icons — vector only, no emoji anywhere |
| Charts | Hand-rolled SVG. No chart library, so no runtime weight. |
| Backend | Node 22+, Express 4 |
| Database | SQLite via Node's built-in `node:sqlite` — **zero native dependencies** |
| Auth | scrypt hashing, HTTP-only session cookies |
| Accessibility | Lighthouse **100 / 100** accessibility and best practices |
| Responsive | Verified at 390px, 768px, 1024px, 1440px |
| Print | Dedicated print stylesheet; the app chrome is removed on paper |
| Motion | Respects `prefers-reduced-motion` |
| Bundle | ~94 KB gzip main chunk after vendor splitting |
| Codebase | ~6,400 lines across 34 source files |

---

## 17. What is deliberately not included

Being straight about this matters when you are selling it.

| Missing | Impact | How to add it |
|---|---|---|
| Real payment gateway | Portal payments are recorded, not charged | Stripe / bKash hook — `BUYER_GUIDE.md` §7 |
| Automatic email | Reminders are generated and copied | SMTP hook — `BUYER_GUIDE.md` §8 |
| Team member management UI | Removed — the Team page now supports invite, role change and removal with owner/admin permissions | ✅ Built and tested |
| Double-entry accounting / VAT filing | This is a billing workspace, not an ERP | Out of scope |
| PDF library | Invoices print from the browser (Ctrl+P → Save as PDF) | Use a headless renderer if server-side PDFs are needed |
| Multi-currency conversion | Currencies are selectable, but no FX conversion | Add a rates table and a conversion layer |

---

## 18. Where the money is (for the buyer)

If you buy this to run it for clients, the revenue model is:

1. **Setup fee** — brand the workspace, import the client list, train the owner
2. **Monthly subscription** — per client, per workspace
3. **Custom work** — payment gateways, WhatsApp API, tax compliance, new modules
4. **White-label resale** — one license, many of your own clients

`PRICING.md` contains the recommended price sheet, pitch script, objection
handling and a 30-day launch plan.
