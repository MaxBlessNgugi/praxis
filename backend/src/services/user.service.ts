import { prisma } from '../lib/prisma';
import { generateResetToken, hashPassword, hashResetToken } from '../lib/auth';
import { emailStatus, sendEmail } from '../lib/email';
import { env } from '../config/env';
import { AppError, forbiddenError } from '../middleware/errorHandler';
import type { AuthenticatedUser } from '../middleware/authenticate';
import { toPublicUser } from './auth.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import { requireTenantId } from '../lib/tenant';
import { assertWithinPlan } from './billing.service';
import type { RetireReason } from '../schemas/common';
import type { CreateUserInput, InviteUserInput, ListUsersQuery, RoleKey, UpdateUserInput } from '../schemas/user.schema';

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
          // The screen shows every church the account serves, not only this one — that is the point
          // of the column — so the list is deliberately not narrowed to the active tenant.
          where: { isActive: true, ...live, organization: { deletedAt: null } },
          include: { role: true, organization: { select: { name: true } } },
        },
      },
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    // The membership's role **in this church** — found by the tenant, not by array order, because
    // the include above deliberately spans every church the account serves — falling back to the
    // account's own for a login created before memberships existed. One person can administer one
    // parish and only read another, and this screen belongs to one of them.
    data: rows.map((row) => ({
      ...toPublicUser(
        row,
        row.memberships.find((membership) => membership.organizationId === requireTenantId())?.role ?? row.role,
      ),
      // The activation-pending marker the accounts screen offers its re-invite action against.
      isInvited: row.isInvited,
      // The churches this account serves, with its role in each — what the accounts screen shows
      // beside a name so an office knows who they are looking at before they pick up the phone.
      churches: row.memberships.map((membership) => ({
        id: membership.organizationId,
        name: membership.organization.name,
        roleKey: membership.role?.key ?? null,
      })),
    })),
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

/**
 * Invite an account: create it with no password and let its owner choose one through an emailed
 * activation link.
 *
 * This is the flow the office actually wants — "give the treasurer access" — and it replaces the
 * administrator-invents-a-password habit, where a password chosen by somebody who will never use it
 * is then handed across a desk and often never changed. The activation link reuses the password
 * reset machinery exactly: the same single-use, expiring, hashed token rows and the same `/?reset=`
 * screen, so there is one way into an account and it is already audited.
 *
 * The answer reports whether a link could be emailed; when no provider is configured the administrator
 * is shown the link itself in development, and in production is told to hand it over in person —
 * the same honest posture the reset request takes.
 */
export async function inviteUser(
  input: InviteUserInput,
  actor: AuthenticatedUser,
): Promise<{ user: ReturnType<typeof toPublicUser>; canSendEmail: boolean; devLink?: string }> {
  await assertWithinPlan('maxUsers');
  if (input.memberId) await assertMemberExists(input.memberId);
  const roleId = await roleIdFor(input.roleKey);

  // A duplicate address gets the answer that names the remedy, not a raw unique-constraint 409.
  // The database's unique constraint remains the authority — two invites racing still cannot both
  // win — this only decides which sentence the office reads when the address is already taken.
  const existing = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase() },
    select: { isInvited: true },
  });
  if (existing) {
    throw new AppError(
      409,
      existing.isInvited
        ? 'That address is already invited and waiting on its activation link — re-issue the invitation from the accounts screen'
        : 'An account already uses that email address',
      existing.isInvited ? 'invitation_pending' : 'email_taken',
    );
  }

  // The account exists the moment it is invited — the email address must be reserved now, or two
  // invitations could race — but its password is a value that verifies nothing. The hash is of a
  // discarded random string, so the account cannot be signed into until its owner finishes the link.
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(generateResetToken()),
      roleId,
      memberId: input.memberId ?? null,
      isInvited: true,
      memberships: { create: { organizationId: requireTenantId(), roleId, isDefault: true } },
    },
    include: { role: true },
  });
  await audit(actor.id, 'create', created.id, `Invited ${created.name} (${input.roleKey}); an activation link was issued`);

  // Any outstanding row is swept first, so the newest link is the only one that works.
  await prisma.passwordResetToken.deleteMany({ where: { userId: created.id, usedAt: null } });
  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: created.id,
      tokenHash: hashResetToken(token),
      // Two days rather than the reset link's hour: an invitation may sit unread over a weekend,
      // and a parish office is not a password-reset emergency. It is still single-use and hashed.
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60_000),
    },
  });

  const link = `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/?reset=${encodeURIComponent(token)}`;
  const canSendEmail = emailStatus().configured;
  if (canSendEmail) {
    const report = await sendEmail({
      to: [created.email],
      subject: `${env.APP_NAME}: you have been invited to ${env.APP_NAME}`,
      text: [
        `Hello ${created.name},`,
        '',
        `${actor.name} has made you an account for this church's records. Choose your own password here:`,
        '',
        link,
        '',
        'The link can be used once and expires in two days.',
        'If you were not expecting this, you can ignore the message — no account works until the password is chosen.',
      ].join('\n'),
    });
    if (report.delivered === 0) throw new AppError(502, 'The email provider refused the invitation — the account exists, but the link was not delivered', 'email_send_failed');
  } else {
    await audit(
      actor.id,
      'update',
      created.id,
      'An activation link was issued but could not be emailed (no email provider is configured)',
    );
  }

  return {
    user: toPublicUser(created),
    canSendEmail,
    // Development only, exactly like the reset request: a link in a response body is a handover aid
    // on a laptop, and a leak in production.
    ...(canSendEmail || env.NODE_ENV !== 'development' ? {} : { devLink: link }),
  };
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  await findLive(prisma.user, id, 'That account does not exist');
  await assertServesChurch(id);

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
  await assertServesChurch(id);
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
  await assertServesChurch(id);
  if (target.role?.key === 'super_admin' && actor.roleKey !== 'super_admin') {
    throw forbiddenError('Only a super administrator can reset another super administrator’s password');
  }

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      failedAttempts: 0,
      lockedUntil: null,
      // An administrator setting a password is the office's "somebody else may have the old one"
      // case, so every session the account had is ended by it — including any the account holder
      // left open on a machine the administrator cannot see.
      tokenVersion: { increment: 1 },
    },
  });
  await audit(actor.id, 'update', id, `Reset the password for ${target.name}; their other sessions were ended`);
}

