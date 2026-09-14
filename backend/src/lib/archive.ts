import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { AppError } from '../middleware/errorHandler';
import { appendFinanceEntry } from './financeAudit';
import { live } from './live';

/**
 * Retirement and restoration, for every module.
 *
 * Every module retires the same way — stamp `deletedAt`, write a `SoftDeletedRecord` with the reason,
 * the actor and a deadline, and add an audit line, all in one transaction — so it is written once
 * here. `ARCHIVE_TABLES` is the single list of what can be retired, read by both directions, so
 * nothing can be restorable without being retirable.
 *
 * What each module keeps is its own *checks* — a household with people in it, a ministry with a roll,
 * the last administrator — because those read like rules about that entity.
 */

/** Every archived entity, and the table its rows live in. */
export const ARCHIVE_TABLES = {
  Member: 'member',
  Household: 'household',
  User: 'user',
  Service: 'service',
  Ministry: 'ministry',
  Announcement: 'announcement',
  Broadcast: 'broadcast',
  Event: 'event',
  PrayerRequest: 'prayerRequest',
  Meeting: 'meeting',
  Resolution: 'resolution',
  GovernanceDocument: 'governanceDocument',
  Tithe: 'tithe',
  Offering: 'offering',
  Project: 'project',
  ProjectContribution: 'projectContribution',
  WelfareDisbursement: 'welfareDisbursement',
  CharityActivity: 'charityActivity',
} as const;

export type ArchivedEntityName = keyof typeof ARCHIVE_TABLES;

/** The archived names that represent money. Restoring one of these writes a ledger line. */
export const FINANCE_ENTITY_NAMES: ArchivedEntityName[] = [
  'Tithe',
  'Offering',
  'Project',
  'ProjectContribution',
  'WelfareDisbursement',
  'CharityActivity',
];

/**
 * Why a record was retired: `reason` is the category the Trash counts and filters on, `reasonLabel`
 * the sentence a person wrote. One list for the whole system; a module narrows it with `extract`.
 */
export const ARCHIVE_REASONS = [
  'duplicate',
  'wrong_entry',
  'wrong_amount',
  'wrong_member',
  'wrong_date',
  'bounced',
  'fraud_suspected',
  'transferred',
  'relocated',
  'deceased',
  'request',
  'disciplinary',
  'cancelled',
  'postponed',
  'account',
  'other',
] as const;

type ArchiveReason = (typeof ARCHIVE_REASONS)[number];

