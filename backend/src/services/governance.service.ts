import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { between } from '../schemas/common';
import type { RetireReason } from '../schemas/common';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import type {
  CreateDocumentInput,
  CreateMeetingInput,
  CreateResolutionInput,
  DecideResolutionInput,
  ListDocumentsQuery,
  ListMeetingsQuery,
  ListResolutionsQuery,
  UpdateDocumentInput,
  UpdateMeetingInput,
  UpdateResolutionInput,
} from '../schemas/governance.schema';

/**
 * Governance: what the councils decided, and the documents they decided it under.
 *
 * A resolution's code is issued by the server in the year's `RES-` series, like the finance module's
 * transaction codes, so a minute can cite one and have it mean something later.
 */

// -------------------------------------------------------------------------------------------
// Meetings
// -------------------------------------------------------------------------------------------

const meetingInclude = {
  chair: { select: { id: true, firstName: true, lastName: true } },
  secretary: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { resolutions: { where: live } } },
} satisfies Prisma.MeetingInclude;

export async function listMeetings(query: ListMeetingsQuery) {
  const where: Prisma.MeetingWhereInput = {
    ...live,
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...between('heldAt', query),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { venue: { contains: query.q, mode: 'insensitive' as const } },
            { minutes: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.meeting.count({ where }),
    prisma.meeting.findMany({
      where,
      include: meetingInclude,
      orderBy: { heldAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getMeeting(id: string) {
  return findLive(
    { where: { id }, include: { ...meetingInclude, resolutions: { where: live, orderBy: { councilDate: 'asc' } } } },
    prisma.meeting,
    'That meeting does not exist',
  );
}

export async function createMeeting(input: CreateMeetingInput, actorId: string) {
  if (input.chairId) await assertMemberOnRegister(input.chairId, 'That chair');
  if (input.secretaryId) await assertMemberOnRegister(input.secretaryId, 'That secretary');

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.create({
      data: {
        title: input.title,
        kind: input.kind,
        status: input.status,
        heldAt: input.heldAt,
        venue: input.venue,
        chairId: input.chairId ?? null,
        secretaryId: input.secretaryId ?? null,
        attendees: input.attendees ?? null,
        quorumMet: input.quorumMet ?? null,
        agenda: input.agenda ?? undefined,
        minutes: input.minutes ?? null,
      },
      include: meetingInclude,
    });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Meeting', entityId: meeting.id, summary: `Scheduled the ${meeting.kind} meeting "${meeting.title}"` },
    });
    return meeting;
  });
}

export async function updateMeeting(id: string, input: UpdateMeetingInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.meeting, 'That meeting does not exist');
  if (input.chairId) await assertMemberOnRegister(input.chairId, 'That chair');
  if (input.secretaryId) await assertMemberOnRegister(input.secretaryId, 'That secretary');

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.heldAt === undefined ? {} : { heldAt: input.heldAt }),
        ...(input.venue === undefined ? {} : { venue: input.venue }),
        ...(input.chairId === undefined ? {} : { chairId: input.chairId }),
        ...(input.secretaryId === undefined ? {} : { secretaryId: input.secretaryId }),
        ...(input.attendees === undefined ? {} : { attendees: input.attendees }),
        ...(input.quorumMet === undefined ? {} : { quorumMet: input.quorumMet }),
        ...(input.agenda === undefined ? {} : { agenda: input.agenda }),
        ...(input.minutes === undefined ? {} : { minutes: input.minutes }),
      },
      include: meetingInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Meeting',
        entityId: id,
        summary: `Updated "${meeting.title}"`,
        before: { heldAt: before.heldAt, status: before.status },
        after: { heldAt: meeting.heldAt, status: meeting.status },
      },
    });
    return meeting;
  });
}

export function retireMeeting(id: string, input: RetireReason, actorId: string) {
  return retireRecord('Meeting', id, {
    ...input,
    actorId,
    missing: 'That meeting does not exist',
    label: (row) => String(row.title),
  });
}

