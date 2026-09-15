# Praxis API

Express + TypeScript + Prisma + PostgreSQL. Built in the blueprint's order: **B1** foundation
(schema, seed, middleware, app/server split), **B2** authentication and user management, **B3**
members and households, **B4** Services & Worship, **B5** Finances, **B6** Communications,
Ministries, Governance, Reports, Settings and Admin.

## Deploy it to the cloud

The database (Neon), the API (Railway) and the console (Cloudflare Pages) each have a home and there
is a step-by-step runbook in [`../docs/cloud-deploy.md`](../docs/cloud-deploy.md). Locally, the
service talks to a Postgres on `localhost`; in the cloud the only differences are the two Neon
connection strings and where `JWT_SECRET` and `CORS_ORIGIN` come from.

## Run it

```bash
cd backend
cp .env.example .env          # then set DATABASE_URL and a real JWT_SECRET
npm install                   # also generates the Prisma client
npx prisma migrate deploy     # builds the schema from the checked-in prisma/migrations/
npm run seed                  # Destiny Sanctuary's departments, register, ledgers and sittings
npm run dev                   # http://localhost:4000/health
```

The dev server runs on **4000** — the console's dev server owns 3000. A scratch database is enough;
with Docker:

```bash
docker run --rm -d --name praxis-pg -e POSTGRES_PASSWORD=praxis -e POSTGRES_USER=praxis \
  -e POSTGRES_DB=praxis -p 5432:5432 postgres:16
```

**The database must be UTF8.** A Postgres initialised under a Windows locale (`English_Kenya`, say)
is WIN1252, which cannot store characters a church will eventually type — an accented name, a shilling
sign, a note pasted from a phone. Create it explicitly, or let Docker do it (the image above defaults
to UTF8):

```sql
CREATE DATABASE praxis WITH ENCODING 'UTF8' TEMPLATE template0;
```

Nothing the *application* writes depends on that, deliberately: every stored summary, audit line and
trash label uses plain ASCII punctuation, so a mis-encoded database cannot turn a payment into a 500
partway through its transaction.

**A database that already exists** — one this service was pointed at with `prisma db push` before the
migration was checked in — has the tables but no record of how it got them, so `migrate deploy` would
try to create tables that are already there. Check that it really is at the migration, then baseline
it once:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
                                              # 0 = it matches the schema, 2 = print what differs
npx prisma migrate resolve --applied 20260914151632_init
```

## Verify it

```bash
npm run typecheck                             # tsc --noEmit, strict
npx prisma validate                           # the schema parses and every relation resolves
npx prisma migrate deploy                     # applies prisma/migrations/ to an empty database
npm run seed                                  # and the seed actually writes
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code
                                              # 0 = migrations and schema agree, 2 = they have drifted
