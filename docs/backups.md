# Backups and recovery

Praxis holds the church's register, its giving ledger and its council records. This is the plan for
getting them back.

The short version: **the database is the thing to back up**, the provider's automatic backups are the
primary mechanism, and the in-app Trash and Audit Log are a safety net for mistakes — not a backup.

---

## What actually needs backing up

| What | Where it lives | Backup? |
| --- | --- | --- |
| Members, households, ministries | PostgreSQL | **Yes** — the whole point |
| Giving, welfare, charity, the finance ledger | PostgreSQL | **Yes** |
| Services, liturgy, attendance, rosters | PostgreSQL | **Yes** |
| Announcements, events, prayer, documents | PostgreSQL | **Yes** |
| Users, roles, audit log, trash | PostgreSQL | **Yes** |
| Uploaded logos, photos, scanned minutes | PostgreSQL by default (`STORAGE_DRIVER=database`) | **Yes** — covered by the same dump |
| Uploaded files, if you switch to `STORAGE_DRIVER=s3` | The bucket | **Yes** — the bucket's own versioning, and it is then *not* in the dump |
| `.env` / secrets | The host's dashboard | Store a copy in the church's password manager |

Because uploads default to living in Postgres, a single `pg_dump` we get everything. If you switch to
S3, the dump stops containing the bytes and the bucket becomes a second thing to protect — that is the
cost of the switch, and it is worth knowing before making it.

---

## The primary mechanism: the provider's automatic backups

If the church runs on **Neon**, this is already handled and there is very little to do:

- **Point-in-time restore** is on for every project. You can restore to any moment inside the
  retention window, which for the free tier is 24 hours and for paid plans is up to 30 days.
- **Branching** is the cheaper habit for a *planned* change: branch the database, try the migration
  there, throw the branch away. It costs a minute and never touches production.
- Confirm the retention window on the project's settings page and **write the number down here**, in
  this file, when you check it. A backup policy nobody has confirmed is a hope, not a policy.

If the church runs on **Railway, Render or Fly** with a managed Postgres, the equivalent setting is
usually called *backups* or *snapshots* on the database's own page. Turn it on before the first real
Sunday.

---

## The portable backup: `pg_dump`

Automatic backups are tied to the provider. A `pg_dump` is a file you can hold, which is what you want
before a risky change and what you want if you ever move hosts.

**Use the script rather than typing the flags.** `npm run backup` (that is `tools/backup-db.mjs`) runs
the dump below, checks the file really is a custom-format dump instead of an error message that
landed in it, and prints the command that restores it. It reads `backend/.env`, so no credentials end
up in your shell history, and it hands the password to `pg_dump` through the environment — `pg_dump
<url>` puts the password in the process list, where anything else on the machine can read it.

```bash
npm run backup                        # → backups/praxis-2026-09-15-1430.dump, git-ignored
npm run backup -- --out /mnt/usb      # straight onto the drive that leaves the building
npm run backup -- --keep 8            # …and delete all but the newest eight there
```

**Retention.** `--keep` is the only thing that deletes a dump, and it deletes from the *end* of the
list by date, keeping the newest. Leaving it off is the safe default: the script writes a file and
touches nothing else. Eight weekly dumps is two months, which is the point at which a giving
discrepancy is usually noticed — see the cadence below.

```bash
# A complete dump, schema and data, in a form that restores cleanly.
# Use DIRECT_URL (the unpooled connection) — a pooled connection can time out mid-dump.
# The same thing by hand, for when the script is not to hand:
pg_dump "$DIRECT_URL" --format=custom --no-owner --file="praxis-$(date +%F-%H%M).dump"

# Read it back into a scratch database first. Never test a restore into production.
createdb praxis_restore_check
pg_restore --dbname="postgresql://…/praxis_restore_check" --no-owner praxis-2026-09-15-0900.dump
```

Two details that matter:

- **`--format=custom`** rather than plain SQL. It compresses, and it restores with `pg_restore`, which
  can skip individual tables and run in parallel.
- **`--no-owner`** because the roles on the machine you restore onto are almost never the roles on the
  machine you dumped from. Without it, a restore onto Neon fails on the first `ALTER … OWNER TO`.

Before every risky migration, take one. It costs seconds and it is the only thing that makes the
migration reversible.

### Putting it on a schedule

The habit is easy to start and easy to lose, so the command belongs in a scheduler rather than in
somebody's memory. Both of these write to a directory that leaves the machine — a synced folder, an
attached drive, or a bucket-mounted path — and prune to the newest eight.

