# Backend blueprint — what Praxis needs, read off ECCLESIA

**This document was rewritten against a system that exists.** The previous revision was inference —
a data model, auth story and offline story reasoned out from what the mockup implies. It has been
replaced by the architecture of **ECCLESIA ChMS** (`MaxBlessNgugi/ecclesia-church-management-system`),
a working parish system: React 19 + Vite + Tailwind 4 frontend, Express + Prisma + PostgreSQL backend,
Socket.IO realtime, Docker deployment. Where Praxis and ECCLESIA disagree, this document says which
one is right and why.

Read it as: *what Praxis has to grow into, and the exact shape of the thing it grows into.*

**Decision: Praxis's backend ports this system rather than being re-derived from a proposal.** A
separately drafted backend blueprint describing the same Express/Prisma/Postgres stack, a fresh
24-model schema and a `{ success, data, message, meta }` envelope was reconciled against this document
in `docs/frontend-blueprint.md` §4 — the envelope in particular contradicts the live `API.md` contract
that `src/services/api.ts` matches 1:1, and the schema would be the third derivation of ECCLESIA's 28
real models.

---

## 1. The stack, as actually deployed

| Layer | ECCLESIA | Praxis today |
| --- | --- | --- |
| Frontend | React 19, Vite 6, Tailwind 4, TS, `vite-plugin-pwa` | same four, no PWA |
| Client data | `src/services/api.ts` (1 dispatch layer), React context per domain | `src/data/demoStore.tsx`, in-memory + localStorage |
| Auth | `bcryptjs` cost 12, HS256 JWT, `JWT_EXPIRES_IN` (default `7d`) | none — the sign-in screen accepts anything |
| Authorisation | `requireModule(panel)` middleware + `User.panels` / `User.actions` JSON | none |
| API | Express routers per panel, `API.md` as the written contract | none — zero `fetch` calls in `src/` |
| Database | PostgreSQL via Prisma (28 models) | mock arrays |
| Money | Prisma `Decimal`, converted at the JSON boundary (`toNum`) | `number`, formatted for display |
| Realtime | Socket.IO server + `socket.io-client`, events in `lib/events.ts` | none |
| SMS | Africa's Talking (`sandbox` username by default) | decorative "sent to 412 recipients" |
| Email | nodemailer, SMTP from DB settings (password encrypted) or env | none |
| Mobile money | M-Pesa Daraja push (`PushPaymentSettings`) | none |
| Backups | `pg_dump` snapshots, `BACKUP_KEEP` = 14, scheduled | none |
| Deployment | Docker + docker-compose + Caddyfile, served on the parish LAN as `ecclesia.local` | GitHub Pages, static |

The single most important line in that table: **ECCLESIA is not an offline-first app.** It is a
LAN-first app. One computer in the parish office runs the server; everyone else browses to it. When
the server is unreachable the UI says so — see §6 — and does not pretend otherwise.

That contradicts the previous revision of this document, which designed an append-only operation log
so a phone could keep recording gifts with no server. That design is still a reasonable ambition, but
it is *not* what the reference implementation does, and presenting it as the plan was the kind of
guess this revision exists to remove.

---

## 2. Data model — the 28 real models

ECCLESIA's `backend/prisma/schema.prisma` is the authoritative data model. Grouped by what they are:

**Identity and access**

- `User` — staff login. Carries `role`, plus `panels` and `actions` JSON columns that *override* the
  global defaults per user, and lockout state: `loginFailedAttempts`, `lockedUntil`,
  `resetFailedAttempts`, last-active timestamp.
- `PanelPermissions` — a singleton row holding the *default* panel/action rights new users inherit.

**People**

- `Christian` — the member register. `regNo`, `nationalId`, baptismal/second/sir name, phone,
  diocese → parish → local church → SCC (small Christian community), `status`, and four sacrament
  sub-objects (`baptism`, `eucharist`, `confirmation`, `marriage`) each `{date, minister, place}`.
- `Transfer` — a member moving between parishes.
- `Death` — place and date of death, date of burial, minister, remarks.

**Giving**

- `Contribution` — one payment. `categories[]`, `monthlyTracker` (a JAN…DEC boolean map used to mark
  which months a pledge covers), `amountKES`, date, and the member link.
- `BilledItem` — a fee-bearing receipt (certificates, and walk-in as well as member sales): unit fee,
  quantity, total.

**Finance**

- `Deposit` — banking of collections: bank, account, source of cash, reference, who banked it.
- `Creditor` / `Debtor` — money owed out and owed in, with partial-payment history on debtors.
- `Expense` — category, description, amount, payment method, voucher number.

**Inventory**