curl -s localhost:4000/health                 # {"status":"ok","database":"reachable",...}
curl -s localhost:4000/api/services           # 401 — the route exists and is guarded
npm run check:isolation                       # one church cannot reach another's records
```

`$SHADOW_DATABASE_URL` is an empty database Prisma replays the migrations into to compare them with
the schema. It has to exist first; `npx prisma db execute --url "$ADMIN_DATABASE_URL" --stdin` can
create it without a Postgres client installed, which is how CI does it.

Those steps are what CI runs on every pull request: `.github/workflows/check.yml` starts a Postgres
service container, applies `prisma/migrations/` to an empty database, seeds it, asserts the seed
wrote rows, and fails the pull request if the migrations and `schema.prisma` have drifted apart. A
fresh environment is therefore reproducible from this repository alone, and a schema change that
forgets its migration cannot merge.

`npm run check:isolation` is the odd one out: it needs a **running** API and a seeded database, so it
is a separate CI job step rather than part of the provisioning above. It creates a second church,
signs in as that church's administrator, and tries — with the API's own endpoints — to read, change,
retire and restore the first church's records, to list its Trash and its audit log, and to switch a
session into it. Every list has to come back empty rather than filtered, and every attempt has to
fail. It removes the church it provisioned even when a check fails.

The module sweep is a separate, hand-run thing — 26 end-to-end checks this pass, against a database
built by nothing but `migrate deploy` and `npm run seed`, each asserting the status and the body
rather than a bare `200`: an announcement written and found again, the celebrations window answering
for a full year (the seeded wedding anniversaries fall outside the default thirty days), the seven
departments, the leadership roster, the two sittings, a resolution drafted, filtered by stage and
voted through, the reports overview's five keys, the profile read then changed, the three preference
documents plus a write to one, and the Trash — retire, list, restore, and an audit trail holding
create, delete and restore. It needs a live seeded database, so it is evidence for a revision rather
than a gate; what CI re-proves every time is the provisioning above.

**The console is on this API for the modules the root `README.md` lists as real** — authentication,
home, members and households, announcements, events, prayer, celebrations, welfare, charity, project
funding, the finance ledger and the church profile. The rest of the console still renders sample
data, so a request in this document is still a `curl` for those.

## Endpoints

Everything is JSON, `{ data }` for one item, `{ data, meta }` for a page, `{ error, code }` for a
failure. All routes need `Authorization: Bearer <token>` except `POST /api/auth/login`.

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Users (admin) | `GET/POST /api/admin/users` · `PATCH /api/admin/users/:id` · `POST /api/admin/users/:id/role` · `DELETE /api/admin/users/:id` |
| Members | `GET/POST /api/members` · `GET/PATCH/DELETE /api/members/:id` · `POST /api/members/trash/:id/restore` |
| Households | `GET/POST /api/households` · `GET/PATCH/DELETE /api/households/:id` · `POST /api/households/:id/members` · `DELETE /api/households/:id/members/:memberId` · `POST /api/households/:id/head` |
| Services | `GET/POST /api/services` · `GET/PATCH/DELETE /api/services/:id` · `PUT /api/services/:id/liturgy` · `POST /api/services/:id/attendance` · `GET /api/services/:id/attendance` · `PUT/GET /api/services/:id/report` |
| Worship | `GET /api/services/attendance` · `GET /api/services/roster` · `POST /api/services/:id/roster` · `PATCH/DELETE /api/services/roster/duty/:id` |
| Swaps | `GET /api/services/swaps` · `POST /api/services/roster/duty/:id/swap` · `POST /api/services/swaps/:id/decision` |
| Giving | `GET/POST /api/finance/tithes` · `GET /api/finance/tithes/:id` · `GET/POST /api/finance/offerings` · `GET /api/finance/offerings/:id` |
| Projects | `GET/POST /api/finance/projects` · `GET/PATCH /api/finance/projects/:id` · `GET/POST /api/finance/projects/:id/contributions` |
| Welfare | `GET/POST /api/finance/welfare` · `GET /api/finance/welfare/:id` · `POST /api/finance/welfare/:id/decision` · `POST /api/finance/welfare/:id/disburse` |
| Charity | `GET/POST /api/finance/charity` · `GET/PATCH /api/finance/charity/:id` |
| Ledger | `GET /api/finance/summary` · `GET /api/finance/audit` · `GET /api/finance/audit/verify` · `GET /api/finance/trash` · `POST /api/finance/trash/:id/restore` |
| Voiding | `DELETE /api/finance/:entity/:id` — `entity` is one of `tithe`, `offering`, `project`, `contribution`, `welfare`, `charity` |
| Ministries | `GET/POST /api/ministries` · `GET/PATCH/DELETE /api/ministries/:id` · `GET /api/ministries/roster` · `POST /api/ministries/:id/members` · `PATCH/DELETE /api/ministries/members/:id` |
| Communications | `GET/POST /api/communications/announcements` · `GET/PATCH/DELETE /api/communications/announcements/:id` · the same five for `/broadcasts` (+ `POST /:id/send`) · `/events` · `/prayer-requests` (+ `POST /:id/answer`) · `GET /api/communications/celebrations` |
| Governance | `GET/POST /api/governance/meetings` · `GET/PATCH/DELETE /api/governance/meetings/:id` · `GET/POST /api/governance/resolutions` · `GET/PATCH/DELETE /api/governance/resolutions/:id` · `POST /api/governance/resolutions/:id/decision` · `GET/POST /api/governance/documents` · `GET/PATCH/DELETE /api/governance/documents/:id` |
| Reports | `GET /api/reports/overview` · `/members` · `/giving` · `/attendance` · `/ministries` · `/governance` — all read-only, all accepting `?from=&to=` |
| Settings | `GET/PATCH /api/settings/profile` · `GET /api/settings/preferences` · `GET/PUT /api/settings/preferences/:key` (`notifications`, `integrations`, `customization`) · `GET /api/settings/preferences/backup` |
| Admin | `GET /api/admin/trash` · `POST /api/admin/trash/:id/restore` · `GET /api/admin/audit` · `GET /api/admin/audit/:entityName/:entityId` · `GET/POST /api/admin/roles` · `GET/PATCH /api/admin/roles/:key` |

**Every retirement speaks the same language**, whichever module it belongs to:

```
DELETE /api/members/:id?reason=relocated&reasonLabel=Moved%20to%20Nakuru
```

`reason` is a category from the closed list in `lib/archive.ts` each module narrows to the reasons
that can be true of it; `reasonLabel` is the sentence a person wrote. Both are required. The answer is
always `200` with the archive row the retirement wrote. Retired records are *never* deleted — the row
stays, the archive entry is what the Trash screen reads, and a restore reads that entry rather than
the row.

Reading needs a signed-in account. Writing needs `staff` or above. Retiring a record, deciding a
swap, managing users, deciding a resolution, changing the profile and its preferences, and restoring
an archived record all need `admin`. **Changing rights needs `super_admin`**, because a role is what
grants access in the first place — an `admin` who could widen their own would make every other gate
decorative. `super_admin` is otherwise always allowed, so an owner cannot be locked out of their own
system by a rights edit; the role itself cannot be narrowed.

## Layout

```
backend/
├── prisma/
│   ├── schema.prisma     30 models, 20 enums, 37 foreign keys; money as Decimal, soft deletes
│   └── seed.ts           Destiny Sanctuary's profile, leadership, register and a season of records
└── src/
    ├── app.ts            the Express app, with no listen in it (so it can be driven in a test)
    ├── server.ts         owns the port and shuts down cleanly
    ├── config/env.ts     environment read once, validated, fails fast
    ├── schemas/          Zod: what a request may contain, per module
    │   └── common.ts     the query vocabulary: the reason, the explicit boolean, the date window
    ├── services/         the decisions and the transactions; no req/res in sight
    ├── controllers/      parse, call, respond — no rules live here
    ├── routes/           wire a path to a controller and a guard
    ├── lib/
    │   ├── prisma.ts     one client; money converted at the JSON edge
    │   ├── auth.ts       bcrypt hashing and HS256 tokens — the only file that imports either
    │   ├── financeAudit.ts   the hash-chained ledger: lock, append, verify
    │   ├── archive.ts    retirement and restoration: one rule, one reason list, one entity table
    │   ├── request.ts    the caller and the path parameter, checked once
    │   └── respond.ts    the one response shape and the one page of results
    └── middleware/
        ├── errorHandler.ts   AppError, Zod and Prisma translation, one exit
        ├── asyncHandler.ts   catches rejected promises (Express 4 does not)
        ├── notFound.ts       JSON 404 for unmatched routes
        └── authenticate.ts   re-reads the account per request; requireRole()
