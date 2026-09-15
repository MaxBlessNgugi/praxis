#!/usr/bin/env node
/**
 * A database backup you can hold.
 *
 * `docs/backups.md` is the policy; this is the part of it that should not depend on somebody
 * remembering eight flags. It takes a `pg_dump` in the custom format, checks the result is really a
 * dump rather than an error message in a file, and prints the command that restores it.
 *
 *   node tools/backup-db.mjs                     # → backups/praxis-2026-09-15-1430.dump
 *   node tools/backup-db.mjs --out /mnt/usb      # somewhere that is not this machine
 *   node tools/backup-db.mjs --keep 8            # …and delete all but the newest eight there
 *   PG_DUMP="C:/Program Files/PostgreSQL/18/bin/pg_dump.exe" node tools/backup-db.mjs
 *
 * Three details are deliberate:
 *
 *   1. **The connection is passed as flags, never as a URL argument.** `pg_dump <url>` puts the
 *      database password in the process list, where every other process on the machine can read it.
 *      The password goes in `PGPASSWORD` instead, which is inherited by the child and visible to
 *      nobody else.
 *   2. **`--format=custom --no-owner`**, the two flags the policy explains: custom compresses and
 *      restores selectively with `pg_restore`, and `--no-owner` is what stops a restore onto a
 *      differently-named role failing on the first `ALTER … OWNER TO`.
 *   3. **The dump is verified before this exits 0.** A directory of zero-byte files is worse than no
 *      backup, because it is a backup somebody is counting on. Custom-format dumps start with the
 *      magic bytes `PGDMP`; anything else means `pg_dump` wrote an error where the data should be.
 *
 * It reads `backend/.env` when no URL is given, so the common case needs no arguments and no shell
 * history full of credentials.
 *
 * **Pruning happens only when asked for.** `--keep` is what deletes an old dump, and its absence is
 * what leaves every file alone — a backup script that quietly removes files is a backup script that
 * can delete the wrong ones. The date in the filename is what it sorts by, so the newest dump is the
 * one it protects.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readSync, readdirSync, rmSync, closeSync, statSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

/** The unpooled URL is the right one for a dump: a pooled connection can time out mid-transfer. */
function connectionUrl() {
  const explicit = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (explicit) return explicit;

  const envFile = join(ROOT, 'backend', '.env');
  if (!existsSync(envFile)) {
    fail('No DATABASE_URL, DIRECT_URL or backend/.env. Copy backend/.env.example to backend/.env and fill it in.');
  }
  const text = readFileSync(envFile, 'utf8');
  for (const key of ['DIRECT_URL', 'DATABASE_URL']) {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'));
    if (match) return match[1];
  }
  fail('backend/.env has no DIRECT_URL or DATABASE_URL in it.');
}

/**
 * `pg_dump` is not always on PATH — the Windows installer does not add it — so the installers that
 * keep it under a versioned directory are scanned, newest first, and `PG_DUMP` overrides everything.
 * A version mismatch is reported by the binary itself, which says more than this script could.
 */
function pgDumpBinary() {
  if (process.env.PG_DUMP) return process.env.PG_DUMP;
  // Through a shell so Windows finds `pg_dump.exe` by name; the command is a constant, never a value.
  if (spawnSync('pg_dump --version', { shell: true, stdio: 'ignore' }).status === 0) return 'pg_dump';

  const roots = [
    'C:/Program Files/PostgreSQL',
    '/usr/lib/postgresql',
    '/Applications/Postgres.app/Contents/Versions',
  ];
  const installed = roots.flatMap((root) => {
    try {
      // Newest first: an older pg_dump refuses a newer server, and the message it gives reads like a
      // connection problem rather than a version one.
      return readdirSync(root).sort().reverse().map((version) => join(root, version, 'bin', 'pg_dump'));
    } catch {
      return []; // that installer is not on this machine, which is the usual case
    }
  });
  const found = installed.flatMap((path) => [path, `${path}.exe`]).find((path) => existsSync(path));
  if (!found) {
    fail('Could not find pg_dump. Install the PostgreSQL client tools, or set PG_DUMP to its full path.');
  }
  return found;
}

function fail(message) {
  console.error(`backup: ${message}`);
  process.exit(1);
}

const url = new URL(connectionUrl());
const outDir = resolve(arg('out') ?? join(ROOT, 'backups'));
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const file = join(outDir, `praxis-${stamp}.dump`);

const dump = spawnSync(
  pgDumpBinary(),
  [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', decodeURIComponent(url.username),
    '--dbname', url.pathname.replace(/^\//, ''),
    '--file', file,
  ],
  {
    // Never on the command line, where the process list would show it to every other user.
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    stdio: ['ignore', 'inherit', 'inherit'],
  },
);

if (dump.error) fail(`could not run pg_dump: ${dump.error.message}`);
if (dump.status !== 0) fail(`pg_dump exited ${dump.status}. Nothing was written that is worth keeping.`);

/** Custom-format dumps begin `PGDMP`; anything else is an error message that landed in the file. */
const handle = openSync(file, 'r');
const magic = Buffer.alloc(5);
readSync(handle, magic, 0, 5, 0);
closeSync(handle);
if (magic.toString('utf8') !== 'PGDMP') {
  fail(`${file} is not a custom-format dump (starts with ${JSON.stringify(magic.toString('utf8'))}).`);
}

const { size } = statSync(file);
const kb = (size / 1024).toFixed(0);
console.log(`backup: wrote ${file} (${kb} KB) from ${url.hostname}:${url.port || '5432'}${url.pathname}`);

// Retention. `praxis-2026-09-15-1430.dump` sorts by name exactly as it sorts by time, so the newest
// files are the ones at the end and nothing has to be stat-ed or parsed.
const keep = arg('keep');
if (keep !== null) {
  const limit = Number.parseInt(keep, 10);
  if (!Number.isFinite(limit) || limit < 1) fail('--keep takes a number of dumps to keep, e.g. --keep 8');

  const dumps = readdirSync(outDir)
    .filter((name) => /^praxis-.*\.dump$/.test(name))
    .sort();
  const stale = dumps.slice(0, Math.max(0, dumps.length - limit));
  for (const name of stale) rmSync(join(outDir, name));
  console.log(
    stale.length
      ? `backup: kept the newest ${limit} of ${dumps.length} in ${outDir}, removed ${stale.length} older`
      : `backup: ${dumps.length} dump(s) in ${outDir}, all inside the retention of ${limit}`,
  );
} else {
  console.log('backup: nothing was pruned. Pass --keep <n> to keep only the newest n dumps in this directory.');
}

console.log('');
console.log('Rehearse the restore into a scratch database before you need it:');
console.log(`  pg_restore --dbname "postgresql://…/praxis_restore_check" --no-owner --clean "${file}"`);
