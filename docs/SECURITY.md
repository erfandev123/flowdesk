# Security Model

How Flowdesk authenticates requests and enforces permissions.

---

## 1. Password storage

- Passwords are hashed with **scrypt** using Node's built-in `crypto` module —
  no native dependencies.
- Each password gets a **16-byte random salt**.
- The derived key is 64 bytes.
- Storage format: `salt:hexDerivedKey`.
- Verification uses `timingSafeEqual`, so a comparison cannot leak timing
  information.
- Plaintext passwords are never stored, logged or returned by any endpoint.

`server/src/db.js`:

```js
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}
```

---

## 2. Sessions

- On sign-in a random 32-byte token is generated and stored in `sessions`.
- The token is delivered as an **HTTP-only, SameSite=Lax** cookie named
  `fd_session`.
- Sessions expire after **30 days** and are checked on every request.
- Expired or revoked sessions are deleted server-side.
- Sign-out destroys the row and clears the cookie.
- The token is never returned in a response body — the client only ever sees
  the user object.

Because the cookie is HTTP-only, client-side JavaScript cannot read it, which
removes the token-exfiltration risk of a `localStorage` approach.

---

## 3. The request pipeline

Every business endpoint passes through three guards, in order.

### `requireAuth`

Resolves the `fd_session` cookie to a user. Responds `401` when absent or
expired.

### `requireBusiness`

1. Resolves the workspace from the `x-business-id` header, falling back to the
   session's active workspace.
2. Responds `400` when no workspace is selected.
3. Responds `404` when the workspace does not exist **or** the user is not a
   member of it. A `404` rather than a `403` avoids confirming whether a
   given workspace id exists.
4. Attaches `req.user`, `req.business`, `req.businessId` and `req.member`.

### `requireRole(...)`

Compares `req.member.role` against a minimum level.

```
owner (4) > admin (3) > member (2) > viewer (1)
```

Responds `403` with the required and current roles when the caller is below
the threshold.

---

## 4. Role matrix

| Capability | viewer | member | admin | owner |
|---|:---:|:---:|:---:|:---:|
| Read dashboard, reports, CSV export | ✅ | ✅ | ✅ | ✅ |
| Read clients, quotes, invoices, expenses | ✅ | ✅ | ✅ | ✅ |
| Create / edit / delete clients | ❌ | ✅ | ✅ | ✅ |
| Rotate a client portal token | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete catalog items | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete quotes | ❌ | ✅ | ✅ | ✅ |
| Convert a quote into an invoice | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete invoices | ❌ | ✅ | ✅ | ✅ |
| Mark an invoice as sent | ❌ | ✅ | ✅ | ✅ |
| Record / reverse payments | ❌ | ✅ | ✅ | ✅ |
| Generate a payment reminder | ❌ | ✅ | ✅ | ✅ |
| Generate the next recurring invoice | ❌ | ✅ | ✅ | ✅ |
| Create / edit / delete expenses | ❌ | ✅ | ✅ | ✅ |
| Change workspace settings and branding | ❌ | ❌ | ✅ | ✅ |
| Invite, re-role or remove team members | ❌ | ❌ | ✅ | ✅ |
| Change the owner's role | ❌ | ❌ | ❌ | ❌ |
| Remove the workspace owner | ❌ | ❌ | ❌ | ❌ |

Enforcement is in code, not in the UI. Hiding a button in the interface is
never the only protection — the API rejects the request with `403` regardless
of what the client sends.

---

## 5. Multi-tenant isolation

A workspace is the unit of data ownership. Every table that holds business
data carries a `business_id`, and **every query filters on it**. There is no
code path that reads a business table without scoping to the resolved
workspace.

Two independent layers protect the boundary:

1. **Membership check** — `requireBusiness` verifies the caller belongs to the
   workspace before any query runs.
2. **Query scoping** — even if a business id were somehow obtained, the
   filtered query returns nothing for a non-member.

Verified behaviour:

