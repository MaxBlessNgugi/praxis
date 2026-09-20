# Praxis — Staff Quick Start

For the Destiny Sanctuary office team. One page per panel, what it is for, and the handful of things
you will do most often.

---

## Signing in

Open the console's address in a browser and sign in with the email and password you were given.

**Remember Me** starts unticked, and should stay that way on the office computer: unticked ends your
session when the browser window closes, which is what you want on a machine the whole office shares.
Tick it only on a computer that is yours.

**Before the church starts using this properly, two things must change:**

1. The starting passwords (`praxis-demo-2025`) are in the README and are therefore **public**. Every
   account needs its own password before real records go in.
2. Everyone should have their **own** account. A shared login means the audit log says "bishop" when
   the treasurer recorded a payment, and the whole point of the log is that it does not.

> **Changing your own password.** Press your name at the bottom of the sidebar and choose **Security**.
> It asks for your current password — the point of that is a copied token, not your memory — and when
> it saves, **every other session on your account ends**, including anything left signed in on another
> machine. If you have forgotten it, *Forgot your password?* on the sign-in screen emails you a link
> that can be used once. Whoever administers the system can also set a password for somebody who has
> lost access entirely, at `Admin → Users & Rights`.

## Who can see what

Four roles, set at `Admin → Users & Rights`:

| Role | Can do |
| --- | --- |
| **Super Administrator** | Everything, including the rights editor and the trash |
| **Administrator** | Everything the office needs day to day |
| **Church Staff** | Run the office; no Admin panel |
| **Viewer** | Home, Members, Giving and Reports — **read only** |

If a button you expect is missing, it is almost always a permission, not a fault. Ask for the role.

> A note for whoever administers the system: the sign-in box in the header's top right is a *preview*
> for super administrators only. If you set it to "viewer", **your own** screen narrows to what a
> viewer sees, so you can check that a volunteer is not shown the treasurer's buttons. Set it back to
> super admin when you are done.

---

## What is live

Everything. Every panel reads and writes the church's own records: nothing in the console saves a
typed-in note to itself any more, and nothing you enter needs entering twice.

**This is the table to check before entering a real record.** The two rows that are still waiting on
somebody outside the office are the ones about sending:

| Panel | State |
| --- | --- |
| Signing in · **Home** · **Members** · **Ministries** (departments and roles) · **Services & Worship** (planner, attendance, roster, reports) · **Church Council** (meetings, resolutions, documents) · `Giving → Tithes / Offerings / Project Funding / Welfare / Charity` · `Communications → Announcements / Events & Calendar / Prayer Requests / Birthdays & Milestones` · **Reports & Certificates** · `Admin → Finance Audit / Users & Rights / Trash / Audit Log` · **Settings** | Live — saved to the church's database, with the reason and the account that made each change in the Audit Log |
| `Communications → Broadcasts` (SMS and email) | Composed and recorded, and **refused rather than marked sent** until the church's email or SMS provider is connected. A notice sheet still prints and keeps the office's own count. Ask whoever runs the server when the provider will be live |

---

## Home

The morning glance. Real numbers, not estimates:

- **Active Members** — how many are on the roll, and how many of those are active.
- **Monthly Tithes & Offerings** — what has come in this month against the KSh 80,000 target, and how
  many days the month has left.
- **Active Ministries** — how many departments and fellowships are live.
- **Pending Board Actions** — resolutions still awaiting a decision.
- **Church Operational Activity** — the last things that actually happened, newest first, filtered by
  Giving / Pastoral / Ministries / Council.

The three buttons along the bottom are the ones you will use most: **Add Member**, **Record Tithe**,
**Schedule Meeting**. Recording a tithe here posts straight to the ledger — the Giving totals move at
the same moment.

---

## Members

- **Find Christian** — the register. Search by **any word of a name**, envelope number, phone or email:
  "Mary Wanjiku" and "Wanjiku Mary" both work. Click a row for the full record, and to print a baptism
  or baby-dedication certificate.
- **Add New Christian** — a new person on the roll. The register needs a first *and* a last name, and a
  phone number in the Kenyan format (`0712 345 678` or `+254 712 345 678`).
- **Import** (beside *Add Christian* on the register) — bringing in a list you already keep in Excel.
  Save the sheet as **CSV**, choose the file, say which column is which, then press **Check the file**.
  Nothing is added until you have read what every row would do: how many will be added, which are
  already on the register (those are skipped, not duplicated), and which rows need fixing before they
  can go in — with the column named. Then press **Import**. A first run of four hundred rows takes a
  minute, and running the same file twice adds nothing the second time.
- **Family Unit** — households. A household groups the people who live together, which is usually how
  the church visits, gives and follows up.
- **Delete Christian** — **retires** a record; it does not erase it, and the reason you give is kept
  with it. Bringing it back is `Admin → Trash` within thirty days, or a word to whoever runs the Praxis
  server afterwards — the record is never actually erased. Please give a reason: it is what makes the
  log useful later.

---

## Groups & Fellowships

The sidebar's **Groups & Fellowships** entry holds two different things, and knowing which is which
keeps the register honest:

