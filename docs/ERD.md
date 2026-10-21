# Data Model — ERD

SQLite, accessed through Node's built-in `node:sqlite` module. No ORM, no
migration framework — the schema is applied idempotently on boot and mirrored
in `database/schema.sql`.

---

## Entity relationships

```
┌───────────────┐         ┌────────────────────┐
│     users     │         │    businesses      │
│───────────────│         │────────────────────│
│ id        PK  │         │ id             PK  │
│ email     UQ  │         │ name               │
│ name          │         │ currency           │
│ password_hash │         │ locale             │
│ created_at    │         │ timezone           │
└───────┬───────┘         │ brand_color        │
        │                 │ accent_color       │
        │                 │ logo_text          │
        │  N:M            │ invoice_prefix     │
        │ (via            │ quote_prefix       │
        │  memberships)   │ next_invoice_seq   │
        │                 │ next_quote_seq     │
        │                 │ default_tax        │
        │                 │ default_terms      │
        │                 │ reminder_template  │
        │                 │ created_at         │
        │                 └─────────┬──────────┘
        │                           │
        │            ┌──────────────┼───────────────┐
        │            │              │               │
        ▼            ▼              ▼               ▼
┌───────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────────┐
│  memberships  │ │  clients   │ │products │ │   expenses   │
│───────────────│ │────────────│ │─────────│ │──────────────│
│ user_id    FK │ │ id     PK  │ │ id  PK  │ │ id       PK  │
│ business_id FK│ │ business_id│ │business │ │ business_id  │
│ role         │ │ name       │ │ _id     │ │ category     │
│ created_at   │ │ company    │ │ name    │ │ vendor       │
└───────────────┘ │ email      │ │ descr.  │ │ amount       │
                  │ phone      │ │ unit_   │ │ expense_date │
┌───────────────┐ │ address    │ │  price  │ │ note         │
│    sessions   │ │ notes      │ │ unit    │ │ created_at   │
│───────────────│ │ status     │ │ tax_rate│ └──────────────┘
│ token     PK  │ │ portal_    │ │ active  │
│ user_id    FK │ │  token UQ  │ │created_ │
│ business_id  │ │ created_at │ │   at    │
│ expires_at    │ └─────┬──────┘ └─────────┘
└───────────────┘       │
                        │ 1:N
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌────────────┐   ┌───────────┐
   │ quotes  │    │  invoices  │   │ reminders │
   │─────────│    │────────────│   │───────────│
   │ id  PK  │    │ id     PK  │   │ id    PK  │
   │ business│    │ business_id│   │ invoice_id│
   │ client_id│    │ client_id │   │ channel   │
   │ number  │    │ quote_id  │   │ message   │
   │ status  │    │ number    │   │ sent_at   │
   │ issue_  │    │ status    │   │ created_at│
   │  date   │    │ issue_date│   └───────────┘
   │ valid_  │    │ due_date  │
   │  until  │    │ notes     │   ┌───────────┐
   │ notes   │    │ terms     │   │ payments  │
   │ subtotal│    │ subtotal  │   │───────────│
   │ tax_total│   │ discount  │   │ id    PK  │
   │ total   │    │ tax_total │   │ invoice_id│
   │ created_│    │ total     │   │ business_id│
   │   at    │    │ paid_amt  │   │ amount    │
   └────┬────┘    │ recurring │   │ method    │
        │         │  _rule    │   │ reference │
        │ 1:N     │ next_     │   │ note      │
        ▼         │  inv_date │   │ paid_at   │
┌───────────────┐ │ sent_at   │   │ created_at│
│  quote_items  │ │ paid_at   │   └───────────┘
│───────────────│ │ created_at │
│ id        PK  │ └─────┬─────┘
│ quote_id   FK │       │ 1:N
│ product_id FK │       ▼
│ description   │ ┌───────────────┐
│ qty           │ │ invoice_items │
│ unit_price    │ │───────────────│
│ tax_rate      │ │ id        PK  │
│ position      │ │ invoice_id FK │
└───────────────┘ │ product_id FK │
                  │ description   │
                  │ qty           │
                  │ unit_price    │
                  │ tax_rate      │
                  │ position      │
                  └───────────────┘
```