- `InventoryItem` (`sku`, `cost`, `price`, `stock`, `reorder`) plus the movement trail that makes a
  stock figure trustworthy: `Delivery` (goods in), `Sale`, `StockTake` (system vs physical count,
  with a route to record only the physical number), `StockIssue` (internal transfer out), and
  `InventoryPriceAuditLog` (every cost/price change).

**Employment**

- `Employee` (server derives the staff `code` and display name from the onboarding input),
  `EmployeeDocument`, `Payroll`, `Leave`, `Recruitment`, `RecruitmentApplicant`.

**Settings and trail**

- `ParishSettings` (name, local church, diocese, address, phone, email, logo, motto),
  `MailSettings`, `SmsSettings`, `PushPaymentSettings` (paybill, account format, consumer key/secret,
  test phone/amount), `AuditLog`.

Three conventions worth copying outright:

1. **Money is `Decimal`, never float** — converted to a plain number only at the JSON edge
   (`backend/src/lib/decimal.ts`, plus a `decimalJson` middleware). If Praxis ships a real backend
   with `number` columns, rounding errors will surface in the giving ledger first.
2. **Deletion is soft, and reversible from the log.** `AuditLog` records `entityName`, `entityId` and
   an `AuditAction` of `DELETE` or `RESTORE`; `SOFT_DELETABLE_MODELS` lists what may be deleted this
   way, and `restoreFromLog(logId)` undoes one. Praxis's Trash concept (archive/restore in the demo
   store) is a mockup of exactly this mechanism.
3. **Enums, not free strings** — `ChristianStatus` (`Active | Transferred | Deceased | Inactive`),
   `CreditorStatus` (`Pending | Overdue | Scheduled | Paid`), `PayrollStatus`, `LeaveStatus`,
   `RecruitmentApplicantStatus`, `UserRole` (`super_admin | admin | staff | viewer`).

### Mapping Praxis's ten sections onto the real schema

| Praxis section | ECCLESIA models | ECCLESIA endpoints |
| --- | --- | --- |
| Home | `DashboardSummary` aggregate | `GET /api/dashboard/summary` |
| Members & Believers | `Christian`, `Transfer`, `Death` | `/api/christians`, `/api/transfers`, `/api/deaths` |
| Services & Worship | *(no equivalent)* | — |
| Church Council | *(no equivalent)* | — |
| Giving & Stewardship | `Contribution`, `BilledItem`, `Deposit` | `/api/contributions`, `/api/billed-items`, `/api/deposits` |
| Inventory & Assets | `InventoryItem`, `StockTake` | `/api/inventory/items`, `/api/inventory/stock-takes` |
| Groups & Fellowships | *(no equivalent)* | — |
| Reports & Certs | report row shapes, `BilledItem` | `/api/reports/{sacraments,contributions,sales,cashiers}` |
| Communications | `SmsSettings`, `MailSettings` | *(sends only; no campaigns)* |
| Settings & Profile | `ParishSettings`, `MailSettings`, `SmsSettings` | `/api/parish`, `/api/admin/*` |
| Admin Portal | `User`, `PanelPermissions`, `AuditLog` | `/api/admin/rights`, `/api/admin/push-payments` |

Two honest gaps run both ways. ECCLESIA has **no Services/Worship, no Church Council and no Groups**
module — its panels are `christian, activities, sacraments, finance, ledgers, inventory, reports, hr,
administration`. So three of the mockup's sections describe screens that the reference system does not
have; if Praxis is going to be the blueprint for ECCLESIA, those three are new work on the *backend*
side, not just the frontend. Conversely ECCLESIA has three areas the mockup had nothing for —
**Ledgers, Inventory and HR/Payroll**. Inventory is now built (the console's Inventory & Assets
section reads ECCLESIA's own field names, `sku / cost / price / stock / reorder`, and records a
physical count against the line it counted); Ledgers and HR/Payroll remain the largest gaps (§7).

---

## 3. Authentication

What ECCLESIA does, precisely (`backend/src/lib/auth.ts`, `backend/src/routes/auth.ts`):

- **Passwords**: bcrypt, cost factor **12**, hashed through one module — nothing else in the codebase
  calls bcrypt directly.
- **Sessions**: HS256 JWT signed with `JWT_SECRET`, `expiresIn` from `JWT_EXPIRES_IN`, defaulting to
  **7 days**. Sent as `Authorization: Bearer <token>`.
- **Lockout**: failed logins are counted per account; at `MAX_LOGIN_ATTEMPTS` the account is locked
  for **15 minutes** (`423 Locked`). Failed *password reset* attempts are counted and locked the same
  way. Rate limiting sits in front of `/login` as a separate concern.
- **First run**: `/auth/bootstrap-status` and `/auth/bootstrap` exist so a fresh install can create its
  first administrator without a seeded password. `/auth/register` requires an authenticated user —
  there is no self-signup.
- **Identity**: `/auth/me` returns the user plus resolved permissions.