```bash
# Linux / macOS — every Sunday at 02:00, from the repository root.
0 2 * * 0  cd /srv/praxis && /usr/bin/node tools/backup-db.mjs --out /mnt/backups --keep 8 >> /var/log/praxis-backup.log 2>&1
```

```powershell
# Windows — Task Scheduler, Weekly, Sunday 02:00, running:
C:\Program Files\nodejs\node.exe C:\praxis\tools\backup-db.mjs --out D:\praxis-backups --keep 8
```

Two things to check the first time it runs: the log line says **`wrote … .dump (… KB)`** rather than
an error from `pg_dump`, and the file dated today is in the output directory. A scheduled job that
silently produces nothing is the failure this whole document exists to prevent, and the only way to
know is to look once.

### The copy a church can take itself

`Settings → Data & backup` offers an administrator a JSON file of the church's own registers, ledgers,
minutes, notices and staff list — with retired rows included, no credentials, and the file contents
listed but not embedded. It is written into the audit log when taken.

That file is for the church, not for recovery: it cannot be restored into Praxis. Its purpose is
sovereignty — a church can hold its own data, read it, and take it elsewhere — and it is deliberately
*not* a substitute for the dump above.

**Suggested cadence for a single congregation:** the provider's automatic backups continuously; a
`pg_dump` kept in the church's Drive or S3 bucket weekly; and one more taken by hand immediately before
any schema migration. Keep at least four weeks of weekly dumps — giving totals are usually discovered to
be wrong about three weeks later, and that is when you want the old file.

---

## Trash and the Audit Log are not backups

They are worth being precise about, because they feel like backups and are not.

**Trash** (`Admin → Trash`) is soft delete. Retiring a member, an announcement or a fund sets
`deletedAt` rather than removing the row, so anything retired **in the app** can be listed and restored.
It does not survive a dropped table, a bad `DELETE` run by hand, or a lost database. And it only covers
records the app knows how to retire — not, for example, a role deleted straight in SQL.

**The Audit Log** (`Admin → Audit Log`, and the finance ledger under `Admin → Finance Audit`) records who
changed what, with a before-and-after. It is how you find *what* to restore and *who* to ask. It is not
a copy of the data.

The finance ledger is the one with a real integrity guarantee: every entry carries a hash of the entry
before it, and **Verify Ledger** recomputes the chain and reports the first entry that does not match.
That detects tampering, not loss. Restoring from a dump is what fixes loss.

---

## Recovering, in order

1. **A record was retired by mistake.** Restore it from `Admin → Trash`. Nothing else is needed — this
   is the common case and it never touches a backup.
2. **Someone needs to know what changed.** `Admin → Audit Log`, filtered by entity. Then act on it.
3. **A bad change was made and you can see it in the audit log.** Correct it in the app if the screen
   allows it. Prefer this: it keeps the audit trail honest, and the correction is itself recorded.
4. **A migration or a script did real damage.** Restore. From the provider's point-in-time restore if
   the window covers it; otherwise restore the most recent `pg_dump` into a new database, point the API
   at it, and accept the loss of everything after the dump.
5. **The host is gone.** Restore the newest dump onto a fresh managed Postgres, deploy `backend/` with
   the new `DATABASE_URL`, and redeploy the console. `docs/cloud-deploy.md` walks through the variables.

After any restore: sign in, open **Home** and confirm the member and giving totals look right, then run
**Admin → Finance Audit → Verify Ledger** to confirm the chain is intact. A restore that produced a
broken ledger is worse than one that is a few hours stale, and this is the only check that catches it.

---

## Rehearsing it

A backup you have never restored is a file you are hoping about. Once, when the church is quiet:

1. Take a fresh `pg_dump`.
2. Restore it into a scratch database.
3. Point a local API at the scratch database and run `node tools/smoke.mjs`.
4. Confirm the smoke test passes, then delete the scratch database.

That whole loop is about ten minutes, and it is the difference between having a backup and having
recovery. Put a note in the calendar for it once a quarter.

---

## What is not covered yet

- **No automated off-site dump in the product.** The scheduled job above is an instruction, not
  something Praxis runs: a container that dumps its own database has to hold credentials for the
  place it dumps to, and the provider's own backups already cover the machine. If an off-site copy is
  wanted, the cron line above is how it is taken, on a host somebody owns.
- **No restore drill has been run against a real church database** — Praxis has not yet held live data.
  Do the rehearsal above before the first real Sunday, not after the first incident.
- **`STORAGE_DRIVER=s3` is reserved, not implemented.** If you enable it later, the bucket needs its own
  versioning and its own place in this document.