- **Departmental / Leadership / Volunteer Roles** — who **serves**: the choir, the ushering team, the
  Sunday school teachers. A department has a leader answerable for it and a roll of the people
  working in it.
- **Groups & Fellowships** (the fourth tab) — who **belongs**: the midweek cell groups, fellowship
  circles and youth chapters that meet in homes. Convene one from the button on the register, name
  its meeting day and where it gathers, and open its card to keep the roll and record each
  gathering with the number that came. A circle cannot be retired while people still belong to it —
  take them off the roll first, the same rule as a department — and a retired circle is in the Trash
  like any other record.

The distinction matters when someone asks "who is in the choir?" (a department roll) versus "who
comes on Tuesdays?" (a circle's roll and its meeting counts).

---

## Services & Worship

- **Service Planner** — the services and the order of service: call to worship, praise, sermon,
  dismissal, with times. Schedule a service here and say what kind of gathering it is; **Edit**
  changes it, and the order is added beside it, one element at a time and in the order it runs.
  Print it for the platform.
- **Attendance** — the census: adults and youth, then children, recorded against the service. A named
  first-time visitor is recorded with their name rather than counted, because a name is somebody the
  church can follow up. Recording the census again corrects it rather than counting the congregation
  twice.
- **Volunteer Roster** — who is serving at which service, and swap requests when someone cannot. A
  volunteer asks for cover on their own duty from here; approving or declining the request is an
  administrator's decision, and approving moves the duty to the replacement.
- **Service Reports** — the write-up of a service once it is done. The census recorded against the
  service is shown beside it as a cross-check; the figures filed are the church's own. **Sign it off**
  closes the service and makes the report read-only — an administrator can still revise it afterwards,
  and the record says so.

---

## Giving & Stewardship

**Where to record today: the Record Tithe button on Home, or the Tithes ledger under Giving.** Both
post to the same ledger, and the Giving totals on Home move at the same moment. Record the tender
used (cash, M-PESA, cheque, card) with it. Sunday's plate and envelopes go in the **Offerings**
ledger, filed against the service they were taken at.

- **Project Funding** shows what has been banked and what is only pledged, separately and on purpose:
  a pledge is a promise, not money in the account.
- **Welfare** runs a case from request through approval to disbursement. Approving and paying are kept
  apart from raising the case.

**Every write that is live is recorded in a tamper-evident log** — nothing is recorded without a
trace, and the record cannot be quietly edited afterwards. If a figure looks wrong, open
`Admin → Finance Audit` and read what happened.

Mistakes in the ledger are **voided, never deleted** — a voided line stays visible with its reason,
which is exactly what a treasurer needs in an audit. Voiding is a separate act with a reason, and no
screen in the console performs it yet: ask whoever runs the Praxis server.

---

## Church Council

Board meeting logs, the resolutions tracker (proposed → voted → implementing → closed) and the
constitution, policies and other documents. A resolution's vote is a separate act from editing it, and
is recorded as such with the counts — the screen offers the Next Step the record is at, never a stage to
set.

Two things the screen states rather than asks. **Quorum is counted**: a sitting needs a majority of the
council roll, which is the people holding a named office in **Groups & Fellowships** — so recording
those offices is what gives the council its figure. And **sealing the minutes closes the sitting**: once
an administrator seals them the register and the minute are fixed, and only an administrator may change
them afterwards. A sitting or a document is retired to the **Trash** with a reason, never deleted.

A scanned copy of a by-law can be attached when the document is filed, which is what makes the
reference in a minute openable.

---

## Reports & Certificates

Three documents, printed from the live records on the church's own letterhead. There is no "download"
step: the browser's print dialog is the export, and **Save as PDF** is what files a copy.

- **Baptism and child dedication certificates.** Fill in the name, the officiant, the date the
  certificate should carry and the register number, and press print. The preview on screen is exactly
  what prints. For a member already on the register, the certificate is better issued from their care
  record in **Members → Find a Christian**, which fills all of that in for you and chooses the right
  document from what the register already knows about them.
- **Register summary.** How many are on the roll, their standing, the ordinances recorded, the
  households and the areas they live in — the page a council asks for.
- **Treasury summary.** The giving position for the period: tithes, offerings, projects, welfare and
  charity, with cash shown apart from pledges.

Every figure is computed at the moment you print, so a summary cannot disagree with the screens it came
from.

---

## Communications

Announcements, broadcasts, the events calendar, prayer requests (including marking one answered), and
upcoming birthdays and anniversaries.

### Broadcasts — email and SMS

A broadcast is composed, sent, and then *reported on*: if the gateway accepted the message, the campaign
shows how many actually reached a person and, when some did not, why. Those figures come from the
provider, not from this console.

Two things to know before you rely on it:

- **If the panel says a gateway is not configured, nothing will send.** The send button is disabled and
  says what has to be set. This is deliberate: a campaign marked "sent" over a provider that was never
  there is the one failure nobody notices until a family asks why they were never told.
- **An audience that resolves to no addresses is refused**, rather than reported as a cheerful zero.
  Check that the people you mean to reach have a phone number or an email on their register record.