// -------------------------------------------------------------------------------------------
// Resolutions
// -------------------------------------------------------------------------------------------

const resolutionInclude = { meeting: { select: { id: true, title: true, heldAt: true, kind: true } } } satisfies Prisma.ResolutionInclude;

export async function listResolutions(query: ListResolutionsQuery) {
  const where: Prisma.ResolutionWhereInput = {
    ...live,
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.sponsor ? { sponsor: query.sponsor } : {}),
    ...(query.meetingId ? { meetingId: query.meetingId } : {}),
    ...between('councilDate', query),
    ...(query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: 'insensitive' as const } },
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { summary: { contains: query.q, mode: 'insensitive' as const } },
            { sponsor: { contains: query.q, mode: 'insensitive' as const } },
            { lead: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data, byStage] = await Promise.all([
    prisma.resolution.count({ where }),
    prisma.resolution.findMany({
      where,
      include: resolutionInclude,
      orderBy: { councilDate: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.resolution.groupBy({ by: ['stage'], where: live, _count: true }),
  ]);

  return { data, meta: page(total, query), counts: Object.fromEntries(byStage.map((row) => [row.stage, row._count])) };
}

export function getResolution(id: string) {
  return findLive({ where: { id }, include: resolutionInclude }, prisma.resolution, 'That resolution does not exist');
}

export async function createResolution(input: CreateResolutionInput, actorId: string) {
  if (input.meetingId) {
    const meeting = await prisma.meeting.findFirst({ where: { id: input.meetingId, ...live }, select: { id: true } });
    if (!meeting) throw new AppError(400, 'That meeting does not exist', 'unknown_meeting');
  }

  const prefix = `RES-${input.councilDate.getFullYear()}-`;

  return prisma.$transaction(async (tx) => {
    const last = await tx.resolution.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const issued = last?.code ? Number.parseInt(last.code.slice(prefix.length), 10) : 0;

    const resolution = await tx.resolution.create({
      data: {
        code: `${prefix}${String((Number.isFinite(issued) ? issued : 0) + 1).padStart(3, '0')}`,
        title: input.title,
        summary: input.summary,
        sponsor: input.sponsor,
        sponsorOfficer: input.sponsorOfficer ?? null,
        meetingId: input.meetingId ?? null,
        councilDate: input.councilDate,
        stage: 'proposed',
        lead: input.lead ?? null,
        leadNote: input.leadNote ?? null,
      },
      include: resolutionInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Resolution',
        entityId: resolution.id,
        summary: `Tabled ${resolution.code}: ${resolution.title} (sponsored by ${resolution.sponsor})`,
      },
    });
    return resolution;
  });
}

export async function updateResolution(id: string, input: UpdateResolutionInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.resolution, 'That resolution does not exist');

  return prisma.$transaction(async (tx) => {
    const resolution = await tx.resolution.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.summary === undefined ? {} : { summary: input.summary }),
        ...(input.sponsor === undefined ? {} : { sponsor: input.sponsor }),
        ...(input.sponsorOfficer === undefined ? {} : { sponsorOfficer: input.sponsorOfficer }),
        ...(input.meetingId === undefined ? {} : { meetingId: input.meetingId }),
        ...(input.councilDate === undefined ? {} : { councilDate: input.councilDate }),
        ...(input.stage === undefined ? {} : { stage: input.stage }),
        ...(input.voteSummary === undefined ? {} : { voteSummary: input.voteSummary }),
        ...(input.lead === undefined ? {} : { lead: input.lead }),
        ...(input.leadNote === undefined ? {} : { leadNote: input.leadNote }),
      },
      include: resolutionInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Resolution',
        entityId: id,
        summary: `Updated ${resolution.code}`,
        before: { stage: before.stage, title: before.title },
        after: { stage: resolution.stage, title: resolution.title },
      },
    });
    return resolution;
  });
}