What Praxis shows instead: a sign-in screen whose button always succeeds after a 1.4s animation. That
is correct for a mockup and must be labelled as such anywhere it is shown to a stranger.

**Not yet designed in either system**: real multi-factor authentication, and session revocation
(a 7-day JWT cannot be withdrawn before it expires unless a denylist is added).

---

## 4. Authorisation — six roles are not needed; panels and actions are

This is the part of the previous revision that was closest to right, and ECCLESIA implements it in the
simplest possible way. There is no fifty-role matrix. There is:

1. **Seven panel keys** — `christian`, `activities`, `sacraments`, `finance`, `ledgers`, `inventory`,
   `reports`, `hr`, `administration`.
2. **Three actions** — `view`, `edit`, `delete`.
3. **Four roles** — `super_admin`, `admin`, `staff`, `viewer`.

Resolution order, identical on both sides of the wire (`backend/src/middleware/perms.ts` and
`src/permissions.tsx`):

```
super_admin                                  → full access, always (never lock out the owner)
global defaults (PanelPermissions singleton)  → baseline for everyone
user overrides (User.panels / User.actions)   → merged over the baseline
missing field                                 → falls back to the baseline (partial payloads stay permissive)
```

Enforcement is a middleware: `requireModule('finance')` mounted per router, refusing with `403` when
the panel is `false` or the action is `false`. The frontend mirrors it through a `PermissionsContext`
exposing `canView(panel) / canEdit(panel) / canDelete(panel)` so write controls are hidden rather than
offered and then refused. A missing provider falls back to **full access**, deliberately, so an
isolated render never breaks.

What this means for Praxis: the mockup's own role story should be built on this mechanism — same
panel/action shape, same resolution order — with panel keys naming Praxis's sections. That is the
harvest now in progress in the app; see `src/lib/permissions.tsx`.

---

## 5. The API contract

`API.md` is the written contract and `src/services/api.ts` is the client that matches it 1:1. The
conventions are conventional and worth keeping exactly:

- JSON in, JSON out; mutations return the created/updated resource (`201` create, `200` update);
  `DELETE` returns `204`.
- Errors are `{ "error": "human readable message" }`.
- IDs are server-generated UUIDs; a client may propose one on create.
- List endpoints take filters as query params (`?status=Active&q=Maria`).

Beyond CRUD, the endpoints that carry real design weight:

| Endpoint | Why it matters |
| --- | --- |
| `POST /api/ledgers/transfer` | Moves money between ledgers and **returns 422 on insufficient balance** — the balance is validated server-side, not in the UI |
| `POST /api/debtors/:id/payments` | Partial repayment reduces the balance and recomputes status |
| `PATCH /api/creditors/:id/paid` | A dedicated transition endpoint instead of a general update |
| `PATCH /api/christians/:id/sacraments` | Narrow write path so a sacrament edit cannot clobber the rest of the record |
| `DELETE /api/christians/:id` | Soft-delete: sets `status: "Inactive"` and writes an `AuditLog` row |
| `PATCH /api/inventory/stock-takes/:id/physical` | Records only the counted number, leaving the system figure intact for comparison |
| `GET /api/dashboard/summary` | One aggregate call for the home screen — active and total members, deposits, expenses, pending creditors, outstanding debtors, low-stock items, employees, plus recent deposits and expenses |

**Idempotency** is handled by `X-Idempotency-Key` (`backend/src/middleware/idempotency.ts`): an
optional header on `POST`; re-sending the same key inside a **24-hour** window returns the cached
response instead of creating a second record. That is the correct answer to the retry problem, and it
is one header rather than a distributed-transaction design. Note the current cache is an in-memory
`Map`, so it does not survive a restart and would need Redis for more than one server process.

---

## 6. Offline, connectivity and realtime — what the real system does

The previous revision invented an offline-first sync engine. ECCLESIA's actual answer is much smaller
and much more honest (`src/context/OfflineContext.tsx`):

- The client polls `GET /health` **every 20 seconds**, with a 5-second abort timeout, and also listens
  to the browser's `online`/`offline` events for instant changes.
- The result is a single `status: 'online' | 'offline'` in a context, rendered as a badge in the
  header and sidebar. The app does **not** queue writes; it surfaces the connection state so staff know
  whether what they just did reached the server.

Realtime is Socket.IO: the server emits domain events (`backend/src/lib/events.ts`) and clients
subscribe, so two people working in the parish office see each other's changes without refreshing.

Two deliberate non-features to be clear about:

- **No offline write queue.** A Sunday morning with the server down means no records until it is back.
  Given the deployment is one LAN server, that is a defensible trade — but it should be a *chosen*
  trade, documented, and revisited before anyone relies on a phone in a hall with no signal.
