import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { between } from '../schemas/common';
import type { RetireReason } from '../schemas/common';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import { quorumMet, quorumRequired } from '../lib/quorum';
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
 *
 * Three rules shape this module, and each is here rather than in a screen because it is a fact about
 * the church's records rather than a preference of whoever is looking at them:
 *
 * 1. **A quorum is counted, not claimed.** The Session is quorate when a majority of the council roll
 *    is in the room — the calculation, and why it is that roll, is in `lib/quorum`. The figure that
 *    sitting needed is stamped on it, and `quorumMet` is derived from the register rather than typed in.
 * 2. **A stage moves by an act, not by an edit.** A resolution is proposed, voted on, implemented and
 *    closed, in that order, through the decision endpoint — never by a PATCH that happens to carry a
 *    new stage.
 * 3. **A sealed minute is a sealed minute.** Once the clerk seals it the sitting is closed, and only
 *    an administrator may change the register or the minute afterwards.
 */

// -------------------------------------------------------------------------------------------
// Meetings
// -------------------------------------------------------------------------------------------

const meetingInclude = {
  chair: { select: { id: true, firstName: true, lastName: true } },
  secretary: { select: { id: true, firstName: true, lastName: true } },
  minutesFinalizedBy: { select: { id: true, name: true } },
  _count: { select: { resolutions: { where: live } } },
} satisfies Prisma.MeetingInclude;

/**
 * The council roll: how many people hold an office, which is the leadership roster the Ministries
 * screen shows — `MinistryMember.roleTitle` other than the default "Member".
 *
 * Counted by distinct member, because one person may carry two offices and the Session counts people.
 * A church that has recorded no offices has no roll, and then no quorum figure is invented for it.
 */
async function councilQuorum(): Promise<{ roll: number; required: number | null }> {
  const offices = await prisma.ministryMember.findMany({
    where: { ...live, roleTitle: { not: 'Member' } },
    distinct: ['memberId'],
    select: { memberId: true },
  });
  return { roll: offices.length, required: quorumRequired(offices.length) };
}

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
  return findLive(prisma.meeting, id, 'That meeting does not exist', {
    include: { ...meetingInclude, resolutions: { where: live, orderBy: { councilDate: 'asc' } } },
  });
}

export async function createMeeting(input: CreateMeetingInput, actorId: string) {
  if (input.chairId) await assertMemberOnRegister(input.chairId, 'That chair');
  if (input.secretaryId) await assertMemberOnRegister(input.secretaryId, 'That secretary');

  const { required } = await councilQuorum();
  const attendees = input.attendees ?? null;

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
        attendees,
        quorumRequired: required,
        quorumMet: quorumMet(attendees, required),
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
  const before = await findLive(prisma.meeting, id, 'That meeting does not exist');
  if (input.chairId) await assertMemberOnRegister(input.chairId, 'That chair');
  if (input.secretaryId) await assertMemberOnRegister(input.secretaryId, 'That secretary');

  // The register is closed once the minute is sealed: a sitting cannot be cancelled after it has been
  // minuted, nor put back on the calendar as though it had not happened.
  if (before.minutesFinalizedAt) {
    if (input.status && input.status !== 'held') {
      throw new AppError(409, 'That sitting has been minuted, so its status is fixed', 'minutes_sealed');
    }
    if (input.attendees !== undefined && input.attendees !== before.attendees) {
      throw new AppError(409, 'That sitting has been minuted, so its attendance is fixed', 'minutes_sealed');
    }
  }

  // The figure the Session needs moves with the register, so it is recounted while the sitting is
  // still to come and frozen once it has been held: a minute cites the number that applied that day.
  const recount = before.status === 'scheduled' ? await councilQuorum() : null;
  const required = recount ? recount.required : before.quorumRequired;
  const attendees = input.attendees === undefined ? before.attendees : input.attendees;
  const met = recount || input.attendees !== undefined ? quorumMet(attendees, required) : before.quorumMet;

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
        quorumRequired: required,
        quorumMet: met,
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

/**
 * Seal the minute, which is what closes a sitting.
 *
 * A cancelled sitting has no minute to seal, and one that has not yet been held has no register to seal
 * against — so both are refused with the reason, rather than sealing a blank minute and calling the
 * sitting complete. Sealing twice keeps the original date, because the day a minute was declared final
 * is a fact about that day rather than about when somebody last pressed the button.
 */
export async function sealMinutes(id: string, actorId: string) {
  const meeting = await findLive(prisma.meeting, id, 'That meeting does not exist');
  if (meeting.minutesFinalizedAt) {
    return { ...meeting, minutesFinalizedBy: await sealedBy(meeting.minutesFinalizedById) };
  }
  if (meeting.status === 'cancelled') {
    throw new AppError(409, 'That sitting was cancelled, so there is no minute to seal', 'meeting_cancelled');
  }
  if (meeting.status !== 'held') {
    throw new AppError(409, 'Mark the sitting as held before sealing its minutes', 'meeting_not_held');
  }
  if (!meeting.minutes || meeting.minutes.trim().length < 20) {
    throw new AppError(409, 'Write the minutes before sealing them', 'no_minutes');
  }

  return prisma.$transaction(async (tx) => {
    const sealed = await tx.meeting.update({
      where: { id },
      data: { minutesFinalizedAt: new Date(), minutesFinalizedById: actorId },
      include: meetingInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Meeting',
        entityId: id,
        summary: `Sealed the minutes of "${sealed.title}"`,
        after: { minutesFinalizedAt: sealed.minutesFinalizedAt },
      },
    });
    return sealed;
  });
}