```

## Decisions worth knowing

**One church's rows never appear in another church's answer, and the rule has one owner.** Every
table that belongs to a church carries a non-null `organizationId` with no column default, so a write
that forgets it fails loudly instead of landing in somebody else's church. No service says which
church it is querying: `lib/prisma.ts` folds the current one into every `where` and stamps it onto
every create, reading the church from `lib/tenant.ts` — one `AsyncLocalStorage` value, set once in
`authenticate` for the whole request. Which tables are tenant-owned is read from Prisma's own model
metadata rather than a hand-written list, because a list in a source file drifts the first time
somebody adds a table. Exactly two reads are deliberately unscoped, and both are the thing that
*resolves* the tenant: the membership lookup in `authenticate`, and signing in.

**The church is a claim in the token, not a header.** `login` mints the token for a membership that
exists, and `POST /api/auth/switch-organization` refuses a church the account does not serve, so a
client cannot point itself at another parish by editing a request. Rights come from the **membership**
rather than the account: the same person can administer one church and only read another, and the
account's own role is the default a membership is created with.

**Register numbers, envelope numbers, unit numbers and department names are unique *within* a
church.** A global unique on any of them would refuse a second church its own `ENV-1001`, which is the
kind of defect that only appears the day the second parish signs up. `organizationId` is part of every
such key.

**Money is `Decimal`, never `Float`.** `lib/prisma.ts` converts to a plain number at the JSON edge
and nowhere else, because a float in a giving ledger drifts.

**`AuditLog` is deliberately not soft-deletable.** It has no `updatedAt` and no `deletedAt`, unlike
every other model. An audit trail that can be edited is not an audit trail.

**The database is re-read on every authenticated request.** The token proves *which* account is
asking; whether that account still works here, still has its rights and is not locked is answered by
the row, not by a claim signed up to seven days ago.

**A 7-day JWT cannot be revoked.** So `POST /api/auth/logout` records the intent and returns `204`;
the client discards the token. A stolen one stays valid until it expires. Making logout real means a
denylist or a short-lived token with a refresh flow — a decision to make deliberately.

**A bad token is a `401`, never a `500`.** Expired and malformed tokens are ordinary events — a stale
tab, a typo — and are answered with `token_expired` / `invalid_token` so the console can send the
user back to sign-in instead of reporting a server fault.

**An account may belong to someone on the register** (`User.memberId`). That is what lets a volunteer
request cover for their own duty: without it the server could only verify *which account* is asking,
and "this is my duty" would be an unchecked claim.

**Lockout is counted per account, not per IP.** The parish office has one shared machine, so per-IP
counting would punish everyone for one person's typos.

**Register numbers come from the highest number issued, not a row count.** A count reuses an
identifier the moment anybody is retired, and two living members sharing an ID is a defect a parish
finds a year later.

**Financial records are never edited and never deleted.** A tithe or an offering has no update path
at all: a payment keyed wrongly is voided with a reason and re-entered, because editing the amount in
place erases the only evidence the first figure existed. Voiding keeps the row, writes the archive
entry the Trash screen reads, and adds a ledger line — in one transaction.

**The finance ledger is a hash chain.** Every money mutation appends a `FinanceAuditEntry` that hashes
its own fields together with the previous entry's hash, computed in the same transaction as the change
it records, so a payment cannot be booked without its ledger line. `GET /api/finance/audit/verify`
recomputes the chain and names the first entry that does not add up; `sequence` is issued under a
transaction-scoped advisory lock, so two simultaneous payments cannot claim the same position and fork
the ledger. This is what "immutable" can honestly mean in a database whose rows are technically
editable: not a promise that nobody will try, but the ability to prove whether anybody succeeded.

**A pledge is not cash.** Project contributions carry `kind`, and the funding screen reports "in
escrow" apart from "signed" — a total that adds the two together overstates what the church holds.

**Approving welfare relief and paying it are separate acts.** A committee's decision and a
treasurer's handover are different people, often weeks apart, and the fund has to be able to answer
"what is approved but not yet paid?" — so the case walks `requested → approved → disbursed`, or
`requested → declined`, and the path is enforced rather than assumed.

**Voiding and restoring are one rule in one place** across all six finance entities, and finance will
not restore a record it does not own: `POST /api/finance/trash/:id/restore` refuses an archived
member, which is the members module's business.

**Retirement is one rule, in one place.** `lib/archive.ts` owns it for all twelve entities: the row is
stamped, the archive entry is written with the reason, the actor and the deadline, the audit line is
added, and it all commits together. Before this it was eight hand-written transactions — and they had
already drifted in four ways that mattered. Six modules filed *every* retirement as reason `other`, so
the Trash screen's reason filter and its `byReason` totals were decorative for most of the system. One
wrote its audit line *after* the transaction, so a crash in between left a retired account with no
entry in the trail that exists to record it. The 30-day deadline was copy-pasted eleven times. And the
members module re-implemented the restore that the archive module already performed. A module now
supplies only what is its own: the checks that read like rules about *it* (a household with people in
it, a ministry with a roll, the last administrator) and the words the screen would use.

**A retired record is invisible everywhere except the Trash, and that rule has one owner.**
`lib/live.ts`. Retiring keeps the row — the ledger, the archive entry and the audit trail all still
resolve it — so every read that is not the Trash has to exclude it, and that is the part that leaks:
silently, with a live screen showing a deleted record and nothing failing. The rule was written out at
155 call sites. Now `live` is the one filter every query is built from (152 of them), and `findLive`
is the lookup that goes with it: one live row by id, or a 404 carrying the words of the screen that
asked. `liveSql` is the same filter for the two reports that group in SQL rather than through Prisma.
Four reads deliberately see retired rows, and each says so with `includingRetired` — the next register
number, a role key, a ministry membership re-rolled under its unique key, and a project's target
amount looked up by an id the caller already has. Without it the key would be reissued (two living
members sharing a register number) or the insert would collide with a row nobody can see.

**Two consequences of that rule are unenforced, and are recorded rather than fixed.** A ministry's
roll is filtered on the *membership* row, not on the member it points at, so retiring a member leaves
their live membership visible on `/api/ministries/roster` and counted by `/api/reports/ministries`.
Retiring a member does not take them off a roll; whether it should is a parish's decision. And `Role`
and `SoftDeletedRecord` carry a `deletedAt` that nothing ever writes: neither can be retired through
the API, so the column is inert rather than wrong. Both are visible from a single place now, which is
the point of having one.

**Each module narrows the reason list; none invents its own.** `ARCHIVE_REASONS` in `lib/archive.ts` is
the storage vocabulary, and a module whose truth is narrower takes a subset with `archiveReasonSchema.extract([...])`:
a service is cancelled, postponed or duplicated, never transferred to another parish; a payment can be
wrong in amount, in member, in date, bounced or suspected of fraud. The member list lost an `account`
reason it had picked up by copy-paste, which is the sort of thing a single list makes visible.

**The 30-day deadline is recorded, and nothing enforces it.** Every archive entry carries
`restoreDeadline`, and no code reads it: nothing purges, nothing even surfaces the rows closest to it.
A permanent deletion on a timer is a decision for the church to make deliberately, so it is stated
here rather than implied by a column name — and the field is there for whatever that decision turns
out to be.

**The Trash is one screen, and a retirement has one verb.** `GET /api/admin/trash?entityName=Member`
supersedes the members module's own archived list, and `DELETE /api/members/:id?reason=&reasonLabel=`
supersedes its `POST /:id/retire`, which was the only route left in the system that asked for a JSON
body on a `DELETE`. Both are gone. The members router keeps `POST /api/members/trash/:id/restore` as
its own door, and every door answers with the restored row rather than a receipt, so the three of them
cannot disagree.

**Rights use the console's own panel keys.** `schemas/admin.schema.ts` lists exactly the `PanelKey`
union in `src/lib/permissions.tsx`. A key the console does not read would grant nothing, and a key
missing from the schema makes that right impossible to grant through the API — so the two lists are
kept deliberately identical rather than each being invented where it is used.

**`GET /api/settings/preferences/backup` is a manifest, not an export.** It reports how much of
everything there is, when it was last written and how much is archived, and it answers
`exportAvailable: false`. Handing out a dump of every member's pastoral notes over HTTP is a decision
with consequences; it should be made deliberately, not acquired as a convenience endpoint.

**Marking a campaign sent is not sending it.** The broadcasts module stores campaigns and records
that a send happened and how many devices it reached; it does not talk to an SMS or email gateway,
and it refuses to invent a recipient count. Wiring `send` to a real gateway is a separate decision,
and pretending otherwise would make the register look busier than the church is.

**A birthday's next occurrence is worked out in code, not in SQL.** "The next 30 days" crosses a year
boundary and 29 February has to land somewhere sensible in a common year — it is celebrated on the
28th, as a parish would — and both rules are clearer written out than encoded in a date function
nobody reads twice.

**The ministries screen and the volunteer roster use two vocabularies, and this module conflates
them.** The Ministries screen shows seven departments; the roster's own `department` field carries
serving teams such as ushers, greeters and media. `RosterDuty.ministryId` can only point at one of
the seven, so the seeded ushering duty carries no ministry rather than a wrong one. Giving serving
teams their own table, or making a ministry hierarchical, is the modelling change this wants — not a
seventh name invented for the seed.

**The seed is destructive.** It clears the domain tables so runs are repeatable. Do not point it at a
live parish database.