/** Prisma types each delegate separately and this module treats them alike. */
interface ArchiveDelegate {
  findFirst(args: { where: { id: string } & typeof live }): Promise<Record<string, unknown> | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

const delegateFor = (client: Prisma.TransactionClient | typeof prisma, table: string): ArchiveDelegate =>
  (client as unknown as Record<string, ArchiveDelegate>)[table] as ArchiveDelegate;

/**
 * Retirement changes more than a date for some entities, so restoring has to undo it: a retired
 * account is deactivated, and a retired member was marked inactive or deceased. Clearing only
 * `deletedAt` would bring back an account nobody can sign into.
 */
const ALSO_ON_RESTORE: Partial<Record<ArchivedEntityName, Record<string, unknown>>> = {
  User: { isActive: true },
  Member: { status: 'active' },
};

export interface RetireOptions {
  reason: ArchiveReason;
  reasonLabel: string;
  actorId: string;
  /** The label the Trash shows, read from the row inside the transaction. */
  label: (row: Record<string, unknown>) => string;
  /** What a missing row reports, in the words of the screen that asked. */
  missing: string;
  /** Anything else retirement changes on the row. */
  also?: Record<string, unknown>;
  /** The snapshot the Trash keeps. Defaults to the row as it stood. */
  snapshot?: (row: Record<string, unknown>) => Record<string, unknown>;
  /**
   * Work that has to commit with the retirement. One caller, deliberately: the finance module appends
   * its ledger line here, and a payment voided without its ledger line is the hole the chain closes.
   */
  after?: (tx: Prisma.TransactionClient, row: Record<string, unknown>) => Promise<void>;
}

/** Retires one record and returns the archive entry the Trash screen reads. */
export async function retireRecord(entity: ArchivedEntityName, id: string, options: RetireOptions) {
  const table = ARCHIVE_TABLES[entity];
  const deletedAt = new Date();

  return prisma.$transaction(async (tx) => {
    // Read inside the transaction, not before it: two retirements of the same row arriving together
    // would otherwise both pass an outside check and leave two archive entries for one record.
    const row = await delegateFor(tx, table).findFirst({ where: { id, ...live } });
    if (!row) throw new AppError(404, options.missing, 'not_found');

    const label = options.label(row);
    await delegateFor(tx, table).update({ where: { id }, data: { deletedAt, ...(options.also ?? {}) } });

    const archive = await tx.softDeletedRecord.create({
      data: {
        entityName: entity,
        entityId: id,
        entityLabel: label,
        reason: options.reason,
        reasonLabel: options.reasonLabel,
        // The one cast at the JSON boundary: these values came out of the database, so they are
        // exactly the shapes JSON stores.
        snapshot: (options.snapshot?.(row) ?? row) as Prisma.InputJsonValue,
        deletedById: options.actorId,
        restoreDeadline: new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: options.actorId,
        action: 'delete',
        entityName: entity,
        entityId: id,
        summary: `Retired ${label}: ${options.reasonLabel}`,
      },
    });

    await options.after?.(tx, row);

    return archive;
  });
}

/**
 * Bringing a retired record back, returning the restored row.
 *
 * Two doors lead here: the finance module's own trash, which may only touch money, and the admin
 * trash, which may touch anything. The `allow` list separates them; the behaviour is identical.
 */
export async function restoreArchived(recordId: string, actorId: string, allow?: readonly ArchivedEntityName[]) {
  const archived = await prisma.softDeletedRecord.findUnique({ where: { id: recordId } });
  if (!archived) throw new AppError(404, 'That archived record does not exist', 'not_found');

  const entity = archived.entityName as ArchivedEntityName;
  const table = ARCHIVE_TABLES[entity];
  if (!table) {
    throw new AppError(400, `A ${archived.entityName} is not something this system can restore`, 'not_restorable');
  }
  if (allow && !allow.includes(entity)) {
    throw new AppError(400, `That archived record is a ${archived.entityName}, which this screen does not restore`, 'wrong_door');
  }
  // Refused rather than repeated: a second restore would silently overwrite whatever has happened to
  // that record in the meantime.
  if (archived.restoredAt) throw new AppError(409, 'That record has already been restored', 'already_restored');

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // A row that no longer exists raises Prisma's `P2025`, which the error handler reports as a 404.
    const record = await delegateFor(tx, table).update({
      where: { id: archived.entityId },
      data: { deletedAt: null, ...(ALSO_ON_RESTORE[entity] ?? {}) },
    });
    await tx.softDeletedRecord.update({ where: { id: recordId }, data: { restoredAt: now, restoredById: actorId } });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'restore',
        entityName: archived.entityName,
        entityId: archived.entityId,
        summary: `Restored ${archived.entityLabel ?? archived.entityName}: ${archived.reasonLabel}`,
      },
    });

    // Money back in the books is a financial event even when the admin screen did the restoring.
    if (FINANCE_ENTITY_NAMES.includes(entity)) {
      await appendFinanceEntry(tx, {
        action: 'restored',
        entityName: archived.entityName,
        entityId: archived.entityId,
        summary: `${archived.entityLabel ?? archived.entityName} restored: ${archived.reasonLabel}`,
        actorId,
        before: { voided: true },
        after: { voided: false },
      });
    }

    return { entityName: archived.entityName, entityId: archived.entityId, restoredAt: now, record };
  });
}