/**
 * Retire an account: soft delete plus the archive row the console's Trash screen reads.
 *
 * The account row stays, so the audit trail keeps pointing at a real person rather than at a gap,
 * and the snapshot makes the restore possible months later.
 */
export async function removeUser(id: string, input: RetireReason, actorId: string) {
  const existing = await findLive(prisma.user, id, 'That account does not exist', { include: { role: true } });
  await assertServesChurch(id);
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

/**
 * Re-issue the activation link for an invited account that never finished signing up.
 *
 * Invitation links expire in two days, and the honest failure a parish office hits is "their link
 * lapsed while the church was closed". The rules that make this safe are the ones the invite itself
 * enforces: only an account that **cannot sign in yet** may be re-invited (an active account gets
 * the ordinary reset flow instead, which no invitee can be talked into using on somebody else), the
 * caller's church must hold the membership (a user row is global; the membership is the tenant
 * boundary), and the newest link sweeps the old ones so exactly one link ever works.
 */
export async function resendInvitation(id: string, actor: AuthenticatedUser): Promise<{ canSendEmail: boolean; devLink?: string }> {
  const target = await findLive(prisma.user, id, 'That account does not exist', { include: { role: true } });
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: id, organizationId: requireTenantId(), isActive: true, ...live },
  });
  if (!membership) throw forbiddenError('That account does not serve this church');
  // "Never finished signing up" is the invited flag, not merely never-signed-in: a seeded
  // administrator has never signed in either but holds a real password, and their lapsed-sign-in
  // case belongs to the reset flow, not to a second invitation.
  if (!target.isInvited) {
    throw new AppError(
      409,
      'That account already finished signing up — send a password reset instead of a new invitation',
      'already_activated',
    );
  }
  if (target.id === actor.id) throw new AppError(400, 'You cannot invite yourself — sign in with your password', 'self_invite');

  await prisma.passwordResetToken.deleteMany({ where: { userId: id, usedAt: null } });
  const token = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: id,
      tokenHash: hashResetToken(token),
      // Same two-day window as the first invitation; same reasoning.
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60_000),
    },
  });

  const link = `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/?reset=${encodeURIComponent(token)}`;
  const canSendEmail = emailStatus().configured;
  if (canSendEmail) {
    const report = await sendEmail({
      to: [target.email],
      subject: `${env.APP_NAME}: your invitation to ${env.APP_NAME}`,
      text: [
        `Hello ${target.name},`,
        '',
        `${actor.name} has re-issued your invitation to this church's records. Choose your own password here:`,
        '',
        link,
        '',
        'The link can be used once and expires in two days. Any earlier invitation link no longer works.',
        'If you were not expecting this, you can ignore the message — no account works until the password is chosen.',
      ].join('\n'),
    });
    if (report.delivered === 0) throw new AppError(502, 'The email provider refused the invitation — the account exists, but the link was not delivered', 'email_send_failed');
  } else {
    await audit(actor.id, 'update', id, 'A new activation link was issued but could not be emailed (no email provider is configured)');
  }

  return {
    canSendEmail,
    ...(canSendEmail || env.NODE_ENV !== 'development' ? {} : { devLink: link }),
  };
}

/** A link to a register record has to point at somebody real, or the FK failure arrives as a 409. */
async function assertMemberExists(memberId: string): Promise<void> {
  const member = await prisma.member.findFirst({ where: { id: memberId, ...live } });
  if (!member) throw new AppError(400, 'That member is not on the register', 'unknown_member');
}

/**
 * Refuses an administrative action on an account that does not serve this church.
 *
 * `User` is a global model — one account may serve two parishes — so the tenant-scoped client
 * deliberately does not scope it, and the **membership** is the tenant boundary. Without this check,
 * an administrator of one church who learned (or guessed) an id could rename, re-role, retire, or
 * reset the password of an account that belongs to another church — the last of these is a complete
 * account takeover. The unknown-account refusal stays a 404 from `findLive`; an account that exists
 * but is not this church's is a 403, the same sentence `resendInvitation` has always given.
 */
async function assertServesChurch(userId: string): Promise<void> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, isActive: true, ...live },
  });
  if (!membership) throw forbiddenError('That account does not serve this church');
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
