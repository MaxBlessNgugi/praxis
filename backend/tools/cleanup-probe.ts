import { basePrisma } from '../src/lib/prisma';
import { removeChurch } from './lib/provision';

/**
 * One-off: sweeps a leftover probe church from an interrupted check run, so a failed run can be
 * retried instead of colliding with its own slug. Usage:
 *
 *   npx tsx tools/cleanup-probe.ts <slug-prefix> <email-a> <email-b>
 */
async function main(): Promise<void> {
  const [prefix, emailA, emailB] = process.argv.slice(2);
  if (!prefix || !emailA || !emailB) {
    console.error('usage: npx tsx tools/cleanup-probe.ts <slug-prefix> <email-a> <email-b>');
    process.exit(1);
  }

  const orgs = await basePrisma.organization.findMany({ where: { slug: { startsWith: prefix } } });
  for (const org of orgs) {
    await removeChurch(org.id, { adminEmails: [emailA, emailB] });
    console.log('removed', org.slug);
  }
  if (orgs.length === 0) console.log('nothing to remove');
  await basePrisma.$disconnect();
}

main().catch((error) => {
  console.error('cleanup failed:', error);
  process.exitCode = 1;
});
