# API Reference

Base URL: `/api` · All responses are JSON · Errors are `{ "error": "message" }`

## Conventions

- **Authentication** — all endpoints except the public ones require the
  `fd_session` HTTP-only cookie.
- **Workspace scoping** — every business endpoint also requires the
  `x-business-id` header naming the active workspace. A user who is not a
  member of that workspace receives `404` (not `403`, so workspace existence is
  not leaked).
- **Roles** — `owner` > `admin` > `member` > `viewer`. `viewer` is read-only.

### Status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation error |
| `401` | Not signed in |
| `403` | Signed in but insufficient role |
| `404` | Not found, or not a member of the workspace |
| `500` | Server error |

---

## Public endpoints

### `GET /api/health`

Liveness probe. Used by the Docker `HEALTHCHECK`.

```json
{ "ok": true, "service": "flowdesk", "workspaces": 1, "uptime": 42 }
```

---

### `POST /api/auth/register`

Creates a user **and** a new workspace.

```json
{
  "name": "Ava Bennett",
  "email": "ava@studio.com",
  "password": "a-strong-password",
  "business_name": "Ava Bennett Studio",
  "currency": "USD"
}
```

`201` → `{ "ok": true, "user": {...}, "businessId": "b_..." }`
Sets the `fd_session` cookie.

Password must be at least 8 characters. Email must be unique.

---

### `POST /api/auth/login`

```json
{ "email": "demo@flowdesk.app", "password": "demo1234" }
```

`200` → `{ "ok": true, "user": {...}, "businessId": "b_..." }`
Sets the `fd_session` cookie.

---

### `POST /api/auth/logout`

Destroys the session server-side and clears the cookie.

---

### `GET /api/portal/:token`

Public client portal data, scoped by an unguessable token.

```json
{
  "client": { "name": "Ava Bennett", "company": "...", "email": "..." },
  "business": { "name": "...", "currency": "USD", "brand_color": "#1E3A5F", ... },
  "invoices": [ { "number": "INV-1001", "total": 347200, "paid_amount": 347200, ... } ]
}
```

---

### `POST /api/portal/:token/pay/:invoiceId`

Records a client payment against one of their invoices.

```json
{ "amount": 347200, "method": "card", "reference": "TXN-123" }
```

`201` → `{ "ok": true, "invoice": {...}, "remaining": 0 }`

Amount is in cents. Omit `amount` to pay the full outstanding balance.

> This is intentionally public — the token is the credential. It is the one
> write path that does not require a session.

---

## Session

### `GET /api/auth/me`

`200` →

```json
{
  "user": { "id": "u_...", "email": "...", "name": "..." },
  "businessId": "b_...",
  "businesses": [ { "id": "b_...", "name": "...", "currency": "USD", "role": "owner", "logo_text": "NS" } ]
}
```

---

### `POST /api/auth/switch`

```json
{ "business_id": "b_..." }
```

Switches the active workspace for the current session. Fails with `403` if the
user is not a member of that workspace.

---

## Business settings

### `GET /api/business`

Returns the full workspace record: name, currency, locale, timezone,
`brand_color`, `accent_color`, `logo_text`, `invoice_prefix`, `quote_prefix`,
`next_invoice_seq`, `next_quote_seq`, `default_tax`, `default_terms`,
`reminder_template`.

### `PATCH /api/business` — *admin*

Partial update. Writable keys: `name`, `currency`, `locale`, `timezone`,
`brand_color`, `accent_color`, `logo_text`, `invoice_prefix`, `quote_prefix`,
`default_tax`, `default_terms`, `reminder_template`.

---

## Team

### `GET /api/team`

```json
[ { "id": "u_...", "name": "Ava", "email": "ava@studio.com", "role": "owner", "joined_at": "...", "is_you": true } ]
```

### `POST /api/team/invite` — *admin*

```json
{ "name": "Riley Ahmed", "email": "riley@studio.com", "role": "member" }
```

`201` →

```json
{
  "ok": true,
  "added": true,
  "temp_password": "a9f3k2j1",
  "member": { "id": "u_...", "name": "Riley Ahmed", "email": "riley@studio.com", "role": "member" }
}
```

If the email already has an account it is attached to the workspace and no
temporary password is issued.

Roles: `admin`, `member`, `viewer`. `owner` cannot be assigned here.

### `PATCH /api/team/:userId` — *admin*

```json
{ "role": "viewer" }
```

The owner's role cannot be changed.

### `DELETE /api/team/:userId` — *admin*

Removes the membership. The owner cannot be removed and you cannot remove
yourself.

---

## Clients

### `GET /api/clients`

Query: `search` — matched against name, company and email.

Each row includes computed `outstanding`, `lifetime_value` and `invoice_count`.

### `POST /api/clients` — *member*

```json
{
  "name": "Ava Bennett",
  "company": "Ava Bennett Studio",
  "email": "ava@studio.com",
  "phone": "+1 415 555 0142",
  "address": "1200 Market Street",
  "notes": "Net-14 terms agreed.",
  "status": "active"
}
```

`status`: `active` | `lead` | `archived`.

### `GET /api/clients/:id`

