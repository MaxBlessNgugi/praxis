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
   account needs its own password before real records go in — see the note below, because this is not
   something you can do from inside the console yet.
2. Everyone should have their **own** account. A shared login means the audit log says "bishop" when
   the treasurer recorded a payment, and the whole point of the log is that it does not.

> **Passwords are set for you, not by you.** A password is chosen when an account is created, and there
> is no "change password" screen in the console yet. Until there is, a password is changed by whoever
> runs the Praxis server. Set that expectation with your team before they start using their own
> logins, so nobody discovers it on a busy Monday morning.

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

## What is live today, and what is not

Praxis is being switched on a section at a time, so that nothing is entered twice and nothing is typed
into a screen that cannot keep it. **This is the table to check before entering a real record.**

| Live — it is saved | Not yet — sample data, it saves nothing |
| --- | --- |
| Signing in · **Home** (the figures, the activity list, and all three quick actions) · **Members** (find, add, retire, families) · **Announcements** · `Giving → Project Funding / Welfare / Charity` · `Admin → Finance Audit` · `Settings → Church Identity` | `Giving → Tithes` and `Giving → Offerings` · **Services & Worship** (planner, attendance, roster, reports) · **Church Council** · **Reports & Certs** · **Communications** (events, prayer, birthdays, broadcasts) · `Admin → Users & Rights`, `Trash`, `Audit Log` · **Groups & Fellowships** · **Inventory & Assets** · the other **Settings** panels |

A screen that is not live still works as a preview: it is how the office decides what to change before
a section is switched on. Nothing you type into one is lost or half-saved — it simply is not saved.

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
- **Family Unit** — households. A household groups the people who live together, which is usually how
  the church visits, gives and follows up.
- **Delete Christian** — **retires** a record; it does not erase it, and the reason you give is kept
  with it. Bringing one back is not something the console can do yet (`Admin → Trash` is sample data),
  so ask whoever runs the Praxis server — the record is still there. Please give a reason: it is what
  makes the log useful later.

---

## Services & Worship

- **Service Planner** — the services and the order of service: call to worship, praise, sermon,
  dismissal, with times. Print it for the platform.
- **Attendance** — record who was present.
- **Volunteer Roster** — who is serving at which service, and swap requests when someone cannot.
- **Service Reports** — the summary of a service once it is done.

---

## Giving & Stewardship

**Where to record today: the Record Tithe button on Home.** It posts to the ledger, and the Giving
totals on Home move at the same moment. Record the tender used (cash, M-PESA, cheque, card) with it.
The **Tithes** and **Offerings** ledgers under Giving are not live yet, so do not enter Sunday's
collection there.

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
is recorded as such with the counts.

---

## Reports & Certs

Overview, membership, giving, attendance, ministries and governance, over any date range you choose.
Reports can be printed from the browser.

*(Certificate printing for baptism and dedication lives on the member's record in **Members**.)*

---

## Communications

Announcements, the events calendar, prayer requests (including marking one answered), and upcoming
birthdays and anniversaries.

> **Email and SMS do not go out yet.** They are running in a "console" mode that writes the message to
> the server's log instead of sending it, so a broadcast can be prepared and reviewed safely. Nothing
> will reach the congregation until a provider is connected and credentials are added — ask before
> telling anyone otherwise.

---

## Groups & Fellowships, Inventory & Assets

Departments and their rosters and leaders; and the church's equipment and assets with their condition
and location.

---

## Settings & Profile

The church's own identity — name, logo, contact details, service times — plus notification
preferences. The logo here is what appears on printed certificates.

---

## Admin

**Only Finance Audit is live.** The other three show sample data today:

- **Finance Audit** — **live.** The giving ledger and its integrity check (Verify Ledger). Read-only
  by design: voiding and restoring money are separate acts with reasons, kept out of the screen that
  reports on them.
- **Users & Rights** — **sample data.** Accounts are created by whoever runs the server.
- **Trash** — **sample data.** Its restore button changes only the screen's own sample rows, so a
  record retired for real is not brought back by pressing it, whatever the message says.
- **Audit Log** — **sample data.** The API records every change already; the screen that reads it is
  still to come.

---

## When something goes wrong

| What you see | What to do |
| --- | --- |
| A card or list will not load | There is a **Retry** on the error itself. If it persists, the API may be down — tell whoever runs the server. |
| "Cannot reach the Praxis server" | The API is not running or not reachable. Nothing you did caused it, and nothing has been lost. |
| You retired the wrong record | Nothing was erased. Bring it back by telling whoever runs the Praxis server the name and roughly when it happened — `Admin → Trash` cannot do it yet. |
| You posted the wrong amount | Leave it. Open `Admin → Finance Audit` and read what happened, then ask whoever runs the server to **void** it with a reason. Do not record a correcting entry as if it were real giving. |
| You cannot see a panel | It is a permission. Ask for the role you need. |
| You cannot sign in | Tell whoever runs the Praxis server. A password is chosen when your account is created, and there is nothing in the console that changes one. |
| The screen says something went wrong | The console has stopped drawing that screen on purpose and your data has not changed. Reload; if it repeats, tell whoever runs the server and send them the technical detail behind the message. |

---

## Three habits worth having

1. **Sign out** when you leave a shared machine. Signing out is what stops the next person seeing the
   giving screens under your name.
2. **Give a reason** on every retire and every void. Future-you is the person reading it.
3. **Never share a login.** The audit log is only worth the accounts behind it.