---

## Table reference

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `u_` prefix |
| `email` | TEXT | UNIQUE |
| `name` | TEXT | |
| `password_hash` | TEXT | `salt:hash` — scrypt, 64-byte key |
| `created_at` | TEXT | ISO-8601 |

### `businesses`

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT | | PK, `b_` prefix |
| `name` | TEXT | | |
| `currency` | TEXT | `USD` | ISO 4217 |
| `locale` | TEXT | `en-US` | |
| `timezone` | TEXT | `UTC` | |
| `brand_color` | TEXT | `#1E3A5F` | |
| `accent_color` | TEXT | `#059669` | |
| `logo_text` | TEXT | `''` | Up to 3 characters |
| `invoice_prefix` | TEXT | `INV` | |
| `quote_prefix` | TEXT | `QUO` | |
| `next_invoice_seq` | INTEGER | `1001` | Atomic counter |
| `next_quote_seq` | INTEGER | `1001` | Atomic counter |
| `default_tax` | REAL | `0` | Percent |
| `default_terms` | TEXT | | |
| `reminder_template` | TEXT | | Supports `{{placeholders}}` |
| `created_at` | TEXT | | |

### `memberships`

Composite PK `(user_id, business_id)`.

| Column | Type | Notes |
|---|---|---|
| `user_id` | TEXT | FK → `users`, cascade delete |
| `business_id` | TEXT | FK → `businesses`, cascade delete |
| `role` | TEXT | `owner` \| `admin` \| `member` \| `viewer` |
| `created_at` | TEXT | |

### `clients`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `c_` prefix |
| `business_id` | TEXT | FK → `businesses`, cascade delete |
| `name` | TEXT | Required |
| `company` | TEXT | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `address` | TEXT | |
| `notes` | TEXT | |
| `status` | TEXT | `active` \| `lead` \| `archived` |
| `portal_token` | TEXT | UNIQUE, `p_` prefix — the portal credential |
| `created_at` | TEXT | |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `pr_` prefix |
| `business_id` | TEXT | FK, cascade delete |
| `name` | TEXT | Required |
| `description` | TEXT | |
| `unit_price` | INTEGER | **Cents** |
| `unit` | TEXT | `project`, `month`, `hour`, … |
| `tax_rate` | REAL | Percent |
| `active` | INTEGER | 0 = archived (soft delete) |
| `created_at` | TEXT | |

### `quotes` / `quote_items`

| Column | Type | Notes |
|---|---|---|
| `quotes.id` | TEXT | PK, `qt_` prefix |
| `quotes.business_id` | TEXT | FK, cascade delete |
| `quotes.client_id` | TEXT | FK → `clients`, cascade delete |
| `quotes.number` | TEXT | e.g. `QUO-1001` |
| `quotes.status` | TEXT | `draft` \| `sent` \| `accepted` \| `declined` \| `expired` |
| `quotes.issue_date` | TEXT | `YYYY-MM-DD` |
| `quotes.valid_until` | TEXT | `YYYY-MM-DD` |
| `quotes.subtotal` | INTEGER | Cents, computed |
| `quotes.tax_total` | INTEGER | Cents, computed |
| `quotes.total` | INTEGER | Cents, computed |
| `quote_items.id` | TEXT | PK, `qi_` prefix |
| `quote_items.quote_id` | TEXT | FK, cascade delete |
| `quote_items.product_id` | TEXT | FK → `products`, nullable |
| `quote_items.description` | TEXT | |
| `quote_items.qty` | REAL | Decimal quantities supported |
| `quote_items.unit_price` | INTEGER | Cents |
| `quote_items.tax_rate` | REAL | Percent |
| `quote_items.position` | INTEGER | Display order |

### `invoices` / `invoice_items`