Returns `{ client, invoices, quotes }`.

### `PATCH /api/clients/:id` — *member*

### `DELETE /api/clients/:id` — *member*

Cascades to the client's quotes and invoices.

### `POST /api/clients/:id/rotate-portal` — *member*

Issues a new portal token, invalidating the old portal link.

---

## Catalog

### `GET /api/products`

Query: `include_inactive=true` to include archived items.

### `POST /api/products` — *member*

```json
{ "name": "Brand Identity Sprint", "description": "...", "unit_price": 240000, "unit": "project", "tax_rate": 8.5, "active": true }
```

`unit_price` is in cents.

### `PATCH /api/products/:id` — *member*

### `DELETE /api/products/:id` — *member*

Soft-archives the item so existing invoices stay intact.

---

## Quotes

### `GET /api/quotes`

### `POST /api/quotes` — *member*

```json
{ "client_id": "c_...", "issue_date": "2026-10-01", "valid_until": "2026-10-31", "notes": "", "items": [] }
```

`status`: `draft` | `sent` | `accepted` | `declined` | `expired`.

### `GET /api/quotes/:id`

### `PATCH /api/quotes/:id` — *member*

### `DELETE /api/quotes/:id` — *member*

### `POST /api/quotes/:id/convert` — *member*

Creates a numbered invoice from the quote, copying every line item, the tax
and the total. Marks the quote `accepted`.

---

## Invoices

### `GET /api/invoices`

Query: `status`, `search` (number, client name, company).

### `POST /api/invoices` — *member*

```json
{
  "client_id": "c_...",
  "issue_date": "2026-10-01",
  "due_date": "2026-10-15",
  "notes": "",
  "terms": "Payment due within 14 days.",
  "discount": 0,
  "recurring_rule": "",
  "items": [
    { "description": "Design work", "qty": 2, "unit_price": 50000, "tax_rate": 10, "product_id": null }
  ]
}
```

`recurring_rule`: `''` | `weekly` | `monthly` | `quarterly` | `yearly`.

### `GET /api/invoices/:id`

Returns `{ invoice, items, payments, reminders, client }`.

### `PATCH /api/invoices/:id` — *member*

### `DELETE /api/invoices/:id` — *member*

### `POST /api/invoices/:id/send` — *member*

Sets `sent_at` and moves a `draft` invoice to `sent`.

### `POST /api/invoices/:id/payments` — *member*

```json
{ "amount": 30000, "method": "bank", "reference": "TXN-001", "note": "", "paid_at": "2026-10-20T10:00:00Z" }
```

`method`: `cash` | `card` | `bank` | `mobile` | `other`.

The invoice status and balance are recalculated automatically.

### `DELETE /api/payments/:id` — *member*

Reverses a payment and recalculates the invoice.

### `POST /api/invoices/:id/remind` — *member*

```json
{ "channel": "whatsapp", "message": "" }
```

`channel`: `email` | `sms` | `whatsapp`.

Generates the message from the workspace template when `message` is omitted,
logs the reminder against the invoice and returns it.

Template placeholders: `{{client}}`, `{{number}}`, `{{amount}}`, `{{due}}`,
`{{link}}`, `{{business}}`.

---

## Recurring billing

### `GET /api/recurring`

Every invoice with a non-empty `recurring_rule`.

### `POST /api/recurring/:id/run` — *member*

Generates the next invoice from the schedule, copies the line items, assigns a
new number and reschedules the source invoice.

---

## Expenses

### `GET /api/expenses`

### `POST /api/expenses` — *member*

```json
{ "category": "software", "vendor": "Figma", "amount": 4500, "expense_date": "2026-10-01", "note": "" }
```

### `PATCH /api/expenses/:id` — *member*

### `DELETE /api/expenses/:id` — *member*

---

## Reporting

### `GET /api/dashboard`

```json
{
  "revenueThisMonth": 417725,
  "outstanding": 1129485,
  "overdue": 298375,
  "expensesThisMonth": 307900,
  "netThisMonth": 103926,
  "invoiceCount": 15,
  "clientCount": 7,
  "collectionRate": 100,
  "monthly": [ { "month": "2026-07", "revenue": 420000 } ],
  "aging": [ { "client_name": "...", "number": "INV-1422", "due_date": "...", "amount": 103075, "days_overdue": 33 } ],
  "topClients": [ { "client_name": "...", "client_company": "...", "revenue": 800000 } ],
  "recent": [ ... ],
  "pipeline": [ { "status": "sent", "count": 1, "amount": 802900 } ],
  "expenseByCategory": [ { "category": "contractors", "amount": 180000 } ],
  "currency": "USD",
  "locale": "en-US"
}
```

### `GET /api/reports/cashflow`

Revenue, expenses and net per month.

### `GET /api/reports/invoice-velocity`

Every invoice issued in the last 180 days with `days_to_pay`.

---

## Export

### `GET /api/export/:kind.csv`

`kind` ∈ `invoices` · `clients` · `expenses` · `payments`.

Returns `text/csv` with a `Content-Disposition` attachment header.

---

## Error format

```json
{ "error": "This action requires the admin role", "required_role": "admin", "your_role": "member" }
```
