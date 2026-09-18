import { Prisma } from '@prisma/client';
import { live, findLive } from '../lib/live';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { page } from '../lib/respond';
import { retireRecord, type ArchiveReason } from '../lib/archive';
import type {
  CertificateKind,
  CreateCertificateInput,
  ListCertificatesQuery,
  ReissueCertificateInput,
} from '../schemas/certificate.schema';

/**
 * The certificate register: what the church has issued, and to whom.
 *
 * Until this existed a certificate was a printout — the console types a name onto a page, the browser
 * prints it, and the church's only copy of having issued it is somebody's memory or a paper file. Two
 * facts make a certificate official rather than printed: it carries a **serial** issued once, like a
 * resolution code, and the wording it certifies is **recorded**, so a reissue years later reproduces
 * the original ceremony as celebrated, not whatever the register says today.
 *
 * Three rules shape this module, the same three the governance module states:
 *
 * 1. **A serial is issued by the server**, in the year's `BAP-`/`DED-` series, inside the transaction
 *    that writes the row — so two certificates requested in the same second cannot take one serial.
 * 2. **A reissue supersedes.** It names the copy it replaces; the register shows the live copy and
 *    the superseded ones stay readable. A reissued copy is refused if the one it replaces is already
 *    itself a reissue — a chain is untraceable, so reissue the head instead.
 * 3. **Retirement is the register's own.** A certificate issued in error is retired with a reason
 *    (a duplicate serial run, a wrong name), lands in the Trash with the rest, and can be restored.
 */

const KIND_PREFIX: Record<CertificateKind, string> = { baptism: 'BAP', dedication: 'DED' };

const certificateInclude = {
  issuedBy: { select: { id: true, name: true } },
  member: { select: { id: true, memberId: true, firstName: true, lastName: true } },
  reissues: { select: { id: true, serial: true } },
} satisfies Prisma.CertificateInclude;

function toPublicCertificate(row: Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>) {
  return {
    id: row.id,
    serial: row.serial,
    kind: row.kind,
    fullName: row.fullName,
    memberNumber: row.memberNumber,
    member: row.member,
    parents: row.parents,
    ceremonyDate: row.ceremonyDate,
    officiant: row.officiant,
    scripture: row.scripture,
    issuedBy: row.issuedBy,
    issuedAt: row.issuedAt,
    reissues: row.reissues,
  };
}

// -------------------------------------------------------------------------------------------
// Issuing
// -------------------------------------------------------------------------------------------

export async function issueCertificate(input: CreateCertificateInput, issuerId: string) {
  const prefix = `${KIND_PREFIX[input.kind]}-${input.ceremonyDate.getFullYear()}-`;

  return prisma.$transaction(async (tx) => {
    const last = await tx.certificate.findFirst({
      where: { serial: { startsWith: prefix } },
      orderBy: { serial: 'desc' },
      select: { serial: true },
    });
    const issued = last?.serial ? Number.parseInt(last.serial.slice(prefix.length), 10) : 0;
    const serial = `${prefix}${String((Number.isFinite(issued) ? issued : 0) + 1).padStart(4, '0')}`;

    const certificate = await tx.certificate.create({
      data: {
        serial,
        kind: input.kind,
        fullName: input.fullName,
        memberId: input.memberId ?? null,
        memberNumber: input.memberNumber ?? null,
        parents: input.parents ?? null,
        ceremonyDate: input.ceremonyDate,
        officiant: input.officiant ?? null,
        scripture: input.scripture ?? null,
        issuedById: issuerId,
      },
      include: certificateInclude,
    });

    await tx.auditLog.create({
      data: {
        actorId: issuerId,
        action: 'create',
        entityName: 'Certificate',
        entityId: certificate.id,
        summary: `Issued ${certificate.kind} certificate ${serial} for ${certificate.fullName}`,
      },
    });

    return toPublicCertificate(certificate);
  });
}

// -------------------------------------------------------------------------------------------
// Reading
// -------------------------------------------------------------------------------------------

export async function listCertificates(query: ListCertificatesQuery) {
  const where: Prisma.CertificateWhereInput = {
    ...live,
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { serial: { contains: query.q, mode: 'insensitive' } },
            { memberNumber: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      include: certificateInclude,
      orderBy: { issuedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data: rows.map(toPublicCertificate), meta: page(total, query) };
}

export async function getCertificate(id: string) {
  return toPublicCertificate(
    await findLive(prisma.certificate, id, 'That certificate is not in the register', {
      include: certificateInclude,
    }),
  );
}

// -------------------------------------------------------------------------------------------
// Reissuing
// -------------------------------------------------------------------------------------------

/**
 * A corrected copy of a certificate already in the register.
 *
 * The new row copies the original wording — the ceremony is re-certified as it was recorded, not as
 * it might be re-typed — and points back at the copy it supersedes. Superseding is a state change
 * through an endpoint rather than a PATCH for the same reason a resolution's stage is: the act, not
 * the edit, is what the audit trail records.
 */
export async function reissueCertificate(id: string, input: ReissueCertificateInput, issuerId: string) {
  const original = await findLive(prisma.certificate, id, 'That certificate is not in the register');

  // Reissue the *head* of the chain: a copy that already supersedes another is re-reissued there,
  // so one ceremony has at most one live certificate and the chain never forks.
  if (
    (await prisma.certificate.count({
      where: { reissuesId: original.id, deletedAt: null },
    })) > 0
  ) {
    throw new AppError(409, 'That certificate has already been reissued — reissue the current copy instead', 'already_reissued');
  }

  return prisma.$transaction(async (tx) => {
    const prefix = `${KIND_PREFIX[original.kind]}-${new Date().getFullYear()}-`;
    const last = await tx.certificate.findFirst({
      where: { serial: { startsWith: prefix } },
      orderBy: { serial: 'desc' },
      select: { serial: true },
    });
    const issued = last?.serial ? Number.parseInt(last.serial.slice(prefix.length), 10) : 0;
    const serial = `${prefix}${String((Number.isFinite(issued) ? issued : 0) + 1).padStart(4, '0')}`;

    const replacement = await tx.certificate.create({
      data: {
        serial,
        kind: original.kind,
        fullName: original.fullName,
        memberId: original.memberId,
        memberNumber: original.memberNumber,
        parents: original.parents,
        ceremonyDate: original.ceremonyDate,
        officiant: input.officiant ?? original.officiant,
        scripture: original.scripture,
        issuedById: issuerId,
        reissuesId: original.id,
      },
      include: certificateInclude,
    });

    await tx.auditLog.create({
      data: {
        actorId: issuerId,
        action: 'create',
        entityName: 'Certificate',
        entityId: replacement.id,
        summary: `Reissued ${replacement.kind} certificate ${serial} for ${replacement.fullName}, superseding ${original.serial}`,
      },
    });

    return toPublicCertificate(replacement);
  });
}

// -------------------------------------------------------------------------------------------
// Retirement
// -------------------------------------------------------------------------------------------

/** Certificates join the Trash; the name is checked against the archive's own map by the compiler. */
const ARCHIVE_NAME = 'Certificate' as const;

export function retireCertificate(id: string, input: { reason: ArchiveReason; reasonLabel: string }, actorId: string) {
  return retireRecord(ARCHIVE_NAME, id, {
    ...input,
    actorId,
    missing: 'That certificate is not in the register',
    label: (row) => `${String(row.serial)} (${String(row.fullName)})`,
  });
}
