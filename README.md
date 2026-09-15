# Praxis Church OS

The church office console for **Destiny Sanctuary Int'L, Nyahururu** — members and pastoral care,
services and worship, giving and stewardship in Kenyan shillings, governance, communications, reports
and certificates.

This repository holds **both halves of the system**: a React console and the Express + Prisma + Postgres
API it talks to. They are separate deployments (the console is static, the API is a service) and one
repository, because a change to the way a figure is computed usually touches both.

> **Status — read this before evaluating the console.** The API is complete. The console is *partly*
> connected: **authentication, the Home dashboard, Members, Announcements, the Finances panels
> (Welfare, Charity, Project Funding and the Finance Audit Ledger) and the church profile all read and
> write real data.** The remaining screens render the original sample data and save nothing — and
> because the standalone **Tithes and Offerings ledgers are among them**, read
> [What is connected to the API](#what-is-connected-to-the-api) before entering a real record
> anywhere.

## Stack

| Half | Stack |
| --- | --- |
| Console (`/`) | React 19 · TypeScript · Vite 6 · Tailwind 4 · Material Symbols (self-hosted) |
| API (`/backend`) | Express 5 · TypeScript · Prisma 5 · PostgreSQL · zod · JWT · helmet |

No router and no state library on the console: it is one shell with a section switcher.

## Layout

```
src/                          the console
  App.tsx                     error boundary → auth gate → console
  components/
    ErrorBoundary.tsx         the last line before a white screen
    auth/AuthScreen.tsx       the sign-in gate
    church/
      ChurchSystemApp.tsx     the shell: navigation, section routing, quick actions
      DataState.tsx           the shared loading / error / empty blocks
      FileUpload.tsx          the one upload control every screen uses
      views/                  one component per screen, grouped by section
  hooks/
    useApi.ts                 useResource / useList / useMutation and one hook per resource
    useFileUrl.ts             an uploaded file as a displayable object URL
  lib/
    api.ts                    the typed API client — every endpoint the console calls
    auth.tsx                  the session: login, restore, logout
    adapters.ts               API records → the shapes the screens render
    permissions.tsx           panel + action rights per role

backend/                      the API
  prisma/schema.prisma        the schema, and the comments that explain it
  prisma/migrations/          committed migrations — `migrate deploy` applies these
  src/
    app.ts                    the Express app, with no `listen` in it
    server.ts                 the socket
    config/env.ts             configuration, validated once at startup
    lib/                      storage, email, sms, audience, archive, finance ledger, auth
    middleware/               authenticate, error handling, async wrapper
    routes/ controllers/ services/ schemas/    one file per concern, top to bottom
```

## Running it locally

You need **Node 20+** and a **PostgreSQL 14+**. The quickest database is a container:

```bash
docker run --name praxis-pg -e POSTGRES_PASSWORD=praxis -e POSTGRES_USER=praxis \
  -e POSTGRES_DB=praxis -p 5432:5432 -d postgres:16
```

Then, in two terminals:

```bash
# 1. the API
cd backend
cp .env.example .env          # the defaults match the container above
npm install
npx prisma migrate deploy     # apply the committed migrations
npm run seed                  # the demo register, ministries, giving and users
npm run dev                   # http://localhost:4000, health at /health

# 2. the console
cd ..
cp .env.example .env          # VITE_API_URL should stay http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

Seed logins. The sign-in screen does not fill them in for you — it opens empty, on purpose:

| Account | Password | Role |
| --- | --- | --- |
| `bishop@destinysanctuary.co.ke` | `praxis-demo-2025` | `super_admin` |
| `alice@destinysanctuary.co.ke` | `praxis-demo-2025` | `admin` |

Both passwords are written down here, so they are public, and they are enough to create the accounts
that replace them. **A password is set once, at `POST /api/admin/users`, and nothing changes one
afterwards** — `PATCH /api/admin/users/:id` takes a name, an email and `isActive`, and there is no
change-password route or screen. Giving each person their own account keeps the audit log honest
today; an in-place password change is the account-management gap to close before staff use logins of
their own. `docs/staff-quick-start.md` says the same thing in the office's own words.

## Environment variables

The console reads one variable, at **build time**, so it must be set before `npm run build`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the API. No trailing slash. |

The API validates the rest at startup and refuses to boot if one is missing or is still a placeholder.
The full list, with the reasoning, is in [`backend/.env.example`](backend/.env.example). The ones that
change behaviour rather than just credentials:

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | — | Pooled connection the app uses at runtime |
| `DIRECT_URL` | — | Unpooled connection `prisma migrate` uses |
| `JWT_SECRET` | — | 32+ characters; the process refuses the placeholder in production |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of allowed console origins. List **both** loopback spellings for local work: a browser treats `localhost` and `127.0.0.1` as different origins, and the value here has to include whichever one the address bar uses |
| `TRUST_PROXY_HOPS` | `0` | How many proxies sit in front of the API. **Set it to `1` on Railway, Render or Fly** — at `0` the rate limiter sees the proxy's address, so every visitor shares one allowance |
| `UPLOAD_MAX_BYTES` | `5242880` | Largest single upload (5 MB) |
| `STORAGE_DRIVER` | `database` | `database` keeps bytes in Postgres; `s3` is reserved |
| `EMAIL_DRIVER` | `console` | `console` sends nothing **and says so**; `resend` sends for real |
| `EMAIL_FROM` | `Praxis Church Console <onboarding@resend.dev>` | What recipients see. Must be on a domain verified with the provider |
| `SMS_DRIVER` | `console` | `console`, `africastalking`, or `twilio` |
| `AFRICASTALKING_SENDER_ID` | — | The sender ID the church sends under. Omitted, the account's own short code is used |
| `PUBLIC_APP_URL` | `http://localhost:3000` | The console's address, used in the welcome email a new church receives |

## Deploying it

The three services, and why each:

| Piece | Where | Notes |
| --- | --- | --- |
| Database | **Neon** | Gives you both connection strings. Use the `-pooler` host for `DATABASE_URL` and the direct host for `DIRECT_URL`. |
| API | **Railway** (or Render / Fly / Docker) | `backend/railway.json` sets the build, the `prisma migrate deploy` release step and the `/health` check; `backend/Dockerfile` does the same for any host that runs containers. |
| Console | **Vercel** (or Netlify / Pages) | `vercel.json` sets the build and the SPA rewrite. Set `VITE_API_URL` to the API's public URL **before** building. |

Step by step, including the exact strings to copy out of Neon, is in
[`docs/cloud-deploy.md`](docs/cloud-deploy.md). The short version:

1. Create the Neon database; copy the pooled and direct strings.
2. Deploy `backend/` to Railway with `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (generated) and
   `CORS_ORIGIN` set to the console's eventual URL.
3. Run `npm run seed` once against the new database — from Railway's shell, or locally with the
   production `DATABASE_URL`.
4. Deploy the console with `VITE_API_URL` pointing at Railway.
5. Go back and set `CORS_ORIGIN` to the deployed console URL if it was not known in step 2.
6. Point an uptime monitor at `https://<api>/health` and — if you want failures reported rather than
   merely logged — set `SENTRY_DSN`. Set `TRUST_PROXY_HOPS=1` at the same time, or the rate limiter
   sees every request as coming from the load balancer.

What a parish's first week needs before it is a production deployment, and none of it is code:
verified sending domains for email and SMS, a `pg_dump` on a schedule (see
[`docs/backups.md`](docs/backups.md)), and the super-admin password changed from the seeded one.

## What is connected to the API

| Module | State |
| --- | --- |
| Authentication | **Real** — `POST /api/auth/login`, `GET /api/auth/me`, logout, 401 handling. Roles come from the session, and the console narrows from the same permitted-keys list the API enforces |
| Signing a church up, the welcome wizard, plans, trials and billing | **Real** — see [Selling it](#selling-it-plans-trials-and-billing) |
| Admin → Churches (Praxis) | **Real**, and only for a platform administrator: every church on the platform, the plan each is on, its usage, and the operator's four actions — set the plan, record a payment, open a support session, suspend or reactivate |
| Communications → Broadcasts | **Real** — a campaign is created and sent through the configured gateway, and the delivery report the provider returned is stored on the campaign and shown beside it |
| Reports & Certificates | **Real** — baptism and dedication certificates, the register summary and the treasury summary, printed from the live records on the church's own letterhead |
| Home — the figures, the activity list and all three quick actions (add member, record tithe, schedule meeting) | **Real** — `/api/reports/overview`, `/api/finance/tithes`, `/api/governance/meetings` |
| Members — find (multi-word name search included), add, retire, family units | **Real** |
| Members — importing an existing register from a spreadsheet | **Real** — upload or paste a CSV, match the columns, read what each row would do, then import. Nothing is written until the report has been read, and a row already on the register is skipped rather than duplicated |
| Announcements | **Real** — publish, pin and retire, with the retirement reason landing in the Trash and the audit trail |
| Communications — Events & Calendar, Prayer Requests (including marking one answered), Birthdays & Milestones | **Real** — `/api/communications/events`, `…/prayer-requests`, `…/celebrations`. Rooms and RSVP headcounts the events table does not store are not shown rather than faked |
| Finances — Welfare, Charity, Project Funding, Finance Audit Ledger | **Real** |
| Church profile and logo — `Settings → Church Identity` | **Real** |
| Settings → Data & backup | **Real** — the live record counts, and a downloadable copy of the church's own records (registers, ledgers, minutes, notices, staff list; no credentials, and uploaded file contents listed rather than embedded) |
| Tithes and Offerings ledgers — `Giving → Tithes / Offerings` | **Sample data.** Recording a tithe from the **Home** quick action is real; these two ledger screens are not wired yet, so a tithe recorded on Home does not appear in them |
| Services & Worship · Church Council · Reports & Certs · Communications → Broadcasts (SMS/Email) · Admin → Users & Rights, Trash, Audit Log · Groups & Fellowships · Inventory & Assets · the remaining Settings panels | **Sample data** — the screens render, and nothing persists. The Trash screen's restore acts on its own sample rows, so its success message is not something the database knows about |

The API behind every one of those screens is already built, typechecked and smoke-tested; wiring the
screen is the remaining work — one panel at a time, against `src/hooks/useApi.ts` and the mappers in
`src/lib/adapters.ts`. Broadcasts waits on an SMS/email provider, so it is last.
`src/lib/api.ts` is the honest inventory of what the server can do.

## Multi-tenancy

The system serves more than one church, and the isolation is a property of the API rather than of each
screen. Which church a request is for is a claim in the token, minted at sign-in from a membership
that exists, and every query is scoped to it — so the console never sends an organisation id, and no
screen can ask for another church's rows. Rights come from the membership too: the same login can
administer one church and only read another. The console holds the name for one reason: so it can say
which church a person is looking at. `backend/README.md` has the design.

Two consequences for an operator:

- **A church can add itself** — `POST /api/auth/signup` is public, and creates the organisation, its
  first `super_admin` (the only one it will ever have automatically), the membership that ties the two
  together and a trial subscription in **one transaction**. A session still cannot create a tenant for
  somebody else, which is what the isolation check proves. The seed provisions the first church the
  way an operator would: the rows, the leadership and the records, with no signup involved.
- **Numbers that identify people or records are unique inside a church, not across the system.**
  Register numbers, envelope numbers, household unit numbers and department names all belong to their
  church, so a second parish starts its own `ENV-1001` and its own `H-01`.

`npm run check:isolation` (from `backend/`) is the proof, and CI runs it on every pull request: it
creates a second church, signs in as its administrator, and tries — with the API's own endpoints — to
read, change, retire and restore the first church's records, list its Trash and its audit log, and
switch a session into it. Every list has to come back empty rather than filtered, and every attempt
has to fail.

## Selling it: plans, trials and billing

A church can start itself on Praxis without anybody's help, and pays by arrangement rather than by
card. The whole commercial layer is four ideas.

**A plan is a row, not a code path.** `Plan` holds the name, the price and interval, a `trialDays`, a
`limits` object and a `features` list. The seed writes three — Mustard Seed, Harvest and Sanctuary —
and Sanctuary is `isPublic: false` because the largest parishes are quoted by hand. A church is shown
the public ones; an operator sees all of them.

**The clock decides the status.** `Subscription` stores the last *decision* (a plan, a trial end, a
period end, a cancellation) and `nextStatus()` applies today's date to it, so a church becomes due, in
grace or lapsed because time passed rather than because a job ran at midnight. `trial → past_due →
expired` is 14 days of grace (`GRACE_DAYS`), and a payment returns a church to `active` from anywhere,
including `expired`.

**Limits are enforced where the thing is created.** `assertWithinPlan('maxMembers' | 'maxUsers')` is
called from the member and user services rather than from a route, so a new endpoint that creates one
is covered without remembering it exists. A plan whose `limits` omit a key is unlimited.

**Lapsed means read-only, not locked out.** A lapsed church gets `402 subscription_expired` on a
write with an explanation in the body, and reads keep answering — reports, exports, the audit log and
the billing routes still work, so nobody loses access to records over a bookkeeping slip. The console
shows one panel that says the period ended, that nothing has been deleted and how to restore it.

The two ends of it:

- **The church's side** — Settings → *Subscription & Billing* shows the standing, the usage against
  the plan's limits, the payments received and the catalogue. It can *ask* for another plan; it cannot
  take one, which is what manual billing means. The request is a row the vendor sees, not an email
  somebody has to remember.
- **Praxis's side** — Admin → *Churches (Praxis)*, behind `isPlatformAdmin` on the account. Set a
  church's plan, grant or extend a trial, open a paid period, and record the money that arrived; the
  period starts where the previous one ended, so a church that pays early keeps the days it paid for.

What is deliberately absent: no card processing, no invoices generated by the system, and no plan
editing screen. Plans are seeded and changed by a migration or Prisma Studio, because a plan is a
commercial decision taken a few times a year, not a screen anyone needs daily. Adding Stripe later
means one new endpoint beside `POST /api/billing/request-upgrade` — the rest of the model already
carries what it would need.

Who can do what:

- Any signed-in member of a church can read its subscription; only a role with `actions.edit` can ask
  for a change.
- Only a platform administrator reaches `/api/vendor/*`. In the seeded database that is
  `bishop@destinysanctuary.co.ke`.

The code is `backend/src/services/billing.service.ts` (all the arithmetic), `backend/src/routes/billing.routes.ts`
and `vendor.routes.ts` (the two audiences), `backend/src/middleware/subscription.ts` (the gate), and on
the console `OnboardingWizard.tsx`, `SubscriptionPanel.tsx`, `SubscriptionBanner.tsx`,
`SubscriptionLapsed.tsx` and `VendorChurchesPanel.tsx`.

## Integrations

Four external things, and each one is configured in the API's environment rather than in the console.
`Settings → Delivery & storage` shows, per installation, which of them are actually live and what is
left to set — the console never claims a capability the server does not have.

| What | Driver | What it needs |
| --- | --- | --- |
| **Email** | `resend` over `fetch` | `EMAIL_DRIVER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` on a domain verified with the provider. Sent one recipient at a time, so one family's address never appears in another's `To:` header |
| **SMS** | `africastalking` (first choice in Kenya, because it terminates reliably on Safaricom) or `twilio` | `SMS_DRIVER` plus that provider's credentials; `AFRICASTALKING_SENDER_ID` once the sender ID is registered |
| **Files** | Postgres by default, `s3` reserved | `STORAGE_DRIVER`, `UPLOAD_MAX_BYTES` (5 MB) and a per-purpose MIME allowlist. Bytes are held in the church's own database because the API runs on ephemeral containers where a local uploads directory is wiped on every deploy — and a database is the thing that already has a backup story |
| **Documents** | The browser's print dialog | Nothing. Certificates and summaries are built as HTML with their own inlined CSS and printed, so "Save as PDF" works on every platform with the layout the clerk just looked at |

**The rule they all follow: a send that did not happen is never recorded as one.** With no provider
configured, pressing send returns a `503` naming the variable to set, rather than marking the campaign
sent over a gateway that was never there. An audience that resolves to no addresses is refused for the
same reason — the failure nobody can see is the one that reaches a funeral notice's recipients and
nobody else. When a send does go out, the provider's own per-recipient result is what gets stored
(`Broadcast.lastReport`) and displayed, failures and reasons included.

## Being the operator

`/api/vendor` is the one place in the service that deliberately steps across churches, and it is
gated on `isPlatformAdmin` — a flag on the account, not a role, because every parish has a
`super_admin` of its own and a role check would hand every church the whole customer list. The
seeded platform administrator is `bishop@destinysanctuary.co.ke`.

Two of the four actions there are worth knowing before you press them:

- **Suspend / reactivate** is a single column (`Organization.isActive`). A suspended church cannot
  sign in and every request is refused, with a message that says *suspended* rather than "you do not
  serve this church". The reason is mandatory and is written into the **church's own** audit log, so a
  parish can always find out who switched it off and why.
- **A support session** is how you look at a church's records without asking for a password over the
  telephone. It mints a one-hour token whose subject is still *you*, so every row you touch names
you, and it writes the start — and, when you leave properly, the end — into that church's log. While
  the session is open the console shows a black strip saying whose access it is, and the vendor
  screens are deliberately unreachable: a visit is the church's access, not the vendor's.

## Hardening and monitoring

What protects a login and a record, in one place — every item here is enforced by the API, not by the
screen that calls it:

| Concern | What happens |
| --- | --- |
| Passwords | bcrypt at cost 12; at least 8 characters; the handful of passwords tried first against any new account are refused, and so are the obvious church ones |
| Sessions | HS256 tokens signed with `JWT_SECRET` (a 7-day lifetime, and the service refuses to start with the placeholder outside development); role and rights are re-read from the database on every request rather than trusted from the token |
| Sign-in | A per-address ceiling of `AUTH_RATE_LIMIT_MAX` (10/minute) plus per-account lockout |
| Everything else | A general ceiling of `RATE_LIMIT_MAX` (300/minute), and a tighter one (`COSTLY_RATE_LIMIT_MAX`) on the two endpoints with a bill attached — sending a broadcast, and uploading a file |
| Browser exposure | `helmet`'s security headers, and CORS restricted to the listed origins; `X-Forwarded-For` is only believed as far as `TRUST_PROXY_HOPS` says |
| Uploads | An allowlist of formats per purpose, a size ceiling, and a check of the file's first bytes against the type it claims — a script named `logo.png` is refused rather than served back as an image |
| Deletion | Soft delete with a reason, restorable from the Trash; the finance ledger is a hash chain that **Verify Ledger** recomputes |
| Accountability | Every write writes an audit row naming the account that made it, with a before and after |
| Tenancy | Every query is scoped to the church in the token; `npm run check:isolation` proves one church cannot reach another's rows |
| Failures | One JSON log line per request and per failure, `X-Request-Id` on every response, `/health` for a monitor, and optional Sentry-compatible reporting for 5xx |

## Commands

Console:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on **port 3000** (the audits assume it) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build to `dist/` |
| `npm run build:share` | One self-contained `dist-share/index.html` for handing the demo to someone |
| `npm run audit:a11y` | Assistive-tech audit of every screen (a real browser) |
| `npm run audit:dialogs` | Keyboard audit of every dialog: naming, focus containment, Escape, restore |
| `npm run backup` | A verified `pg_dump` of the church's database into `backups/` |

API (from `backend/`):

| Command | What it does |
| --- | --- |
| `npm run dev` | `tsx watch` on port 4000 |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run build` | Compile to `dist/` |
| `npm run migrate` | Create and apply a migration in development |
| `npm run migrate:deploy` | Apply committed migrations (what the release step runs) |
| `npm run seed` | Load the demo data — one church (Destiny Sanctuary, its leadership and its records), the three subscription plans, and that church's own subscription and first payment |
| `npm run check:isolation` | Proves one church cannot reach another's records (needs the API running) |
| `npm run check:vendor` | Proves the vendor console and the outbound gateways behave — suspend, support session, and a send that is refused rather than faked (needs the API running) |
| `npm run check:import` | Proves a register can be imported from a spreadsheet: the report before anything is written, the duplicate keys, and the file shapes that break a naive parser (needs the API running) |
| `npm run studio` | Prisma Studio |

The two browser audits need the dev server running and Chrome installed — `CHROME=/path/to/chrome`
overrides the lookup. Both exit non-zero when their report holds a failure.

## Reading further

- [`docs/staff-quick-start.md`](docs/staff-quick-start.md) — the guide for the church office: what each
  panel is for, who can see what, and what to do when something goes wrong. **Give this one to staff.**
- [`docs/backups.md`](docs/backups.md) — what to back up, how to restore it, and what the in-app Trash
  and Audit Log do *not* cover.
- [`docs/cloud-deploy.md`](docs/cloud-deploy.md) — the deploy runbook.
- [`backend/README.md`](backend/README.md) — the API's own conventions: response envelopes, the
  soft-delete and audit rules, and why money leaves as a number.
