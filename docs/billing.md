# Billing and the subscription lifecycle

How a church moves through Praxis's commercial layer: the plans it can sit on, the dates that decide
its standing, what a lapsed church keeps and loses, and what Praxis's own operators can do about all
of it. The `check:billing` suite proves this whole document against a running API — where the two
disagree, this file is the one that is wrong.

## Plans

A plan is a **platform row**, shared by every church; a subscription belongs to one church. Plans carry:

| Field | Meaning |
| --- | --- |
| `key` | Stable handle (`mustard-seed`). Never shown to a person. |
| `name`, `tagline` | What the upgrade screen shows. |
| `price`, `currency`, `interval` | Money as `Decimal(12,2)`; `monthly` or `yearly`. |
| `trialDays` | Free days a signup gets on this plan. `0` means none. |
| `limits` | `maxMembers`, `maxUsers`. **A missing key means no limit, never zero.** |
| `features` | The bullet list. |
| `isPublic` | Offered on the church's upgrade screen. `false` = quoted by hand. |
| `isActive` | Retired plans stay `false` but keep their subscriptions. |
| `sortOrder` | Catalogue order. |

Validation lives in `backend/src/schemas/billing.schema.ts`; the church-facing catalogue filters
`isActive && isPublic`, the vendor's list sees everything.

## The subscription clock

A subscription stores a **decision** (`status`) and **dates**; the calendar's verdict is derived
separately by `nextStatus()` in `backend/src/services/billing.service.ts` and written back when it
differs. This is why a church that stops paying is found out without a cron job — the first read
after the date passes notices.

Five states:

| Status | Meaning |
| --- | --- |
| `trial` | Inside the free period. Full use. |
| `active` | Paid up and inside the period a payment opened. |
| `past_due` | The period (or trial) ended and no payment has arrived. **Still fully usable** — the grace period. |
| `cancelled` | The church gave notice. Keeps access until the period it paid for ends. |
| `expired` | The grace period has run out. **Writes stop; reads continue.** |

The transitions the clock applies:

```text
trial     ── trial ends, within GRACE_DAYS ──▶ past_due ── grace over ──▶ expired
trial     ── grace over with no conversion ──────────────────────────────▶ expired
active    ── currentPeriodEnd passes ────────────────────────────────────▶ past_due
past_due  ── grace over ─────────────────────────────────────────────────▶ expired
cancelled ── currentPeriodEnd passes ────────────────────────────────────▶ expired
expired   ── (stays; only a payment or the vendor console leaves it)
any state ── payment recorded ───────────────────────────────────────────▶ active
```

Two constants matter:

- **`GRACE_DAYS = 14`** — how long `past_due` lasts before `expired`. Never a surprise: the console's
  subscription panel and banner count the days down the whole way.
- **Impossible states are refused at the door.** The clock can only *advance* a decision, so the
  vendor's `assignPlan` refuses `active` or `past_due` without `periodMonths` (`status_needs_period`) —
  a pinned status whose dates the calendar cannot correct would freeze a church that way. Granting
  trial days closes any paid period and moves the decision to `trial`, because the dates changed.

## What a lapsed church keeps

The policy is **writes stop, reads continue**, enforced by `requireWritableSubscription`
(`backend/middleware/subscription.ts`), mounted on every operating router. It reads the subscription
itself — a gate that depends on an earlier middleware leaving state behind is a gate that can be
forgotten — and only for non-GET requests, so ordinary screen loads cost nothing extra.

While `expired`:

- **Still available:** every read, reports, the audit log, the Trash, exports, the church's own
  billing screens (`/api/billing` is deliberately outside the gate — it is the door back), and the
  onboarding wizard (declared before the gate on the settings router, so a church that lapsed
  mid-wizard can finish).
- **Refused with `402 subscription_expired`:** every create, update, delete, restore, send and
  preference write in the operating modules.
- **Nothing is deleted, ever.** The refusal message says so, because a treasurer reading "read-only"
  at 7am needs to know the register is intact before they read anything else.

A church locked out of its own records over a bookkeeping slip is a worse failure than an unbilled
month. That asymmetry is the whole policy.

## Trials

- **Created** by signup: the chosen plan's `trialDays` sets `trialEndsAt` (or none, if `0`).
- **Extended** by the vendor console (`assignPlan` with `trialDays`) — granting days closes any paid
  period and sets the decision to `trial`, keeping a manual extension and a fresh trial the same act.
- **Converted** by a recorded payment, which opens a paid period and clears `trialEndsAt`.
- **Expired** by the same clock as a paid period: end of trial → `past_due` → `expired`.

## Payments

Money arrives **outside the product** (M-Pesa, bank, cheque) and is recorded by a platform
administrator: amount, method, reference (the M-Pesa code or slip number), how many months it buys,
and optionally the received-at date. Recording a payment:

1. writes the `SubscriptionPayment` row **first** — a period with no payment behind it would be free
   use, and a payment with no period would be untraceable money;
2. opens the period: it **starts when the previous period ends**, so paying early *adds* time rather
   than punishing punctual parishes;
3. sets the decision to `active`, clears `cancelledAt`/`trialEndsAt`/any upgrade request, and files an
   audit line in the **church's** log naming the amount, method and reference.

All of it is one transaction. There is no external gateway yet, so there are **no webhooks and no
client-side payment confirmation anywhere** — the only thing that can set a subscription active is a
recorded payment or the vendor console, both of which are named, authenticated, audited acts. When a
gateway arrives, its webhooks must be signature-verified, idempotent (keyed on the event id) and
auditable before anything trusts them.

## The vendor console

Praxis's own operators reach `/api/vendor`, the only routes that cross between churches, behind
`requirePlatformAdmin` — a **flag on the account**, not a role, because every parish has a
`super_admin` and a role check would hand every parish owner the customer list.

| Duty | How |
| --- | --- |
| Church list & standing | `GET /organizations`, filterable by the clock's verdict (in-memory, deliberately — `past_due` is derived, not stored). |
| Usage & stats | `GET /organizations/:id/stats` — members, giving this year, last activity. |
| Plans | `GET /plans`, `PUT /plans/:key` (upsert keyed on `key`). |
| Put a church on a plan / start or extend a trial / record a decision | `POST /organizations/:id/plan`. |
| Record a payment | `POST /organizations/:id/payments` (opens the period it buys). |
| See what a church has paid | `GET /organizations/:id/payments`, shown in the manage dialog. |
| Suspend / reactivate | `POST /organizations/:id/suspension` — reason required, audited, sign-in refused with 403 while suspended. |
| Support visits | `POST /organizations/:id/support-sessions` opens a scoped, audited, one-hour session inside the church; `POST /support-sessions/end` closes it. |

Platform and tenant boundaries stay explicit: vendor writes go through `clientFor(organizationId)` —
naming the church they act for — rather than inheriting the operator's own tenant, and a church's own
screens read their subscription through the tenant-scoped client and cannot see anybody else's.

## Proving it

`npm run check:billing` (in `backend/`, against a running API) walks one throwaway church through the
entire lifecycle and removes it afterwards:

> signup → trial → conversion by payment → early renewal that adds a month → refusal of impossible
> states → past due by the clock → grace-period writes still working → expired: reads live, writes
> 402, settings writes 402, onboarding still open → one payment restoring everything with the records
> intact → trial extension → cancellation with its paid notice period.

It runs in CI (`check.yml`, "the billing lifecycle"). `npm run check:vendor` covers the vendor
console's other half — suspension, support sessions, and refusing to pretend a send happened.