| Column | Type | Notes |
|---|---|---|
| `invoices.id` | TEXT | PK, `iv_` prefix |
| `invoices.business_id` | TEXT | FK, cascade delete |
| `invoices.client_id` | TEXT | FK → `clients`, cascade delete |
| `invoices.quote_id` | TEXT | FK → `quotes`, nullable |
| `invoices.number` | TEXT | e.g. `INV-1001` |
| `invoices.status` | TEXT | `draft` \| `sent` \| `partial` \| `paid` \| `overdue` \| `cancelled` |
| `invoices.issue_date` | TEXT | `YYYY-MM-DD` |
| `invoices.due_date` | TEXT | `YYYY-MM-DD` |
| `invoices.subtotal` | INTEGER | Cents, computed |
| `invoices.discount` | INTEGER | Cents |
| `invoices.tax_total` | INTEGER | Cents, computed |
| `invoices.total` | INTEGER | Cents, computed |
| `invoices.paid_amount` | INTEGER | Cents, sum of `payments` |
| `invoices.recurring_rule` | TEXT | `''` \| `weekly` \| `monthly` \| `quarterly` \| `yearly` |
| `invoices.next_invoice_date` | TEXT | `YYYY-MM-DD`, nullable |
| `invoices.sent_at` | TEXT | ISO-8601, nullable |
| `invoices.paid_at` | TEXT | ISO-8601, nullable |
| `invoices.created_at` | TEXT | ISO-8601 |

`invoice_items` mirrors `quote_items` with `invoice_id` instead of `quote_id`.

### `payments`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `pay_` prefix |
| `invoice_id` | TEXT | FK → `invoices`, cascade delete |
| `business_id` | TEXT | FK, cascade delete |
| `amount` | INTEGER | Cents |
| `method` | TEXT | `cash` \| `card` \| `bank` \| `mobile` \| `other` |
| `reference` | TEXT | Transaction reference |
| `note` | TEXT | |
| `paid_at` | TEXT | ISO-8601 |
| `created_at` | TEXT | ISO-8601 |

### `expenses`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `ex_` prefix |
| `business_id` | TEXT | FK, cascade delete |
| `category` | TEXT | `software`, `contractors`, `marketing`, `office`, `travel`, … |
| `vendor` | TEXT | |
| `amount` | INTEGER | Cents |
| `expense_date` | TEXT | `YYYY-MM-DD` |
| `note` | TEXT | |
| `created_at` | TEXT | ISO-8601 |

### `reminders`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT | PK, `rm_` prefix |
| `invoice_id` | TEXT | FK → `invoices`, cascade delete |
| `channel` | TEXT | `email` \| `sms` \| `whatsapp` |
| `message` | TEXT | The generated message |
| `sent_at` | TEXT | ISO-8601 |
| `created_at` | TEXT | ISO-8601 |

### `sessions`

| Column | Type | Notes |
|---|---|---|
| `token` | TEXT | PK, `s_` prefix — the cookie value |
| `user_id` | TEXT | FK → `users`, cascade delete |
| `business_id` | TEXT | FK → `businesses`, cascade delete, nullable |
| `expires_at` | TEXT | ISO-8601 |
| `created_at` | TEXT | ISO-8601 |

---

## Conventions

- **All primary keys are TEXT** with a short type prefix (`u_`, `b_`, `c_`,
  `iv_`, `pay_`, …) generated from 9 random bytes, base64url-encoded.
- **All money is stored as integer cents.** `REAL` is used only for tax
  percentages and decimal quantities.
- **Dates** that identify a calendar day are `YYYY-MM-DD`. Instants are
  ISO-8601 UTC strings.
- **Foreign keys cascade on delete.** Deleting a client removes their invoices,
  quotes and line items.
- **Indexes** exist on `invoices.business_id`, `invoice_items.invoice_id`,
  `quote_items.quote_id`, `payments.invoice_id` and `clients.business_id`.

---

## Regenerating the SQL files

`database/schema.sql` and `database/seed.sql` are exported from the live
database so they can never drift from the running application:

```bash
node scripts/export-sql.js
```

Run it after changing the schema in `server/src/db.js`, and commit the
regenerated files.
