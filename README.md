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
| `SMS_DRIVER` | `console` | `console`, `africastalking`, or `twilio` |

## Deploying it

The three services, and why each:

| Piece | Where | Notes |
| --- | --- | --- |
| Database | **Neon** | Gives you both connection strings. Use the `-pooler` host for `DATABASE_URL` and the direct host for `DIRECT_URL`. |
| API | **Railway** (or Render / Fly) | `backend/railway.json` sets the build, the `prisma migrate deploy` release step and the `/health` check. |
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

## What is connected to the API

| Module | State |
| --- | --- |
| Authentication | **Real** — `POST /api/auth/login`, `GET /api/auth/me`, logout, 401 handling. Roles come from the session, and the console narrows from the same permitted-keys list the API enforces |
| Home — the figures, the activity list and all three quick actions (add member, record tithe, schedule meeting) | **Real** — `/api/reports/overview`, `/api/finance/tithes`, `/api/governance/meetings` |
| Members — find (multi-word name search included), add, retire, family units | **Real** |
| Announcements | **Real** |
| Finances — Welfare, Charity, Project Funding, Finance Audit Ledger | **Real** |
| Church profile and logo — `Settings → Church Identity` | **Real** |
| Tithes and Offerings ledgers — `Giving → Tithes / Offerings` | **Sample data.** Recording a tithe from the **Home** quick action is real; these two ledger screens are not wired yet, so a tithe recorded on Home does not appear in them |
| Services & Worship · Church Council · Reports & Certs · Communications (events, prayer, birthdays, broadcasts) · Admin → Users & Rights, Trash, Audit Log · Groups & Fellowships · Inventory & Assets · the remaining Settings panels | **Sample data** — the screens render, and nothing persists. The Trash screen's restore acts on its own sample rows, so its success message is not something the database knows about |

The API behind every one of those screens is already built, typechecked and smoke-tested; wiring the
screen is the remaining work. `src/lib/api.ts` is the honest inventory of what the server can do.

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
| `npm run seed` | Load the demo data |
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
