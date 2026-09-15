import { basePrisma } from '../../src/lib/prisma';

/**
 * Taking a probe church back out again.
 *
 * Three of the checks in this directory provision a church so they have somewhere to act, and all
 * three have to remove it afterwards — including when a check fails, which is the case that matters,
 * because a leaky check leaves rows behind in the very database somebody is demonstrating from.
 *
 * It is one function rather than three for a reason that is not tidiness: the sweep below is derived
 * from the schema (`every table with an organizationId`), and a hand-written list of tables in one
 * tool would silently stop covering a model added later. One implementation means one place to be
 * right, and the day a new tenant-owned table appears it is already covered.
 */

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
