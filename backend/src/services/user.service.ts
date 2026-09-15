import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { AppError, forbiddenError } from '../middleware/errorHandler';
import type { AuthenticatedUser } from '../middleware/authenticate';
import { toPublicUser } from './auth.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import { requireTenantId } from '../lib/tenant';
import { assertWithinPlan } from './billing.service';
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

/**
 * Accounts are global, so the church is what narrows this list.
 *
 * A `User` cannot be tenant-scoped by the client extension — the same person may serve two parishes
 * — so the membership is the join that puts a name in front of the right office, and an account that
 * serves another church never appears in this one's list.
 */
export async function listUsers(query: ListUsersQuery) {
  const where = {
    ...live,
    // Both the membership and the role filter live on the membership: the role an account holds in
    // *this* church is the one the screen is about, and filtering on the account's own role would
    // answer a question about another parish.
    memberships: {
      some: {
        organizationId: requireTenantId(),
        isActive: true,
        ...live,
        ...(query.roleKey ? { role: { key: query.roleKey } } : {}),
      },
    },
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
      include: {
        role: true,
        memberships: {
          where: { organizationId: requireTenantId(), isActive: true, ...live },
          include: { role: true },
        },
      },
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    // The membership's role, falling back to the account's own for a login created before
    // memberships existed. One person can administer one parish and only read another, and this
    // screen belongs to one of them.
    data: rows.map((row) => toPublicUser(row, row.memberships[0]?.role ?? row.role)),
    meta: page(total, query),
  };
}

export async function createUser(input: CreateUserInput, actorId: string) {
  // The plan's ceiling on accounts, checked here for the same reason the register's is checked in
  // `member.service`: the rule belongs where the thing is created.
  await assertWithinPlan('maxUsers');

  if (input.memberId) await assertMemberExists(input.memberId);

  const roleId = await roleIdFor(input.roleKey);
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      roleId,
      memberId: input.memberId ?? null,
      // An account with no church could sign in and then reach nothing, so it is created straight
      // into the office that made it, in the role it was created with.
      memberships: { create: { organizationId: requireTenantId(), roleId, isDefault: true } },
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

  const roleId = await roleIdFor(roleKey);
  const updated = await prisma.user.update({
    where: { id },
    data: {
      roleId,
      // The membership is what governs rights in a church, so a role change that only touched the
      // account would leave the two disagreeing — and the membership would win. The church is named
      // here because a nested write is the one place the tenant-scoped client cannot reach: the
      // extension stamps rows a create brings with it, but a bulk update inside a relation is beyond
      // its reach. Without this, a role change in one parish would rewrite them in every other one
      // the person serves.
      memberships: { updateMany: { where: { organizationId: requireTenantId(), ...live }, data: { roleId } } },
    },
    include: { role: true },
  });
  await audit(actorId, 'update', id, `Changed ${updated.name}'s role from ${existing.role?.key ?? 'none'} to ${roleKey}`);
  return toPublicUser(updated);
}

/**
 * An administrator setting somebody else's password.
 *
 * The office case is ordinary — a secretary has forgotten hers and there is nobody else to ask. It
 * needs the current password *not* to be known, which is exactly why it is a privilege: whoever can
 * call this can take over an account. So an `admin` may reset an `admin`, a `staff` member or a
 * viewer, and only a `super_admin` may reset a `super_admin`. Without that line, an administrator
 * could reset the pastor's password and sign in as the pastor.
 *
 * Nobody is told the new password in a response body: the administrator typed it, and the account
 * holder is told out of band.
 */
export async function resetPassword(id: string, password: string, actor: AuthenticatedUser): Promise<void> {
  const target = await findLive(prisma.user, id, 'That account does not exist', { include: { role: true } });
  if (target.role?.key === 'super_admin' && actor.roleKey !== 'super_admin') {
    throw forbiddenError('Only a super administrator can reset another super administrator’s password');
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null },
  });
  await audit(actor.id, 'update', id, `Reset the password for ${target.name}`);
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

/**
 * Refuses an operation that would leave *this church* with no active super administrator.
 *
 * Scoped by membership rather than by the account's own role, which matters now that more than one
 * church shares the installation: counting every super administrator on the platform would call
 * another parish's pastor "someone else" and let this church disable the only administrator it has.
 * The account's role is a default; the membership is what governs rights here.
 */
async function assertNotLastAdministrator(id: string): Promise<void> {
  const organizationId = requireTenantId();
  const others = await prisma.user.count({
    where: {
      id: { not: id },
      ...live,
      isActive: true,
      memberships: { some: { organizationId, ...live, role: { key: 'super_admin' } } },
    },
  });
  const target = await prisma.user.findFirst({
    where: {
      id,
      ...live,
      isActive: true,
      memberships: { some: { organizationId, ...live, role: { key: 'super_admin' } } },
    },
  });
  if (target && others === 0) {
    throw new AppError(409, 'This is the last active super administrator — promote someone else first', 'last_administrator');
  }
}
