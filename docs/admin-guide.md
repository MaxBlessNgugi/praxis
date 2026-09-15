# Praxis — Administrator & Owner Guide

For the person who runs the church's console: the senior pastor, the parish administrator, the one who
decides who gets an account. It is about **authority** rather than tasks — what each panel is for, who
may see it, and what the church is accountable for. The day-to-day sequences are in
[`staff-quick-start.md`](./staff-quick-start.md); this is the layer above it.

Two things are worth knowing before anything else:

- **Every right is enforced by the API.** Hiding a button is a courtesy; the server refuses the request
  whether or not the button was drawn. A determined viewer with a copied token still cannot write.
- **Everything consequential is logged.** Who changed what, with a before and after, in a log the
  church can read and nobody can edit. If a decision matters enough to argue about later, it is in
  there.

---

## 1. The panels, and who they are for

| Panel | What it holds | Usually belongs to |
| --- | --- | --- |
| **Home** | Today's figures, recent activity, quick actions | Everyone |
| **Members** | The register: members, households, pastoral care, the Trash for retired records | The office, pastoral team |
| **Services & Worship** | Service planner, order of worship, attendance, volunteer roster, service reports | The worship leader and ushers |
| **Church Council** | Meetings, resolutions with their decision workflow, the constitution and by-laws | The secretary and the council |
| **Giving & Stewardship** | Tithes, offerings, project funding, welfare, charity, the giving ledger | The treasurer (and the pastor, to read) |
| **Inventory & Assets** | Church property and its state | The administrator |
| **Groups & Fellowships** | Departments, leadership roles, volunteers | The ministry coordinators |
| **Reports & Certs** | Overview and filtered reports, certificates, the AGM dossier | The secretary and the pastor |
| **Communications** | Announcements, broadcasts (email/SMS), events, prayer requests, birthdays | The office |
| **Settings & Profile** | The church's own details, service times, subscription, integrations, data & backup | Owners and administrators |
| **Admin** | Accounts and rights, the Trash, the audit log, the finance audit | Owners only |

`Admin` is the panel that decides the others. Grant it deliberately: whoever holds it can give
themselves anything, which is the point of it and the reason to be sparing.

---

## 2. Roles and permissions

Four roles ship with the platform. They are templates, not suggestions — the console and the API both
read them.

| | Super administrator | Administrator | Church staff | Viewer |
| --- | --- | --- | --- | --- |
| **Panels visible** | All eleven | All eleven | All except **Admin** | Home, Members, Giving, Reports |
| **View records** | Yes | Yes | Yes | Yes |
| **Create and edit records** | Yes | Yes | Yes | **No** |
| **Delete / retire records** | Yes | Yes | **No** | **No** |
| **Manage accounts and rights** | Yes | Yes | No | No |
| **Change the church profile and subscription** | Yes | Yes | No | No |
| **Download the church's data export** | Yes | Yes | No | No |

Notes that matter more than the grid:

- **Staff cannot delete.** A church secretary can correct a member's record all day and cannot remove
  one. That is deliberate: retiring a record is the step that loses information, so it stays with the
  people answerable for it.
- **Viewer is not a lesser staff account.** A viewer is a reader: four panels, no writes anywhere. Use
  it for a volunteer who needs the register, or for a council member who should see the giving
  summaries without being able to alter them.
- **Super administrator and Administrator hold the same rights today.** The distinction is intent:
  name one or two people as *super* administrators — the pastor and the parish administrator — so that
  when the rights differ (and on a multi-campus church they will), the accounts that should keep the
  wider set already do.
- **Rights are per church.** If a person serves two churches, they hold a separate role in each, and
  the console shows them only the church they are signed into. Switching churches is a deliberate act,
  not a view they can drift into.

### Day-to-day account practice

1. **One account per person.** Never a shared log-in: the audit log can only be trusted if each line
   names a person.
2. **The smallest role that does the job.** A treasurer is an administrator over giving and a viewer
   everywhere else if that is what the church wants; start narrow and widen on request.
3. **When someone leaves**, disable the account rather than deleting it. Disabling stops the sign-ins
   and keeps the history of what they did.
