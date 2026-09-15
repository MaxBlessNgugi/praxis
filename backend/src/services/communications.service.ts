import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { resolveAudience } from '../lib/audience';
import { emailStatus, sendEmail } from '../lib/email';
import { sendSms, smsStatus } from '../lib/sms';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { between } from '../schemas/common';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import type { RetireReason } from '../schemas/common';
import type {
  AnswerPrayerRequestInput,
  CelebrationsQuery,
  CreateAnnouncementInput,
  CreateBroadcastInput,
  CreateEventInput,
  CreatePrayerRequestInput,
  ListAnnouncementsQuery,
  ListBroadcastsQuery,
  ListEventsQuery,
  ListPrayerRequestsQuery,
  SendBroadcastInput,
  UpdateAnnouncementInput,
  UpdateBroadcastInput,
  UpdateEventInput,
  UpdatePrayerRequestInput,
} from '../schemas/communications.schema';

/**
 * Communications: what the church says, when it meets, and what it is praying for.
 *
 * Retiring happens through the shared `SoftDeletedRecord` rule, so every one of these can be brought
 * back from the admin trash.
 */

// -------------------------------------------------------------------------------------------
// Announcements
// -------------------------------------------------------------------------------------------

export async function listAnnouncements(query: ListAnnouncementsQuery) {
  const where: Prisma.AnnouncementWhereInput = {
    ...live,
    ...(query.audience ? { audience: query.audience } : {}),
    ...(query.isPinned === undefined ? {} : { isPinned: query.isPinned }),
    ...between('publishedAt', query),
    ...(query.live
      ? {
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            { publishedAt: { lte: new Date() } },
          ],
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { body: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getAnnouncement(id: string) {
  return findLive(prisma.announcement, id, 'That announcement does not exist', {
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function createAnnouncement(input: CreateAnnouncementInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        audience: input.audience,
        isPinned: input.isPinned,
        publishedAt: input.publishedAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
        authorId: actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Announcement',
        entityId: announcement.id,
        summary: `Published "${announcement.title}" to ${announcement.audience}`,
      },
    });
    return announcement;
  });
}

export async function updateAnnouncement(id: string, input: UpdateAnnouncementInput, actorId: string) {
  const before = await findLive(prisma.announcement, id, 'That announcement does not exist');

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.body === undefined ? {} : { body: input.body }),
        ...(input.audience === undefined ? {} : { audience: input.audience }),
        ...(input.isPinned === undefined ? {} : { isPinned: input.isPinned }),
        ...(input.publishedAt === undefined ? {} : { publishedAt: input.publishedAt }),
        ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Announcement',
        entityId: id,
        summary: `Edited "${announcement.title}"`,
        before: { title: before.title, audience: before.audience, isPinned: before.isPinned },
        after: { title: announcement.title, audience: announcement.audience, isPinned: announcement.isPinned },
      },
    });
    return announcement;
  });
}

export function retireAnnouncement(id: string, input: RetireReason, actorId: string) {
  return retireRecord('Announcement', id, {
    ...input,
    actorId,
    missing: 'That announcement does not exist',
    label: (row) => String(row.title),
  });
}

// -------------------------------------------------------------------------------------------
// Broadcasts
// -------------------------------------------------------------------------------------------