/** Who sealed it, for the idempotent path above, which has no update to read it back from. */
function sealedBy(userId: string | null) {
  return userId ? prisma.user.findFirst({ where: { id: userId }, select: { id: true, name: true } }) : null;
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

/**
 * The order a resolution moves in, and the only way it moves.
 *
 * The Session proposes, votes, works and closes: each step is the next one, and nothing skips. A
 * resolution that went straight from the docket to closed would leave a minute claiming a decision
 * nobody recorded, and one that reopened after closure would leave the same minute describing two
 * different outcomes.
 */
const NEXT_STAGE: Record<string, string | null> = {
  proposed: 'voted_approved',
  voted_approved: 'implementing',
  implementing: 'closed',
  closed: null,
};

const STAGE_WORDS: Record<string, string> = {
  proposed: 'proposed',
  voted_approved: 'voted and approved',
  implementing: 'being implemented',
  closed: 'closed',
};

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
  return findLive(prisma.resolution, id, 'That resolution does not exist', { include: resolutionInclude });
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
  const before = await findLive(prisma.resolution, id, 'That resolution does not exist');

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
        // The stage is not among the fields an edit can carry, so it is shown for the reader rather
        // than reported as a change.
        before: { stage: before.stage, title: before.title },
        after: { stage: resolution.stage, title: resolution.title },
      },
    });
    return resolution;
  });
}

export async function decideResolution(id: string, input: DecideResolutionInput, actorId: string) {
  const before = await findLive(prisma.resolution, id, 'That resolution does not exist');
  const expected = NEXT_STAGE[before.stage] ?? null;
  if (expected !== input.decision) {
    throw new AppError(
      409,
      expected === null
        ? 'That resolution is closed; nothing follows a closure'
        : `That resolution is ${STAGE_WORDS[before.stage]}, so the next step is for it to be ${STAGE_WORDS[expected]}`,
      'wrong_stage',
    );
  }

  // The vote's own three counts and the note the lead reports; the words differ because the acts do.
  const vote = input.decision === 'voted_approved' ? input : null;
  const note = input.decision === 'voted_approved' ? undefined : input.note;
  const decidedAt = vote?.decidedAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const resolution = await tx.resolution.update({
      where: { id },
      data: {
        stage: input.decision,
        ...(vote
          ? {
              voteSummary: vote.voteSummary,
              ...(vote.votesFor === undefined ? {} : { votesFor: vote.votesFor }),
              ...(vote.votesAgainst === undefined ? {} : { votesAgainst: vote.votesAgainst }),
              ...(vote.votesAbstain === undefined ? {} : { votesAbstain: vote.votesAbstain }),
            }
          : {}),
        ...(note === undefined ? {} : { leadNote: note }),
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
        summary:
          input.decision === 'voted_approved'
            ? `${resolution.code} carried: ${vote?.voteSummary}`
            : `${resolution.code} ${input.decision === 'implementing' ? 'put into effect' : 'closed'}: ${note}`,
        before: { stage: before.stage, voteSummary: before.voteSummary, leadNote: before.leadNote },
        after: { stage: resolution.stage, voteSummary: resolution.voteSummary, leadNote: resolution.leadNote },
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

const documentInclude = {
  file: { select: { id: true, fileName: true, mimeType: true, byteSize: true } },
} satisfies Prisma.GovernanceDocumentInclude;

/**
 * The copy the church holds, checked before it is attached.
 *
 * A file id is a reference to a row in *this* church's library, so it is resolved here rather than
 * trusted: the tenant-scoped client cannot see another church's file anyway, and this is what turns
 * "no such file" into an answer instead of a dangling foreign key. Only scans and documents are
 * attachable — a logo is not a by-law.
 */
async function assertAttachableFile(fileId: string): Promise<void> {
  const file = await prisma.storedFile.findFirst({
    where: { id: fileId, ...live },
    select: { id: true, purpose: true },
  });
  if (!file) throw new AppError(400, 'That file is not in this church\u2019s library', 'unknown_file');
  if (file.purpose !== 'document') {
    throw new AppError(400, 'Only a file stored as a document can be attached to the library', 'wrong_file_purpose');
  }
}

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
      include: documentInclude,
      orderBy: [{ kind: 'asc' }, { adoptedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    // What the church holds by kind — the census beside the list, so it is not narrowed by the
    // filters the list itself carries.
    prisma.governanceDocument.groupBy({ by: ['kind'], where: live, _count: true }),
  ]);

  return { data, meta: page(total, query), counts: Object.fromEntries(byKind.map((row) => [row.kind, row._count])) };
}

export function getDocument(id: string) {
  return findLive(prisma.governanceDocument, id, 'That document does not exist', { include: documentInclude });
}

export async function createDocument(input: CreateDocumentInput, actorId: string) {
  if (input.fileId) await assertAttachableFile(input.fileId);

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
        fileId: input.fileId ?? null,
        isActive: input.isActive,
      },
      include: documentInclude,
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
  const before = await findLive(prisma.governanceDocument, id, 'That document does not exist');
  if (input.fileId) await assertAttachableFile(input.fileId);

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
        ...(input.fileId === undefined ? {} : { fileId: input.fileId }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
      include: documentInclude,
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
