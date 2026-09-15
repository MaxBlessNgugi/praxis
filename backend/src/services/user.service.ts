import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { AppError } from '../middleware/errorHandler';
import { toPublicUser } from './auth.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import type { RetireReason } from '../schemas/common';
import type { CreateUserInput, ListUsersQuery, RoleKey, UpdateUserInput } from '../schemas/user.schema';

async function roleIdFor(roleKey: RoleKey): Promise<string> {
  const role = await prisma.role.findFirst({ where: { key: roleKey, ...live } });
  if (!role) throw new AppError(400, `The role "${roleKey}" is not configured on this installation`, 'unknown_role');
  return role.id;
}

async function audit(actorId: string, action: 'create' | 'update' | 'delete', userId: string, summary: string) {
  await prisma.auditLog.create({
    data: { actorId, action, entityName: 'User', entityId: userId, summary },
  });
}

export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...live,
    ...(query.roleKey ? { role: { key: query.roleKey } } : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { email: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: rows.map(toPublicUser),
    meta: page(total, query),
  };
}

export async function createUser(input: CreateUserInput, actorId: string) {
  if (input.memberId) await assertMemberExists(input.memberId);

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      roleId: await roleIdFor(input.roleKey),
      memberId: input.memberId ?? null,
    },
    include: { role: true },
  });
  await audit(actorId, 'create', created.id, `Created the account for ${created.name} as ${input.roleKey}`);
  return toPublicUser(created);
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  await findLive(prisma.user, id, 'That account does not exist');

  // Deactivating the last active administrator would leave the installation with nobody able to
  // administer it, and no way back in through the UI.
  if (input.isActive === false) await assertNotLastAdministrator(id);
  if (input.memberId) await assertMemberExists(input.memberId);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.email === undefined ? {} : { email: input.email.toLowerCase() }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.memberId === undefined ? {} : { memberId: input.memberId }),
    },
    include: { role: true },
  });
  await audit(actorId, 'update', id, `Updated the account for ${updated.name}`);
  return toPublicUser(updated);
}

export async function assignRole(id: string, roleKey: RoleKey, actorId: string) {
  const existing = await findLive(prisma.user, id, 'That account does not exist', { include: { role: true } });
  if (existing.role?.key === 'super_admin' && roleKey !== 'super_admin') await assertNotLastAdministrator(id);

  const updated = await prisma.user.update({
    where: { id },
    data: { roleId: await roleIdFor(roleKey) },
    include: { role: true },
  });
  await audit(actorId, 'update', id, `Changed ${updated.name}'s role from ${existing.role?.key ?? 'none'} to ${roleKey}`);
  return toPublicUser(updated);
}

/**
 * Retire an account: soft delete plus the archive row the console's Trash screen reads.
 *
 * The account row stays, so the audit trail keeps pointing at a real person rather than at a gap,
 * and the snapshot makes the restore possible months later.
 */
export async function removeUser(id: string, input: RetireReason, actorId: string) {
  const existing = await findLive(prisma.user, id, 'That account does not exist', { include: { role: true } });
  if (id === actorId) throw new AppError(400, 'You cannot retire your own account', 'self_delete');
  await assertNotLastAdministrator(id);

  return retireRecord('User', id, {
    ...input,
    actorId,
    missing: 'That account does not exist',
    label: (row) => String(row.name),
    also: { isActive: false },
    // The account as the Trash screen shows it, and never the password hash with it.
    snapshot: () => ({ id: existing.id, name: existing.name, email: existing.email, roleKey: existing.role?.key ?? null }),
  });
}

/** A link to a register record has to point at somebody real, or the FK failure arrives as a 409. */
async function assertMemberExists(memberId: string): Promise<void> {
  const member = await prisma.member.findFirst({ where: { id: memberId, ...live } });
  if (!member) throw new AppError(400, 'That member is not on the register', 'unknown_member');
}

/** Refuses an operation that would leave the installation with no active super_admin. */
async function assertNotLastAdministrator(id: string): Promise<void> {
  const others = await prisma.user.count({
    where: { id: { not: id }, ...live, isActive: true, role: { key: 'super_admin' } },
  });
  const target = await prisma.user.findFirst({
    where: { id, ...live, isActive: true, role: { key: 'super_admin' } },
  });
  if (target && others === 0) {
    throw new AppError(409, 'This is the last active super administrator — promote someone else first', 'last_administrator');
  }
}