- **No conflict resolution**, because there is no offline mutation path to conflict. If a queue is
  added later, the receipt-numbering problem returns with it: numbering must be allocated in
  server-side blocks, because two devices minting "next number" independently produce two receipts
  with the same number, which in a giving ledger is an audit failure rather than a cosmetic bug.

---

## 7. What the mockup is still hiding

The gaps that remain true after grounding this document:

1. **No network layer at all.** Zero `fetch` in the mockup's `src/`. Every "connected", "DKIM
   verified", Twilio/Africa's Talking claim and "sent to N recipients" is decoration. This is the
   single largest distance between the mockup and ECCLESIA.
2. **Money is float.** ECCLESIA stores `Decimal` and converts at the edge. The mockup adds, sums and
   formats plain numbers — fine for a demo, wrong the moment it is a ledger of record.
3. **No per-device identity, no audit trail, no recovery.** ECCLESIA has `AuditLog`, soft delete with
   `restoreFromLog`, and `pg_dump` snapshots keeping 14 generations, plus `backup/restore` scripts.
   Praxis has a "Reset demo data" button.
4. **Filtering happens in the browser.** ECCLESIA pushes filters to the server
   (`?status=&q=`); the mockup filters arrays in memory. At 1,200 members with several years of giving
   this stops working, which is why the mockup should not be pointed at real data as-is.
5. **Three sections still have no backend counterpart** (Services & Worship, Church Council, Groups)
   and **two backend areas still have no mockup** (Ledgers, HR/Payroll) — Inventory's screen now
   exists, but nothing behind it does.
6. **Data protection is mechanism-free.** A parish holds national ID numbers, phone numbers,
   sacramental records and children's data. ECCLESIA gives it a login, roles and a backup; it does not
   give it consent records, retention limits or an erasure path. Under Kenya's Data Protection Act
   2019 the church is a data controller, so those are obligations rather than features — and they need
   the church's own accountant and leadership to define, not an engineer's guess.

---

## 8. Integrations, as implemented

- **SMS** — Africa's Talking (`africastalking`), username defaulting to `sandbox`. Settings live in
  `SmsSettings`; credentials may also come from `AT_*` environment variables.
- **Email** — nodemailer, resolved in layers: database `MailSettings` first (with the SMTP password
  encrypted via `backend/src/lib/crypto.ts`), then `SMTP_*` environment variables. A short send
  timeout fails fast instead of hanging a request.
- **Mobile money** — M-Pesa Daraja push, configured by `PushPaymentSettings` (paybill, account number
  format, consumer key/secret, and a test phone/amount pair). Recording a contribution and pushing a
  prompt are deliberately separate.

---

## 9. Deployment

`Dockerfile` + `docker-compose.yml` + `Caddyfile`, installed to a parish machine by
`scripts/install-parish.*` with hostname setup for `ecclesia.local`. Supporting scripts:
`backend/scripts/backup.ts`, `restore.ts`, `export.ts`, `reset-admin-password.ts`,
`seed.ts`/`seed-e2e.ts`, and `scripts/support-bundle.ps1` for diagnostics. The frontend is a PWA
(`vite-plugin-pwa`), so it can be installed to a desktop shortcut — note this is *installability*,
not offline operation.

---

## 10. Build order for Praxis, revised

Phase 0 — the part that replaces the notebook, and nothing else:

1. PostgreSQL + Prisma with ECCLESIA's conventions (Decimal money, enums, soft delete + `AuditLog`).
2. Users with the four roles and the panel/action resolution of §4, enforced server-side and mirrored
   in `PermissionsContext`.
3. `/auth/*` as in §3 including the bootstrap path, because a parish install must be able to create
   its own first administrator.
4. `pg_dump` backups on a schedule with 14 generations **and one rehearsed restore**.
5. Export (CSV/Excel/print) so the church can always get its own data out.

Phase 1 — the screens ECCLESIA proves out: Christians (register, sacraments, transfers, deaths),
Contributions and Deposits, Ledgers with transfer validation, Inventory with its movement trail, HR
and Payroll, Reports.

Phase 2 — the three sections ECCLESIA lacks (Services & Worship, Church Council, Groups), which are
new backend domains rather than ports.

Phase 3 — the offline write queue with server-block receipt numbering, *if* the parish's real working
conditions justify it.

---

*Sources read for this revision: `README.md`, `API.md`, `backend/prisma/schema.prisma`,
`backend/src/lib/{auth,audit,backup,decimal,sms,mailer}.ts`, `backend/src/middleware/{perms,idempotency}.ts`,
`backend/src/routes/{auth,dashboard}.ts`, `src/{permissions.tsx,types.ts}`, `src/services/api.ts`,
`src/context/OfflineContext.tsx`, `src/utils/export.ts`, `src/components/printables/ContributionReceipt.tsx`.*
