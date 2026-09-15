# Deploying Praxis to the cloud

The system is three pieces. Nothing is hosted from a laptop or a parish machine in this setup:

| Piece | Where | What it is |
| --- | --- | --- |
| **Database** | Neon | Managed serverless Postgres. Owns every row. |
| **API** | Railway | The `backend/` Express service. Talks to Neon, serves `/api/*`. |
| **Console** | Cloudflare Pages (or Netlify/Vercel) | The static `dist/` build of the Vite frontend. Calls the API. |

```
Browser ──HTTPS──▶ Cloudflare Pages (React console)
                         │  VITE_API_URL baked in at build time
                         ▼
                   Railway (Express API)  ──▶  Neon (Postgres)
```

Two URLs are the whole wiring: the console must know the API's URL (`VITE_API_URL`), and the API
must allow the console's origin (`CORS_ORIGIN`). Everything else is secrets.

---

## 1. Database — Neon

1. Create a project at <https://neon.tech> (the free tier is enough to start) and pick the region
   nearest the parish.
2. Open **Connection Details** and copy **two** strings:
   - **Pooled connection** → this becomes `DATABASE_URL`. The host contains `-pooler`.
   - **Direct connection** → this becomes `DIRECT_URL`. The host does **not** contain `-pooler`.
   Append `?sslmode=require` to both if Neon has not already.
3. Build the schema and seed the church's data **once**, from your machine (this uses the direct
   URL, so migrations never go through the pooler):

   ```bash
   cd backend
   cp .env.example .env            # paste the two Neon URLs and a real JWT_SECRET
   npm install
   npm run migrate:deploy          # applies prisma/migrations/ to Neon
   npm run seed                    # Destiny Sanctuary's register, ledgers and sittings
   ```

   `npm run seed` creates the two sign-in accounts, `bishop@destinysanctuary.co.ke` and
   `alice@destinysanctuary.co.ke`, both with the password `praxis-demo-2025`. **Change both before
   anyone outside the church gets the URL.**

> Why two URLs: Neon's pooled endpoint is a PgBouncer in transaction mode, which cannot run the DDL
> a migration emits. The app reads through the pool; migrations go direct. `prisma/schema.prisma`
> wires this with `url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")`.

---

## 2. API — Railway

1. Create a project at <https://railway.com> and **Deploy from GitHub repo**.
2. On the service, set **Settings → Root Directory** to `backend`. `backend/railway.json` then
   drives the build (`npm ci && prisma generate && npm run build`) and the start
   (`prisma migrate deploy && npm run start`).
3. Add **Variables**:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** string |
   | `DIRECT_URL` | Neon **direct** string |
   | `JWT_SECRET` | a long random string (see below) |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | the console's URL from step 3 below |

   Generate a secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   `PORT` is provided by Railway — do not set it. The service refuses to start in production while
   `JWT_SECRET` is still the placeholder, which is the point.
4. Add a **public domain** (Settings → Networking) and note it, e.g.
   `https://praxis-api-production.up.railway.app`. Confirm it:
   ```bash
   curl -s https://<your-api-domain>/health
   ```

The `migrate deploy` in the start command is safe to run on every boot: it applies only migrations
that have not been applied, and does nothing once the database is current.

---

## 3. Console — Cloudflare Pages

1. In Cloudflare **Pages → Create a project → Connect to Git**, pick this repository.
2. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variable**: `VITE_API_URL` = the Railway domain from step 2 (no trailing slash).
3. Deploy. The console is served at `https://<project>.pages.dev`.
4. Go back to Railway and set `CORS_ORIGIN` to that Pages URL, then redeploy the API. A console that
   loads but whose sign-in hangs is almost always a `CORS_ORIGIN` that does not match.

> `VITE_API_URL` is baked in at **build** time — it is read by Vite, not by the served page. Changing
> it means rebuilding and redeploying the console, not just editing a variable.

---

## 4. Verify the deployment

1. `curl https://<your-api-domain>/health` returns `200`.
2. Open the console, sign in as `bishop@destinysanctuary.co.ke`.
3. Home shows live counts, Members → **Find Christian** lists the seeded register, and **Add New
   Christian** writes a row you can see after a reload. That is the whole Phase 1 loop.

---

## 6. Anywhere else: Docker

`backend/Dockerfile` builds the same service for any host that runs containers — Fly, Render, a VPS,
or the church's own machine. It runs `npm run build`, then starts with `prisma migrate deploy` before
the server, exactly as the Railway release step does.

```bash
cd backend
docker build -t praxis-api .
docker run --rm -p 4000:4000 --env-file .env praxis-api
```

Three variables the container needs that a local run does not: `NODE_ENV=production`, the two
database URLs, and `TRUST_PROXY_HOPS` set to the number of proxies in front of it (`1` for a single
load balancer). That last one is not optional behind a proxy: the client address decides every
rate-limit bucket, and an unset hop count means every request looks like it came from the balancer.

The image carries the Prisma CLI, because the boot command is a migration. That is deliberate — see
the note at the top of the Dockerfile — and it is why `--omit=dev` is *not* used. The container
reports its own health through a `HEALTHCHECK` against `/health`, so a host that understands
docker health will restart a container whose database has gone away.

On Fly the same three files matter: `fly.toml` with `internal_port = 4000` and a health check on
`/health`, `fly secrets set` for the variables, and `fly deploy`. Nothing in the app needs changing.

---

## 7. Watching it

### Health

`GET /health` is the one endpoint with no authentication and no rate limit. It runs `SELECT 1` against
Postgres and answers:

```json
{ "status": "ok", "database": "reachable", "environment": "production" }
```

