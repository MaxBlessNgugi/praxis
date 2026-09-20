import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ARCHIVE_TABLES, restoreArchived } from '../lib/archive';
import { includingRetired, live } from '../lib/live';
import { page } from '../lib/respond';
import type { CreateRoleInput, ListAuditQuery, ListTrashQuery, UpdateRoleInput } from '../schemas/admin.schema';

/**
 * Admin: everything that has been retired, everything anyone did, and who is allowed to do what.
 *
 * The trash and the audit log both read tables that other modules write — `SoftDeletedRecord` and
 * `AuditLog` — so nothing here needs its own storage. What it adds is reach: a restoration that works
 * for any entity, and a history that can be read back per record.
 */

export async function listTrash(query: ListTrashQuery) {
  const where: Prisma.SoftDeletedRecordWhereInput = {
    ...(query.includeRestored ? {} : { restoredAt: null }),
    ...(query.entityName ? { entityName: query.entityName } : {}),
    ...(query.q
      ? {
          OR: [
            { entityLabel: { contains: query.q, mode: 'insensitive' as const } },
            { reasonLabel: { contains: query.q, mode: 'insensitive' as const } },
            { entityName: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data, byEntity, byReason] = await Promise.all([
    prisma.softDeletedRecord.count({ where }),
    prisma.softDeletedRecord.findMany({
      where,
      include: { deletedBy: { select: { id: true, name: true } }, restoredBy: { select: { id: true, name: true } } },
      orderBy: { deletedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.softDeletedRecord.groupBy({ by: ['entityName'], where: { restoredAt: null }, _count: true }),
    prisma.softDeletedRecord.groupBy({ by: ['reason'], where: { restoredAt: null }, _count: true }),
  ]);

  return {
    data: data.map((row) => ({ ...row, restorable: ARCHIVE_TABLES[row.entityName as keyof typeof ARCHIVE_TABLES] !== undefined })),
    meta: page(total, query),
    totals: {
      awaitingRestore: byEntity.reduce((sum, row) => sum + row._count, 0),
      byEntity: Object.fromEntries(byEntity.map((row) => [row.entityName, row._count])),
      byReason: Object.fromEntries(byReason.map((row) => [row.reason, row._count])),
    },
  };
}

/** The admin door: any entity this system knows how to bring back. */
export function restoreRecord(recordId: string, actorId: string) {
  return restoreArchived(recordId, actorId);
}

export async function listAudit(query: ListAuditQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityName ? { entityName: query.entityName } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
    ...(query.q ? { summary: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };

  const [total, data, byAction, byEntity, byActor] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLog.groupBy({ by: ['action'], _count: true }),
    prisma.auditLog.groupBy({ by: ['entityName'], _count: true }),
    prisma.auditLog.groupBy({ by: ['actorId'], _count: true, where: { actorId: { not: null } } }),
  ]);

  // Names for the actor filter: the ids the log actually carries, labelled for a dropdown.
  const actorNames = await prisma.user.findMany({
    where: { id: { in: byActor.map((row) => row.actorId).filter((id): id is string => id !== null) } },
    select: { id: true, name: true },
  });

  return {
    data,
    meta: page(total, query),
    totals: {
      byAction: Object.fromEntries(byAction.map((row) => [row.action, row._count])),
      byEntity: Object.fromEntries(byEntity.map((row) => [row.entityName, row._count])),
      byActor: Object.fromEntries(actorNames.map((row) => [row.id, row.name])),
    },
  };
}

/** One record's whole history, oldest first: what an auditor asks for by name. */
export async function recordHistory(entityName: string, entityId: string) {
  const [audit, finance] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityName, entityId },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.financeAuditEntry.findMany({
      where: { entityName, entityId },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { sequence: 'asc' },
    }),
  ]);

  if (audit.length === 0 && finance.length === 0) {
    throw new AppError(404, 'There is no history for that record', 'not_found');
  }

  return {
    entityName,
    entityId,
    audit,
    finance: finance.map((entry) => ({
      sequence: entry.sequence,
      action: entry.action,
      summary: entry.summary,
      actor: entry.actor,
      hash: entry.hash,
      previousHash: entry.previousHash,
      createdAt: entry.createdAt,
    })),
  };
}

// -------------------------------------------------------------------------------------------
// Rights
// -------------------------------------------------------------------------------------------

export async function listRoles() {
  const roles = await prisma.role.findMany({
    where: live,
    include: { _count: { select: { users: { where: live } } } },
    orderBy: { key: 'asc' },
  });

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    panels: role.panels,
    actions: role.actions,
    users: role._count.users,
  }));
}

export async function getRole(key: string) {
  const role = await prisma.role.findFirst({ where: { key, ...live } });
  if (!role) throw new AppError(404, 'That role does not exist', 'not_found');
  return role;
}

export async function createRole(input: CreateRoleInput, actorId: string) {
  // Retired roles too: the key is unique across the table, so reusing one would collide.
  const existing = await prisma.role.findFirst({ where: { key: input.key, ...includingRetired } });

  return prisma.$transaction(async (tx) => {
    if (existing) throw new AppError(409, `A role with the key "${input.key}" already exists`, 'role_exists');

    const role = await tx.role.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        panels: input.panels ?? {},
        actions: input.actions ?? {},
      },
    });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Role', entityId: role.id, summary: `Created the role ${role.key} (${role.name})` },
    });
    return role;
  });
}

/**
 * Changing what a role may do.
 *
 * Rights are re-read from the database on every request, so a change here takes effect on the next
 * request rather than on the next sign-in — which is the behaviour an administrator expects when they
 * take something away.
 */
export async function updateRole(key: string, input: UpdateRoleInput, actorId: string) {
  const before = await prisma.role.findFirst({ where: { key, ...live } });
  if (!before) throw new AppError(404, 'That role does not exist', 'not_found');
  if (before.key === 'super_admin' && (input.panels || input.actions)) {
    throw new AppError(409, 'The super administrator role cannot be narrowed; it is the way back in', 'protected_role');
  }

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.update({
      where: { id: before.id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.panels === undefined ? {} : { panels: input.panels as Prisma.InputJsonValue }),
        ...(input.actions === undefined ? {} : { actions: input.actions as Prisma.InputJsonValue }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Role',
        entityId: role.id,
        summary: `Changed the rights of ${role.key}`,
        before: { panels: before.panels as Prisma.InputJsonValue, actions: before.actions as Prisma.InputJsonValue },
        after: { panels: role.panels as Prisma.InputJsonValue, actions: role.actions as Prisma.InputJsonValue },
      },
    });
    return role;
  });
}
