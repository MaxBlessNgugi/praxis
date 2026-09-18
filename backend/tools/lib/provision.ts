import { basePrisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/auth';

/**
 * Making a probe church, and taking it back out again.
 *
 * Several checks in this directory provision a church so they have somewhere to act, and all of them
 * have to remove it afterwards — including when a check fails, which is the case that matters,
 * because a leaky check leaves rows behind in the very database somebody is demonstrating from.
 *
 * It is one function rather than three for a reason that is not tidiness: the sweep below is derived
 * from the schema (`every table with an organizationId`), and a hand-written list of tables in one
 * tool would silently stop covering a model added later. One implementation means one place to be
 * right, and the day a new tenant-owned table appears it is already covered.
 */

/** The role a probe church is staffed with, by its key. */
export async function roleId(key: string): Promise<string> {
  const role = await basePrisma.role.findFirst({ where: { key } });
  if (!role) throw new Error(`the ${key} role is missing — seed the database first`);
  return role.id;
}

export interface ProbeChurch {
  organizationId: string;
  userId: string;
  /** The role the probe administrator holds, for a check that wants to sign somebody else in. */
  roleId: string;
}

/**
 * A church of its own for one check to act inside.
 *
 * There is deliberately no endpoint for this — provisioning is an operator's act, and the self-serve
 * signup is a different door with different rules — so a check opens it through the database the way
 * an operator would, then signs in over HTTP like anybody else. Acting inside a church of its own is
 * what keeps a check from filling the seeded church with probe rows and from asserting on a database
 * somebody has already touched.
 */
export async function provisionChurch(input: {
  name: string;
  slug: string;
  adminName: string;
  email: string;
  password: string;
  roleKey?: string;
}): Promise<ProbeChurch> {
  const adminRoleId = await roleId(input.roleKey ?? 'admin');
  const organization = await basePrisma.organization.create({
    data: { name: input.name, slug: input.slug },
  });
  const user = await basePrisma.user.create({
    data: {
      name: input.adminName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roleId: adminRoleId,
      memberships: { create: { organizationId: organization.id, roleId: adminRoleId, isDefault: true } },
    },
  });

  return { organizationId: organization.id, userId: user.id, roleId: adminRoleId };
}

export interface RemoveChurchOptions {
  /** Accounts created for this church and for nothing else, by exact address. */
  adminEmails?: string[];
  /** The same, for a test that uses one address per run and so cannot name them in advance. */
  emailSuffix?: string;
  /**
   * Rows a run left in *another* church's log while probing it — a refusal, a visit, a role change.
   * They name the probe, so they go with it: a check that only passes on a database nobody has
   * touched is worth very little, and the seeded church's log is the one a person actually reads.
   */
  residualAudit?: { organizationId: string; mentions: string[] };
}

export async function removeChurch(organizationId: string, options: RemoveChurchOptions = {}): Promise<void> {
  // The church's own rows first: every foreign key points that way, and the list comes from the
  // database rather than from anybody's memory. Raw SQL because Prisma has no cross-model delete and
  // the tenant-scoped client would refuse a query that spans churches anyway.
  const tenantTables = await basePrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.columns WHERE column_name = 'organizationId'`,
  );
  // The inventory rows hold RESTRICT foreign keys to the item they name, so they go out before the
  // register does — the alphabetical order the column query returns otherwise tries to delete an
  // item while its own history still points at it. PurchaseLine carries no organizationId of its
  // own (it hangs off its purchase), so it is reached through its parent.
  const historyFirst = ['"StockMovement"', '"Issue"', '"Transfer"', '"StockTake"'];
  for (const table of historyFirst) {
    await basePrisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE "organizationId" = $1`, organizationId);
  }
  await basePrisma.$executeRawUnsafe(
    `DELETE FROM "PurchaseLine" WHERE "purchaseId" IN (SELECT id FROM "Purchase" WHERE "organizationId" = $1)`,
    organizationId,
  );
  await basePrisma.$executeRawUnsafe(`DELETE FROM "SoftDeletedRecord" WHERE "organizationId" = $1`, organizationId);

  for (const { table_name: table } of tenantTables) {
    await basePrisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "organizationId" = $1`, organizationId);
  }

  const mentions = options.residualAudit?.mentions ?? [];
  if (options.residualAudit && mentions.length > 0) {
    await basePrisma.auditLog.deleteMany({
      where: {
        organizationId: options.residualAudit.organizationId,
        OR: mentions.map((text) => ({ summary: { contains: text } })),
      },
    });
  }

  // Memberships cascade with the account, so a probe login that was also given a role in the first
  // church goes with it rather than blocking the delete.
  if (options.adminEmails?.length) {
    await basePrisma.user.deleteMany({ where: { email: { in: options.adminEmails } } });
  }
  if (options.emailSuffix) {
    await basePrisma.user.deleteMany({ where: { email: { endsWith: options.emailSuffix } } });
  }

  await basePrisma.organization.deleteMany({ where: { id: organizationId } });
}