A process that is up but cannot reach its database answers **503** with `"database": "unreachable"`,
which is the answer that matters: an API that is listening but cannot read the register is down as far
as a church is concerned. Both Railway's health check and the Docker `HEALTHCHECK` point at this.

### Uptime

Point any uptime monitor — UptimeRobot, Better Stack, Pingdom, a `curl` in a cron — at
`https://<your-api-domain>/health` from outside the network, every minute, alerting on **any non-200**
across two consecutive checks. Watching from outside matters: the point of the monitor is to notice
the day the host, the domain or the database is gone, and a check from inside the same network often
survives exactly the failure you are trying to hear about.

Worth adding alongside it, once a church is live: a second monitor on the console's URL. A console
that loads but cannot reach the API is a broken console too.

### Logs

The API writes **one JSON line per request** and one per failure, on stdout, where the host collects
them:

```json
{"at":"2026-09-15T17:04:12.884Z","level":"info","event":"request","requestId":"…","method":"GET","path":"/api/members","status":200,"ms":18,"actorId":"…","organizationId":"…"}
```

Every response also carries `X-Request-Id`. When somebody reports a screen that failed, that header —
visible in the browser's network tab — names the exact line in the log, which is usually faster than
searching by timestamp. `/health` is not logged: a monitor polling it every minute would drown the
lines worth reading.

### Error tracking

Nothing is reported anywhere until you set `SENTRY_DSN`. With it set, every **5xx** is posted to the
tracker with the route, the church and the account that hit it — and never the request body, which can
hold a member's pastoral notes. 4xx responses are not reported at all: those are the client being told
no, and sending them to a tracker is how a tracker becomes noise nobody reads.

The DSN is a Sentry-compatible one (`https://<key>@<host>/<project>`); the API speaks the ingestion
protocol directly, so GlitchTip and anything else that implements it work too. Without a DSN the
behaviour is unchanged apart from the absence of the outbound call: failures are still logged.

---

## Notes and gotchas

- **Secrets never live in the repo.** `.env*` is git-ignored except `.env.example`. Set them as
  service variables in Railway and as build variables in Pages.
- **One region.** Put Neon and Railway in the same region if you can; a cross-Atlantic round trip on
  every query is the difference between a fast console and a slow one.
- **The parish LAN is still supported.** `CORS_ORIGIN` takes a comma-separated list, so the hosted
  console and a LAN address can both be allowed during a move. See `backend/README.md` for the
  local/offline story.
- **Migrations are the deploy's job, not yours.** The start command runs `prisma migrate deploy`, so
  a push to `main` that adds a migration builds it into the database on the next deploy.

---

## 5. Optional: uploads, email and SMS

All three default to a working-but-quiet mode, so a first deployment needs none of them. Add them
when the church is ready.

### Uploads

Out of the box `STORAGE_DRIVER=database` keeps the logo, member photographs and scanned minutes in
Postgres — which works on any host, and inherits whatever backup the database already has. The only
thing to decide is the ceiling:

- `UPLOAD_MAX_BYTES` (default `5242880`, i.e. 5 MB). Raise it for scanned minutes, and raise the
  reverse proxy's own body limit with it — Railway's edge rejects oversized requests before the app
  ever sees them.

`STORAGE_DRIVER=s3` is reserved and **not implemented in this build**: selecting it makes the process
fail at startup with the exact variables it is missing, rather than quietly writing the files
somewhere else. If the volume of scanned minutes outgrows the database, that is the branch to
implement — `backend/src/lib/storage.ts` is the only file that has to change.

### Email

`EMAIL_DRIVER=console` sends nothing, and pressing **Send** on a broadcast returns a precise `503`
telling you what to set. It will not mark a campaign "sent" over a provider that was never
configured — which is the failure mode that matters, because nobody notices a broadcast that reached
no one.

To send for real:

1. Create a [Resend](https://resend.com) account and **verify the sending domain** (add the DNS
   records it gives you). An unverified sender is delivered as spam or rejected outright.
2. Set on the API service:

   ```
   EMAIL_DRIVER="resend"
   RESEND_API_KEY="re_..."
   EMAIL_FROM="Destiny Sanctuary <office@destinysanctuary.co.ke>"
   APP_NAME="Destiny Sanctuary Int'L"
   PUBLIC_APP_URL="https://<your-console-domain>"
   ```

Messages are sent **one recipient at a time**, so one family's address never appears in another
family's `To:` header, and a failure is a failure for one person rather than for the whole
congregation. The response reports delivered and failed counts per send.

### SMS

`SMS_DRIVER=console` behaves the same way. For a Kenyan parish, Africa's Talking terminates most
reliably on Safaricom:

```
SMS_DRIVER="africastalking"
AFRICASTALKING_USERNAME="destiny"
AFRICASTALKING_API_KEY="..."
```

Twilio is the alternative for anywhere else: `SMS_DRIVER=twilio` with `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN` and `TWILIO_FROM`.

### Who a broadcast reaches

A broadcast's audience is a **label** the office typed, and the server resolves it against the
register: a label containing "leader" goes to ministry leaders, one containing "youth" to the youth
roll, one containing "council" or "board" to the council's logins, and **anything else to the whole
register** — never to nobody, because the broadcast that silently reaches no one is the one nobody
notices until a funeral notice was never delivered. An audience that resolves to zero addresses is
refused rather than recorded as a cheerful zero.

### Verifying the finance ledger after a deploy

Once real money has been recorded, open **Admin → Finance Audit** and press **Verify Ledger**. It
recomputes the whole hash chain server-side and reports the first entry that no longer adds up. Run
it after any manual database surgery; it is the one check that catches a row edited outside the app.