export async function decideResolution(id: string, input: DecideResolutionInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.resolution, 'That resolution does not exist');
  if (before.stage === input.decision) {
    throw new AppError(409, `That resolution is already ${input.decision.replace('_', ' ')}`, 'already_decided');
  }
  if (before.stage === 'closed') throw new AppError(409, 'That resolution is closed', 'already_decided');

  const decidedAt = input.decidedAt ?? new Date();
  return prisma.$transaction(async (tx) => {
    const resolution = await tx.resolution.update({
      where: { id },
      data: {
        stage: input.decision,
        voteSummary: input.voteSummary,
        ...(input.votesFor === undefined ? {} : { votesFor: input.votesFor }),
        ...(input.votesAgainst === undefined ? {} : { votesAgainst: input.votesAgainst }),
        ...(input.votesAbstain === undefined ? {} : { votesAbstain: input.votesAbstain }),
        decidedAt,
      },
      include: resolutionInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Resolution',
        entityId: id,
        summary: `${resolution.code} ${input.decision === 'voted_approved' ? 'carried' : 'closed'}: ${input.voteSummary}`,
        before: { stage: before.stage, voteSummary: before.voteSummary },
        after: { stage: resolution.stage, voteSummary: resolution.voteSummary },
      },
    });
    return resolution;
  });
}

export function retireResolution(id: string, input: RetireReason, actorId: string) {
  return retireRecord('Resolution', id, {
    ...input,
    actorId,
    missing: 'That resolution does not exist',
    // The code is how a minute cites it, so the label leads with it.
    label: (row) => `${String(row.code)} - ${String(row.title)}`,
  });
}

// -------------------------------------------------------------------------------------------
// Documents
// -------------------------------------------------------------------------------------------

export async function listDocuments(query: ListDocumentsQuery) {
  const where: Prisma.GovernanceDocumentWhereInput = {
    ...live,
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...between('adoptedAt', query),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { reference: { contains: query.q, mode: 'insensitive' as const } },
            { body: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data, byKind] = await Promise.all([
    prisma.governanceDocument.count({ where }),
    prisma.governanceDocument.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { adoptedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.governanceDocument.groupBy({ by: ['kind'], where: { ...live, isActive: true }, _count: true }),
  ]);

  return { data, meta: page(total, query), counts: Object.fromEntries(byKind.map((row) => [row.kind, row._count])) };
}

export function getDocument(id: string) {
  return findLive({ where: { id } }, prisma.governanceDocument, 'That document does not exist');
}

export async function createDocument(input: CreateDocumentInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.governanceDocument.create({
      data: {
        title: input.title,
        kind: input.kind,
        reference: input.reference,
        version: input.version,
        adoptedAt: input.adoptedAt ?? null,
        body: input.body ?? null,
        fileUrl: input.fileUrl ?? null,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'GovernanceDocument',
        entityId: document.id,
        summary: `Filed ${document.reference} (${document.kind}): ${document.title}`,
      },
    });
    return document;
  });
}

export async function updateDocument(id: string, input: UpdateDocumentInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.governanceDocument, 'That document does not exist');

  return prisma.$transaction(async (tx) => {
    const document = await tx.governanceDocument.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        ...(input.reference === undefined ? {} : { reference: input.reference }),
        ...(input.version === undefined ? {} : { version: input.version }),
        ...(input.adoptedAt === undefined ? {} : { adoptedAt: input.adoptedAt }),
        ...(input.body === undefined ? {} : { body: input.body }),
        ...(input.fileUrl === undefined ? {} : { fileUrl: input.fileUrl }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'GovernanceDocument',
        entityId: id,
        summary: `Updated ${document.reference} to version ${document.version}`,
        before: { version: before.version, isActive: before.isActive },
        after: { version: document.version, isActive: document.isActive },
      },
    });
    return document;
  });
}

export function retireDocument(id: string, input: RetireReason, actorId: string) {
  return retireRecord('GovernanceDocument', id, {
    ...input,
    actorId,
    missing: 'That document does not exist',
    label: (row) => `${String(row.reference)} - ${String(row.title)}`,
  });
}
