import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma, type Db } from './prisma';

/**
 * The finance ledger's tamper-evidence.
 *
 * Each entry hashes its own fields together with the hash of the entry before it, so the entries form
 * a chain: changing an amount, editing a summary or deleting a row breaks every hash that follows it,
 * and `verifyFinanceLedger` says which entry it was. That is what "immutable" can honestly mean in a
 * database where rows are technically editable — not a promise that nobody will try, but the ability
 * to prove whether anybody succeeded.
 */

/** There is nothing before the first entry, so its previous hash is a run of zeroes. */
const GENESIS = '0'.repeat(64);

/**
 * One key for the whole ledger.
 *
 * `pg_advisory_xact_lock` is held until the transaction ends, so two payments recorded at the same
 * instant cannot both read "the last entry is 41" and both claim 42 — which would fork the chain in a
 * way no later check could repair. Advisory locks are re-entrant within a session, so acquiring it
 * twice inside one transaction is harmless.
 */
const LEDGER_LOCK = 4711;

export type FinanceAction = 'recorded' | 'voided' | 'restored' | 'approved' | 'declined' | 'disbursed' | 'updated';

export interface FinanceEntryInput {
  action: FinanceAction;
  entityName: string;
  entityId: string;
  summary: string;
  amount?: Prisma.Decimal | number | null;
  actorId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

export async function lockFinanceLedger(tx: Db): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEDGER_LOCK})`;
}

/** What `hashOf` reads. Stored rows satisfy this exactly, so verification can re-hash them as they are. */
interface HashableEntry {
  sequence: number;
  action: FinanceAction;
  entityName: string;
  entityId: string;
  amount: Prisma.Decimal | null;
  actorId: string | null;
  createdAt: Date;
  summary: string;
}

/**
 * The digest covers the fields joined by a delimiter rather than `JSON.stringify` of an object.
 * Key order is not something a hash may depend on: the same entry hashed twice must give the same
 * digest, or every verification would report a break that never happened.
 */
function hashOf(entry: HashableEntry, previousHash: string): string {
  const amount = entry.amount === null ? '' : entry.amount.toFixed(2);
  return createHash('sha256')
    .update(
      [
        previousHash,
        entry.sequence,
        entry.action,
        entry.entityName,
        entry.entityId,
        amount,
        entry.actorId ?? '',
        entry.createdAt.toISOString(),
        entry.summary,
      ].join('|'),
    )
    .digest('hex');
}

/**
 * Append one entry. Must be called inside the same transaction as the change it records, so a payment
 * can never be written without its ledger line — if the append fails, the payment rolls back with it.
 */
export async function appendFinanceEntry(tx: Db, input: FinanceEntryInput) {
  await lockFinanceLedger(tx);

  const previous = await tx.financeAuditEntry.findFirst({
    orderBy: { sequence: 'desc' },
    select: { sequence: true, hash: true },
  });
  const previousHash = previous?.hash ?? GENESIS;
  const createdAt = new Date();
  const entry: HashableEntry = {
    sequence: (previous?.sequence ?? 0) + 1,
    action: input.action,
    entityName: input.entityName,
    entityId: input.entityId,
    amount: input.amount === null || input.amount === undefined ? null : new Prisma.Decimal(input.amount),
    actorId: input.actorId ?? null,
    createdAt,
    summary: input.summary,
  };

  return tx.financeAuditEntry.create({
    data: { ...entry, previousHash, hash: hashOf(entry, previousHash), before: input.before, after: input.after },
  });
}

export interface LedgerVerification {
  entries: number;
  valid: boolean;
  brokenAt: number | null;
  detail: string | null;
}

/** Recompute the whole chain and report the first entry that does not add up, if any. */
export async function verifyFinanceLedger(): Promise<LedgerVerification> {
  const entries = await prisma.financeAuditEntry.findMany({ orderBy: { sequence: 'asc' } });
  const broken = (brokenAt: number, detail: string): LedgerVerification => ({
    entries: entries.length,
    valid: false,
    brokenAt,
    detail,
  });

  let previousHash = GENESIS;
  let expected = 1;

  for (const entry of entries) {
    if (entry.sequence !== expected) {
      return broken(entry.sequence, `Entry ${entry.sequence} follows ${expected - 1} — an entry has been removed`);
    }
    if (entry.previousHash !== previousHash) {
      return broken(entry.sequence, 'This entry does not link to the one before it, so the chain has been edited');
    }
    if (hashOf(entry, entry.previousHash) !== entry.hash) {
      return broken(entry.sequence, 'The stored hash does not match this entry, so it has been altered');
    }
    previousHash = entry.hash;
    expected += 1;
  }

  return { entries: entries.length, valid: true, brokenAt: null, detail: null };
}