4. **Look at the audit log occasionally.** Not for suspicion — for the ordinary question, "who changed
   this and why", asked months after the fact with no memory of it.

---

## 3. What the church is accountable for

Praxis stores a congregation's personal data, so the duty is the church's. The short version, with the
longer one in **Settings &rarr; Data &amp; backup &rarr; Privacy, terms and data protection**:

- **Know why each record is held.** Pastoral care and church administration are ordinary grounds.
  Sending an SMS or an email to a member needs their agreement, and it is worth writing down that you
  have it.
- **Collect little.** A phone number kept "just in case" is a liability with no purpose attached. Blank
  fields are free.
- **Mark sensitive things sensitive.** A prayer request flagged private is not shown on any list; give
  careful wording to anything that is, because an SMS has no confidentiality.
- **Every person their own account**, so the audit trail can name them.
- **Report a breach the same day.** Kenya's Data Protection Act expects the Office of the Data
  Protection Commissioner to hear about a personal data breach without undue delay and, where
  feasible, within 72 hours. It has to reach somebody who can act, so both the church's contact and
  the operator's are worth pinning to the office wall.
- **Retain what you must.** Giving records and minutes are accounting and governance documents. Erasing
  a member's contact details is a different thing from erasing the church's books, and the Act allows
  for the difference.

---

## 4. Subscription, trial and what happens if you stop paying

- **Every new church starts on a free trial** with the full feature set — no card, no card number
  asked for. The days remaining are on **Settings &rarr; Subscription** the whole time.
- **Plans differ by size, not by module.** The published plans (Mustard Seed, Harvest, Sanctuary) list
  their member and account limits on the upgrade screen; a larger parish is quoted directly.
- **When a trial ends**, the console keeps every record and stops accepting new writes. Nothing is
  deleted and nothing is held hostage: the church can still read its records and export them, and
  paying restores writing immediately.
- **Payment is by invoice** while billing is handled directly by the operator. The subscription status
  and history are visible to administrators — a church should never have to ask whether it is paid up.
- **A suspended church is refused at sign-in** with a message that says so. Support can reactivate it
  in a moment; the records were never at risk.

---

## 5. Your data, and taking it with you

- **The records belong to the church.** Praxis is the processor: it stores and organises the church's
  data on the church's instructions.
- **Export any time** from Settings &rarr; Data &amp; backup — an administrator downloads a readable
  copy of what the church holds. Do it before a big change, before an audit, and once a year for the
  church's own archive.
- **Export is not a backup.** It is a copy for people; the thing that protects against a lost database
  is the scheduled PostgreSQL backup described in [`backups.md`](./backups.md). Both are worth having.
- **Deleting a record in the console retires it** to the Trash, where it can be restored. Emptying the
  Trash is the deliberate act; a mistaken click is not.
- **On leaving**, the church takes a full export and the data is removed from the live database.

---

## 6. Handing over the console

When a pastor moves on or an administrator changes, the handover is short but should still be done in
order:

1. Give the incoming person an account with the right role — **Super administrator** if they are taking
   charge.
2. Ask them to change the password from a machine they control, on their first sign-in.
3. **Disable** the outgoing account, don't delete it. Their work stays attributable.
4. Walk the incoming person round these four screens: Home, Members, Giving, and Admin &rarr; Audit
   log. Those four are enough to run the office and to see that the system is honest.
5. Hand over this guide and [`staff-quick-start.md`](./staff-quick-start.md), and change any shared
   address that still points at the person who has left.

---

## 7. Where to get help

- **Something is wrong with a figure** — Admin &rarr; Audit log tells you who changed the record and
  when; Admin &rarr; Finance audit recomputes the giving ledger and names the first entry that no
  longer adds up.
- **Somebody cannot sign in** — an account locks for fifteen minutes after five wrong passwords, and
  the message says so. A forgotten password is reset by an administrator from Admin &rarr; Users &amp;
  roles.
- **The console will not load** — Settings &rarr; Data &amp; backup reports whether the server is
  reachable, and the request id on any error screen is what support needs to find the request again.
- **Anything else** — contact the operator through the address on your invoice.