A **printed notice sheet** is the third channel: it has no gateway to report on it, so you enter how
many copies went up and the record keeps your number.

---

## Groups & Fellowships, Inventory & Assets

**Groups & Fellowships** — departments and their rosters and leaders, the people serving on each and
the role they hold.

**Inventory & Assets** — the stock room and the property register. Each item carries a SKU or asset
number, a kind (**consumable** — counted in whole units, with a reorder level — or **asset**, with a
condition of good, fair or poor), its location, and a movement trail: receipts in, issues out,
transfers, and the periodic stock take whose approval is the only thing that moves stock. The ledger
always sums to the shelf: an issue that would take the count below zero is refused.

---

## Settings & Profile

The church's own identity — name, logo, contact details, service times — plus notification
preferences. The logo here is what appears on printed certificates.

**Delivery & storage** is the honest version of an integrations page: it reports whether email and SMS
are actually live, where the church's uploaded files are kept, and what to ask to have switched on. It
has no switches of its own on purpose — providers are credentials, and those belong with whoever runs
the server rather than in a browser.

### Data Sovereignty & Backup

Two things, and it is worth knowing which is which.

- **What this church holds** — how many members, households, giving records, meetings and so on are on
  the system right now, when the last change was recorded, and how much is sitting in the Trash.
- **Take a copy of your records** — an administrator can download one file holding the church's
  registers, ledgers, minutes, notices and staff list. Keep it somewhere the church controls, not on the
  machine the office uses to print.

The file is a copy, **not a restore point**: nobody can load it back into Praxis. The backup that
brings the system back after a disaster is taken on the server by whoever runs it, and this screen says
so. If somebody asks "can we get our data out if we stop using Praxis?" — this button is the answer.

### Subscription & Billing

What this church is on and what it owes. Four things on one screen:

- **Where you stand** — the plan, whether the church is in its free trial or paying, the dates on the
  subscription, and the days left.
- **What the church is using** — members on the register and staff accounts, each against the plan's
  limit. The two numbers that make a plan too small are these.
- **The plans** — what else is available and what each costs. Press **Request upgrade** and it goes to
  Praxis with a note from you; nothing changes until they confirm and the payment is recorded.
- **Payments received** — every payment Praxis has recorded, with the period it covers. This is the
  receipt; there is nothing to print.

Two things to know. Asking for a plan is all you can do from here — Praxis sets the plan and records
payments when the money arrives. And if the subscription lapses, the console closes with a message on
the screen rather than letting you carry on entering records that would be refused: **nothing is
deleted**, and everything is exactly as you left it when the payment is recorded.

If a strip appears above a panel saying the payment is due or the trial is ending, that is this screen
asking you to act. Press it to get here.

---

## Admin

All four panels are live:

- **Finance Audit** — the giving ledger and its integrity check (Verify Ledger). Read-only by design:
  voiding and restoring money are separate acts with reasons, kept out of the screen that reports on
  them. It also prints the treasury summary.
- **Users & Rights** — the accounts that can sign in, the role each holds, and what each role may see
  and do. What a role may see and do is enforced by the server, not only hidden on screen. An
  administrator can create an account and set a password for somebody who has lost access; everyone
  else changes their own under the account menu.
- **Trash** — everything retired in the last thirty days, each with the reason and by whom, and a
  restore button. Restoring puts the record back where it was; nothing is ever erased by retiring it.
- **Audit Log** — who changed what, when, and from where. This is the screen that answers "who
  removed that member?"

---

## When something goes wrong

| What you see | What to do |
| --- | --- |
| A card or list will not load | There is a **Retry** on the error itself. If it persists, the API may be down — tell whoever runs the server. |
| "Cannot reach the Praxis server" | The API is not running or not reachable. Nothing you did caused it, and nothing has been lost. |
| You retired the wrong record | Nothing was erased. Open `Admin → Trash` and press **Restore** on the row; the record goes back where it was. After thirty days it leaves the Trash but is still in the audit log. |
| You posted the wrong amount | Leave it. Open `Admin → Finance Audit` and read what happened, then ask whoever runs the server to **void** it with a reason. Do not record a correcting entry as if it were real giving. |
| You cannot see a panel | It is a permission. Ask for the role you need. |
| You cannot sign in | Use *Forgot your password?* on the sign-in screen — a link arrives by email and can be used once. If no email arrives (the church's mail provider may not be connected yet), ask whoever runs the Praxis server to set a password for you at `Admin → Users & Rights`. |
| The screen says something went wrong | The console has stopped drawing that screen on purpose and your data has not changed. Reload; if it repeats, tell whoever runs the server and send them the technical detail behind the message. |

---

## Three habits worth having

1. **Sign out** when you leave a shared machine. It is at the bottom of the sidebar under your name —
   press your name and choose **Sign out**. Signing out is what stops the next person seeing the giving
   screens under your name.
2. **Give a reason** on every retire and every void. Future-you is the person reading it.
3. **Never share a login.** The audit log is only worth the accounts behind it.
