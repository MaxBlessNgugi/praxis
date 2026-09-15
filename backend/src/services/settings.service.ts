import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { live } from '../lib/live';
import type { SettingKey, UpdateProfileInput, UpdateSettingInput } from '../schemas/settings.schema';

/**
 * Settings: what the church says about itself, and how the console behaves for it.
 *
 * The profile keeps its own table because every screen reads it; the preference screens share one
 * key/value table because they are the screens that change most often, and a column per toggle would
 * mean a migration per toggle.
 */

export async function getProfile() {
  const profile = await prisma.organizationProfile.findFirst();
  if (profile) return profile;

  // Nothing to read yet is not an error: a fresh installation has no profile until somebody saves
  // one, and the console should be able to open the screen and fill it in.
  return {
    id: null,
    name: '',
    tagline: null,
    location: '',
    address: null,
    phone: null,
    email: null,
    website: null,
    vision: null,
    mission: null,
    coreValues: [] as string[],
    serviceTimes: null,
    socials: null,
    logoFileId: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function updateProfile(input: UpdateProfileInput, actorId: string) {
  const existing = await prisma.organizationProfile.findFirst();

  return prisma.$transaction(async (tx) => {
    const data = {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.tagline === undefined ? {} : { tagline: input.tagline }),
      ...(input.location === undefined ? {} : { location: input.location }),
      ...(input.address === undefined ? {} : { address: input.address }),
      ...(input.phone === undefined ? {} : { phone: input.phone }),
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.website === undefined ? {} : { website: input.website }),
      ...(input.vision === undefined ? {} : { vision: input.vision }),
      ...(input.mission === undefined ? {} : { mission: input.mission }),
      ...(input.coreValues === undefined ? {} : { coreValues: input.coreValues }),
      ...(input.serviceTimes === undefined ? {} : { serviceTimes: input.serviceTimes }),
      ...(input.socials === undefined ? {} : { socials: input.socials }),
      ...(input.logoFileId === undefined ? {} : { logoFileId: input.logoFileId }),
    };

    // The profile is one row, created on first save rather than by a migration, so a fresh install
    // has no half-populated placeholder sitting in the database.
    const profile = existing
      ? await tx.organizationProfile.update({ where: { id: existing.id }, data })
      : await tx.organizationProfile.create({
          data: {
            name: input.name ?? 'The church',
            location: input.location ?? 'Not yet set',
            coreValues: input.coreValues ?? [],
            ...data,
          },
        });

    await tx.auditLog.create({
      data: {
        actorId,
        action: existing ? 'update' : 'create',
        entityName: 'OrganizationProfile',
        entityId: profile.id,
        summary: existing ? 'Updated the organization profile' : 'Set up the organization profile',
        before: existing ? { name: existing.name, location: existing.location } : undefined,
        after: { name: profile.name, location: profile.location },
      },
    });
    return profile;
  });
}

export async function getSetting(key: SettingKey) {
  const setting = await prisma.appSetting.findUnique({
    where: { key },
    include: { updatedBy: { select: { id: true, name: true } } },
  });
  // An unset screen has no preferences yet, which is a valid state, not a missing record.
  return setting ?? { key, value: {}, description: null, updatedBy: null, updatedAt: null };
}

export async function listSettings() {
  const settings = await prisma.appSetting.findMany({
    include: { updatedBy: { select: { id: true, name: true } } },
    orderBy: { key: 'asc' },
  });
  return settings;
}

export async function updateSetting(key: SettingKey, input: UpdateSettingInput, actorId: string) {
  const value = input.value as Prisma.InputJsonValue;
  const existing = await prisma.appSetting.findUnique({ where: { key } });

  return prisma.$transaction(async (tx) => {
    const setting = await tx.appSetting.upsert({
      where: { key },
      create: { key, value, updatedById: actorId },
      update: { value, updatedById: actorId },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: existing ? 'update' : 'create',
        entityName: 'AppSetting',
        entityId: setting.id,
        summary: `Changed the ${key} settings`,
        before: existing ? { value: existing.value as Prisma.InputJsonValue } : undefined,
        after: { value: setting.value as Prisma.InputJsonValue },
      },
    });
    return setting;
  });
}

/**
 * What "data sovereignty and backup" can honestly answer from here.
 *
 * A manifest — how much of everything there is, when it was last written, and how much of it is
 * archived — rather than an export. Handing out a dump of every member's pastoral notes over HTTP is
 * a decision with consequences, and it should be a deliberate one, not a convenience endpoint.
 */
export async function backupManifest() {
  const counts = {
    members: prisma.member.count({ where: live }),
    households: prisma.household.count({ where: live }),
    ministries: prisma.ministry.count({ where: live }),
    services: prisma.service.count({ where: live }),
    tithesAndOfferings: prisma.tithe.count({ where: live }).then(async (tithes) => tithes + (await prisma.offering.count({ where: live }))),
    projectContributions: prisma.projectContribution.count({ where: live }),
    welfareCases: prisma.welfareDisbursement.count({ where: live }),
    charityActivities: prisma.charityActivity.count({ where: live }),
    announcements: prisma.announcement.count({ where: live }),
    broadcasts: prisma.broadcast.count({ where: live }),
    events: prisma.event.count({ where: live }),
    prayerRequests: prisma.prayerRequest.count({ where: live }),
    meetings: prisma.meeting.count({ where: live }),
    resolutions: prisma.resolution.count({ where: live }),
    documents: prisma.governanceDocument.count({ where: live }),
    users: prisma.user.count({ where: live }),
  };

  const [totals, archived, lastAudit, lastLedger] = await Promise.all([
    Promise.all(Object.values(counts)),
    prisma.softDeletedRecord.count({ where: { restoredAt: null } }),
    prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, summary: true } }),
    prisma.financeAuditEntry.findFirst({ orderBy: { sequence: 'desc' }, select: { sequence: true, createdAt: true } }),
  ]);

  const named = Object.fromEntries(Object.keys(counts).map((key, index) => [key, totals[index] ?? 0]));

  return {
    records: named,
    totalRecords: totals.reduce((sum: number, value) => sum + (value ?? 0), 0),
    archivedAwaitingRestore: archived,
    lastWrite: lastAudit ? { at: lastAudit.createdAt, summary: lastAudit.summary } : null,
    ledger: lastLedger ? { entries: lastLedger.sequence, at: lastLedger.createdAt } : { entries: 0, at: null },
    // Stated rather than implied: this endpoint reports, it does not export.
    exportAvailable: false,
  };
}