| Attempt | Response |
|---|---|
| No session cookie | `401 Not authenticated` |
| Valid session, unknown `x-business-id` | `404 Not found` |
| Valid session, workspace the user does not belong to | `403 Access denied` |
| Viewer attempting any write | `403` with `required_role` and `your_role` |
| Member attempting a settings or team change | `403` |

---

## 6. Public endpoints

Four endpoints do not require a session. They are intentional and each is
either side-effect-free or scoped by an unguessable credential.

| Endpoint | Why it is public | Containment |
|---|---|---|
| `GET /api/health` | Monitoring probe | Returns no business data |
| `POST /api/auth/register` | Sign-up | Creates a *new isolated* workspace — it cannot read or modify existing data |
| `POST /api/auth/login` | Sign-in | Requires a valid password |
| `POST /api/auth/logout` | Sign-out | Requires the caller's own cookie |
| `GET /api/portal/:token` | Client portal | Scoped to one client by a 12-character random token |
| `POST /api/portal/:token/pay/:invoiceId` | Client pays their own invoice | Scoped to one client and one invoice; can only add a payment, never modify the invoice |

**Portal token strength.** Tokens are 9 random bytes, base64url-encoded —
roughly 12 characters from a 64-character alphabet, giving about 72 bits of
entropy. They are not guessable and are not enumerable. A token can be
rotated at any time from the client detail page, which invalidates the old
link immediately.

---

## 7. Input handling

- Every request body passes through a typed reader that rejects non-objects.
- All strings are coerced and **truncated to a maximum length** before use —
  names to 160 characters, notes to 2000, free text to 4000.
- All numeric input is coerced with `Number()` and checked with
  `Number.isFinite`, so `NaN` and `Infinity` cannot reach the database.
- Booleans accept only `true`, `1`, `"1"` and `"true"`.
- Enumerated fields are validated against an allow-list with a safe fallback;
  an unknown status never reaches the database.
- **All SQL uses prepared statements with bound parameters.** No user input is
  ever concatenated into a query string.

---

## 8. XSS and injection

- The frontend is React. Values are rendered as text, never as raw HTML, so
  user-supplied content cannot inject markup.
- The one place a user-supplied string becomes markup is the invoice
  description, and it goes through React's escaping as well.
- No `dangerouslySetInnerHTML` is used anywhere in the codebase.
- SQL injection is prevented by bound parameters throughout.

---

## 9. Transport and headers

- In production the app should sit behind nginx with a TLS certificate. The
  configuration is in `HowToSetup.md`.
- The session cookie is `httpOnly` and `sameSite=lax`. Setting `secure` is
  recommended once HTTPS is in place.
- The reverse proxy should forward `X-Forwarded-Proto` so the app can detect
  HTTPS.

---

## 10. Known limitations

These are deliberate trade-offs, listed for honesty:

- **Session tokens are stored in plaintext in the database.** A database leak
  therefore exposes live sessions. Hashing the token before storage would close
  this at the cost of one extra hash lookup per request.
- **There is no rate limiting** on the login endpoint. Add a reverse-proxy
  limit or a library such as `express-rate-limit` before exposing the service
  publicly.
- **No two-factor authentication.**
- **No CSRF token.** The `SameSite=Lax` cookie prevents cross-site form
  submissions in modern browsers, and every mutating endpoint uses JSON
  bodies with a non-simple content type, but an explicit token would be
  stronger for older browsers.
- **No audit log.** Role changes, settings changes and deletions are not
  recorded.
- **Portal tokens do not expire.** Rotate them if a link leaks.

---

## 11. Deployment checklist

- [ ] Change or delete the demo account (`demo@flowdesk.app`)
- [ ] Delete the seeded demo data
- [ ] HTTPS is configured and the cookie is served over TLS
- [ ] `DATA_DIR` points at a backed-up volume
- [ ] The database file is not reachable from the web root
- [ ] The reverse proxy forwards `X-Forwarded-Proto`
- [ ] Rate limiting is in place on `/api/auth/login`
- [ ] You know where your backups live and have tested a restore