export async function listBroadcasts(query: ListBroadcastsQuery) {
  const where: Prisma.BroadcastWhereInput = {
    ...live,
    ...(query.channel ? { channel: query.channel } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...between('createdAt', query),
    ...(query.q
      ? {
          OR: [
            { subject: { contains: query.q, mode: 'insensitive' as const } },
            { body: { contains: query.q, mode: 'insensitive' as const } },
            { audience: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.broadcast.count({ where }),
    prisma.broadcast.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getBroadcast(id: string) {
  return findLive(prisma.broadcast, id, 'That broadcast does not exist', {
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function createBroadcast(input: CreateBroadcastInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const broadcast = await tx.broadcast.create({
      data: {
        channel: input.channel,
        subject: input.subject ?? null,
        body: input.body,
        audience: input.audience,
        status: input.scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: input.scheduledFor ?? null,
        createdById: actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Broadcast',
        entityId: broadcast.id,
        summary: `Drafted a ${broadcast.channel} to ${broadcast.audience}`,
      },
    });
    return broadcast;
  });
}

export async function updateBroadcast(id: string, input: UpdateBroadcastInput, actorId: string) {
  const before = await findLive(prisma.broadcast, id, 'That broadcast does not exist');
  // A campaign that has already gone out is a record of what was said, not a draft.
  if (before.status === 'sent') throw new AppError(409, 'That broadcast has already been sent', 'already_sent');

  return prisma.$transaction(async (tx) => {
    const broadcast = await tx.broadcast.update({
      where: { id },
      data: {
        ...(input.channel === undefined ? {} : { channel: input.channel }),
        ...(input.subject === undefined ? {} : { subject: input.subject }),
        ...(input.body === undefined ? {} : { body: input.body }),
        ...(input.audience === undefined ? {} : { audience: input.audience }),
        ...(input.scheduledFor === undefined ? {} : { scheduledFor: input.scheduledFor, status: 'scheduled' }),
      },
    });
    await tx.auditLog.create({
      data: { actorId, action: 'update', entityName: 'Broadcast', entityId: id, summary: `Edited a ${broadcast.channel} draft` },
    });
    return broadcast;
  });
}

/** What a send actually did, reported so the console can be specific rather than reassuring. */
export interface BroadcastDelivery {
  channel: string;
  /** The provider that carried it, or null when nothing was dispatched (a notice sheet). */
  driver: string | null;
  /** The audience in words, as it resolved: "sent to *ministry leaders*". */
  audienceLabel: string;
  attempted: number;
  delivered: number;
  failed: number;
  failures: Array<{ recipient: string; reason: string }>;
  recordedOnly: boolean;
}

/**
 * Send a campaign, or record a send that has no gateway.
 *
 * The difference between this and what it replaced is *who counts*. The count used to be supplied by
 * the caller, which meant the console could mark a campaign "sent to 400" over a provider that was
 * never configured. Now an email or SMS campaign goes through the gateway, the gateway's own outcome
 * per recipient is what gets stored, and an audience that resolves to nobody is a refusal rather than
 * a cheerful zero.
 */
export async function sendBroadcast(id: string, input: SendBroadcastInput, actorId: string) {
  const existing = await findLive(prisma.broadcast, id, 'That broadcast does not exist');
  if (existing.status === 'sent') throw new AppError(409, 'That broadcast has already been marked sent', 'already_sent');

  const audience = await resolveAudience(existing.audience);
  const sentAt = input.sentAt ?? new Date();

  let delivery: BroadcastDelivery;

  if (existing.channel === 'email') {
    const report = await sendEmail({
      to: audience.emails,
      subject: existing.subject ?? `${env.APP_NAME} notice`,
      text: existing.body,
    });
    delivery = { channel: 'email', audienceLabel: audience.label, ...report, recordedOnly: false };
  } else if (existing.channel === 'sms') {
    const report = await sendSms({ to: audience.phones, text: existing.body });
    delivery = { channel: 'sms', audienceLabel: audience.label, ...report, recordedOnly: false };
  } else {
    // A notice sheet is printed and pinned up. There is no gateway to ask, so the office's own count
    // is the record — stored as both attempted and delivered, because here they mean the same thing:
    // copies that went out.
    const counted = input.recipients ?? 0;
    delivery = {
      channel: existing.channel,
      driver: null,
      audienceLabel: audience.label,
      attempted: counted,
      delivered: counted,
      failed: 0,
      failures: [],
      recordedOnly: true,
    };
  }

  // Sending to nobody is a mistake the operator has to see; marking it "sent" would hide it.
  if (!delivery.recordedOnly && delivery.attempted === 0) {
    throw new AppError(
      400,
      `That audience resolved to no ${existing.channel === 'sms' ? 'phone numbers' : 'email addresses'} on the register, so nothing was sent.`,
      'no_recipients',
    );
  }

  const broadcast = await prisma.$transaction(async (tx) => {
    const updated = await tx.broadcast.update({
      where: { id },
      // The provider's own verdict is stored beside the campaign rather than described once in a
      // toast: the office asks "did the funeral notice reach people?" a week later, and this is the
      // row that answers it — how many went out, how many did not, and the first reasons why.
      data: {
        status: 'sent',
        sentAt,
        recipients: delivery.delivered,
        lastReport: delivery as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Broadcast',
        entityId: id,
        summary: `Sent a ${updated.channel} to ${delivery.audienceLabel} — ${delivery.delivered} delivered, ${delivery.failed} failed`,
        before: { status: existing.status, recipients: existing.recipients },
        after: { status: updated.status, recipients: updated.recipients },
      },
    });
    return updated;
  });

  return { ...broadcast, delivery };
}

/**
 * Whether each channel can actually send.
 *
 * The console reads this before it offers a "Send" action, so an installation with no provider shows
 * what to configure rather than failing at the moment somebody needs to tell the church something.
 */
export function channels() {
  return { email: emailStatus(), sms: smsStatus() };
}

export function retireBroadcast(id: string, input: RetireReason, actorId: string) {
  return retireRecord('Broadcast', id, {
    ...input,
    actorId,
    missing: 'That broadcast does not exist',
    // A campaign often has no subject, so the channel stands in for it.
    label: (row) => String(row.subject ?? `Broadcast (${String(row.channel)})`),
  });
}

// -------------------------------------------------------------------------------------------
// Events
// -------------------------------------------------------------------------------------------

export async function listEvents(query: ListEventsQuery) {
  const where: Prisma.EventWhereInput = {
    ...live,
    ...(query.kind ? { kind: query.kind } : {}),
    ...between('startsAt', query),
    // "Upcoming" means not yet over, so an event running today still shows.
    ...(query.upcoming ? { endsAt: { gte: new Date() } } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { description: { contains: query.q, mode: 'insensitive' as const } },
            { venue: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getEvent(id: string) {
  return findLive(prisma.event, id, 'That event does not exist');
}

export async function createEvent(input: CreateEventInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({ data: input });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Event', entityId: event.id, summary: `Added "${event.title}" to the calendar` },
    });
    return event;
  });
}

export async function updateEvent(id: string, input: UpdateEventInput, actorId: string) {
  const before = await findLive(prisma.event, id, 'That event does not exist');

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.update({ where: { id }, data: input });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Event',
        entityId: id,
        summary: `Updated "${event.title}"`,
        before: { startsAt: before.startsAt, venue: before.venue },
        after: { startsAt: event.startsAt, venue: event.venue },
      },
    });
    return event;
  });
}

export function retireEvent(id: string, input: RetireReason, actorId: string) {
  return retireRecord('Event', id, {
    ...input,
    actorId,
    missing: 'That event does not exist',
    label: (row) => String(row.title),
  });
}

// -------------------------------------------------------------------------------------------
// Prayer requests
// -------------------------------------------------------------------------------------------

export async function listPrayerRequests(query: ListPrayerRequestsQuery) {
  const where: Prisma.PrayerRequestWhereInput = {
    ...live,
    ...(query.status ? { status: query.status } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...between('submittedAt', query),
    ...(query.q
      ? {
          OR: [
            { request: { contains: query.q, mode: 'insensitive' as const } },
            { requesterName: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, data, byStatus] = await Promise.all([
    prisma.prayerRequest.count({ where }),
    prisma.prayerRequest.findMany({
      where,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { submittedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.prayerRequest.groupBy({ by: ['status'], where: live, _count: true }),
  ]);

  return {
    data,
    meta: page(total, query),
    counts: Object.fromEntries(byStatus.map((row) => [row.status, row._count])),
  };
}

export function getPrayerRequest(id: string) {
  return findLive(prisma.prayerRequest, id, 'That prayer request does not exist', {
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  });
}

export async function createPrayerRequest(input: CreatePrayerRequestInput, actorId: string) {
  if (input.memberId) await assertMemberOnRegister(input.memberId, 'That member');

  return prisma.$transaction(async (tx) => {
    const request = await tx.prayerRequest.create({
      data: {
        memberId: input.memberId ?? null,
        requesterName: input.requesterName ?? null,
        request: input.request,
        isPrivate: input.isPrivate,
        status: input.status,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'PrayerRequest',
        entityId: request.id,
        // The request itself is never copied into the audit trail: some of these are private.
        summary: `Logged a prayer request${request.isPrivate ? ' (private)' : ''}`,
      },
    });
    return request;
  });
}

export async function updatePrayerRequest(id: string, input: UpdatePrayerRequestInput, actorId: string) {
  const before = await findLive(prisma.prayerRequest, id, 'That prayer request does not exist');

  return prisma.$transaction(async (tx) => {
    const request = await tx.prayerRequest.update({
      where: { id },
      data: {
        ...(input.request === undefined ? {} : { request: input.request }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.isPrivate === undefined ? {} : { isPrivate: input.isPrivate }),
        ...(input.requesterName === undefined ? {} : { requesterName: input.requesterName }),
        ...(input.status === 'answered' ? { answeredAt: before.answeredAt ?? new Date() } : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'PrayerRequest',
        entityId: id,
        summary: `Prayer request status: ${before.status} becomes ${request.status}`,
        before: { status: before.status },
        after: { status: request.status },
      },
    });
    return request;
  });
}

export async function answerPrayerRequest(id: string, input: AnswerPrayerRequestInput, actorId: string) {
  const before = await findLive(prisma.prayerRequest, id, 'That prayer request does not exist');
  if (before.status === 'answered') throw new AppError(409, 'That request has already been marked answered', 'already_answered');

  const answeredAt = input.answeredAt ?? new Date();
  return prisma.$transaction(async (tx) => {
    const request = await tx.prayerRequest.update({ where: { id }, data: { status: 'answered', answeredAt } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'PrayerRequest',
        entityId: id,
        summary: `Marked a prayer request answered${input.note ? `: ${input.note}` : ''}`,
        before: { status: before.status },
        after: { status: 'answered', answeredAt: answeredAt.toISOString() },
      },
    });
    return request;
  });
}

export function retirePrayerRequest(id: string, input: RetireReason, actorId: string) {
  return retireRecord('PrayerRequest', id, {
    ...input,
    actorId,
    missing: 'That prayer request does not exist',
    label: (row) => `Prayer request${row.requesterName ? ` from ${String(row.requesterName)}` : ''}`,
  });
}

// -------------------------------------------------------------------------------------------
// Birthdays and anniversaries
// -------------------------------------------------------------------------------------------

export interface Celebration {
  type: 'birthday' | 'anniversary';
  memberId: string;
  memberName: string;
  initials: string | null;
  phone: string | null;
  date: string;
  inDays: number;
  yearsCount: number | null;
}

/**
 * Who is celebrating in the next `days`.
 *
 * The window is walked day by day rather than answered in SQL, because "next 30 days" crosses a year
 * boundary and a 29 February birthday has to land somewhere sensible — both of which are clearer in
 * code than in a date function nobody will read twice.
 */
export async function celebrations(query: CelebrationsQuery) {
  const members = await prisma.member.findMany({
    where: { ...live, status: 'active', OR: [{ dateOfBirth: { not: null } }, { weddingAnniversary: { not: null } }] },
    select: { id: true, firstName: true, lastName: true, initials: true, phone: true, dateOfBirth: true, weddingAnniversary: true },
  });

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const found: Celebration[] = [];

  /** When the next occurrence of a day/month falls, and how many years it completes. */
  const nextOccurrence = (on: Date): { date: Date; inDays: number; years: number } => {
    const month = on.getMonth();
    const day = on.getDate();
    let year = start.getFullYear();
    // 29 February in a common year is celebrated on the 28th, which is what a parish does.
    const clamp = (y: number) => Math.min(day, new Date(y, month + 1, 0).getDate());
    let candidate = new Date(year, month, clamp(year));
    if (candidate < start) {
      year += 1;
      candidate = new Date(year, month, clamp(year));
    }
    const inDays = Math.round((candidate.getTime() - start.getTime()) / 86_400_000);
    return { date: candidate, inDays, years: year - on.getFullYear() };
  };

  for (const member of members) {
    const name = `${member.firstName} ${member.lastName}`;
    if (member.dateOfBirth && query.kind !== 'anniversary') {
      const next = nextOccurrence(member.dateOfBirth);
      if (next.inDays <= query.days) {
        found.push({
          type: 'birthday',
          memberId: member.id,
          memberName: name,
          initials: member.initials,
          phone: member.phone,
          date: next.date.toISOString().slice(0, 10),
          inDays: next.inDays,
          yearsCount: next.years,
        });
      }
    }
    if (member.weddingAnniversary && query.kind !== 'birthday') {
      const next = nextOccurrence(member.weddingAnniversary);
      if (next.inDays <= query.days) {
        found.push({
          type: 'anniversary',
          memberId: member.id,
          memberName: name,
          initials: member.initials,
          phone: member.phone,
          date: next.date.toISOString().slice(0, 10),
          inDays: next.inDays,
          yearsCount: next.years,
        });
      }
    }
  }

  found.sort((a, b) => a.inDays - b.inDays);
  return {
    data: found,
    meta: {
      window: { days: query.days, from: start.toISOString().slice(0, 10) },
      birthdays: found.filter((item) => item.type === 'birthday').length,
      anniversaries: found.filter((item) => item.type === 'anniversary').length,
    },
  };
}
