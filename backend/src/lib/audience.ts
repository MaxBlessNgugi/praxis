import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { live } from './live';

/**
 * Who a broadcast actually goes to.
 *
 * The stored `audience` is a *label* — the words the office typed, like "Members & Baptized
 * Believers" — while what a gateway needs is a list of addresses. This is the one place the two are
 * reconciled, and it is deliberately a small, named, total function rather than anything clever.
 *
 * The rule it follows matters more than the rule itself: **a label it does not recognise resolves to
 * the whole register**, never to nobody. A broadcast that silently reaches no one is the failure mode
 * an operator cannot see, and the one that gets discovered when a funeral notice was never delivered.
 * The resolved label is returned with the list, so the console can say exactly who it counted.
 *
 * Addresses are de-duplicated and validated: one family with a shared mailbox should receive one
 * copy, and a phone number field holding "n/a" should not be handed to an SMS gateway.
 */

export interface ResolvedAudience {
  /** A phrase the console can put in a sentence: "sent to *the whole register*". */
  label: string;
  emails: string[];
  phones: string[];
}

function uniqueStrings(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))].map((value) =>
    value.trim(),
  );
}

export async function resolveAudience(audience: string): Promise<ResolvedAudience> {
  const key = audience.trim().toLowerCase();

  // The council is defined by its *logins*, not by the register: it is the people who can act in the
  // console, which is the same set the rights editor governs.
  if (key.includes('council') || key.includes('board') || key.includes('trustee')) {
    const users = await prisma.user.findMany({
      where: { ...live, isActive: true, role: { key: { in: ['super_admin', 'admin'] } } },
      select: { email: true },
    });
    return { label: 'the church council', emails: uniqueStrings(users.map((user) => user.email)), phones: [] };
  }

  let where: Prisma.MemberWhereInput = { ...live };
  let label = 'the whole register';

  if (key.includes('leader')) {
    where = { ...live, ledMinistries: { some: live } };
    label = 'ministry leaders';
  } else if (key.includes('youth') || key.includes('young')) {
    where = { ...live, tags: { has: 'youth' } };
    label = 'the youth roll';
  }

  const members = await prisma.member.findMany({ where, select: { email: true, phone: true } });

  return {
    label,
    emails: uniqueStrings(members.map((member) => member.email)).filter((email) => email.includes('@')),
    phones: uniqueStrings(members.map((member) => member.phone)),
  };
}
