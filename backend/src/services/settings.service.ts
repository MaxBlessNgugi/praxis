import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireTenantId } from '../lib/tenant';
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

/**
 * The last step of the welcome wizard.
 *
 * A church that signed itself up has a name and a country and nothing else, so the console shows a
 * short wizard before the console proper — where the church meets, when it meets, and what it is for.
 * Finishing it stamps `Organization.onboardedAt`, which is the one fact the console needs to decide
 * whether to show the wizard again: a flag on the *church* rather than on one person's browser, so the
 * administrator who comes second does not get asked the same questions.
 */
export async function completeOnboarding(input: UpdateProfileInput, actorId: string) {
  const organizationId = requireTenantId();
  const profile = await updateProfile(input, actorId);

  // `Organization` is a platform row, so the tenant client does not scope it — the church is named
  // explicitly here, from the request's own context, so this can only ever stamp the caller's own.
  await prisma.organization.update({ where: { id: organizationId }, data: { onboardedAt: new Date() } });

  return profile;
}

/**
 * A setting is unique *per church*, so the row is addressed by the compound key, not by `key` alone.
 * Two parishes may each keep their own notifications preferences; one of them setting `notifications`
 * must not overwrite the other's.
 */
const settingKey = (key: SettingKey) => ({
  organizationId_key: { organizationId: requireTenantId(), key },
});

export async function getSetting(key: SettingKey) {
  const setting = await prisma.appSetting.findUnique({
    where: settingKey(key),
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
  const existing = await prisma.appSetting.findUnique({ where: settingKey(key) });

  return prisma.$transaction(async (tx) => {
    const setting = await tx.appSetting.upsert({
      where: settingKey(key),
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
 * archived. The export itself is the deliberate act beside it: `exportOrganization` is the only thing
 * that hands out the records, it needs `admin`, and it writes a line in the church's own audit log so
 * a copy leaves a trace of having left.
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
    // Where the export lives, rather than a claim about this endpoint.
    exportAvailable: true,
  };
}

/**
 * How many rows of each log the export carries.
 *
 * The registers are exported whole — a church's members, its giving and its minutes are what the file
 * is for. The two logs are different: they grow without limit, they are the largest tables by far,
 * and a church taking a copy of its own records is asking for its records, not for a hundred thousand
 * of its own audit lines. What is left out is stated in the file itself rather than passed over.
 */
const LOG_EXPORT_LIMIT = 20_000;

/**
 * Money arrives from Prisma as `Decimal`, which `JSON.stringify` renders as `{"s":1,"e":2,"d":[…]}`, a
 * shape no spreadsheet can open. This is the export's edge, where money becomes a number.
 */
function plain(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        Prisma.Decimal.isDecimal(value) ? Number(value.toString()) : value,
      ]),
    ),
  );
}

/**
 * Everything this church has, as one file.
 *
 * Three decisions shape it. **It is a copy, not a report**: retired rows are included, because a
 * member retired by mistake is still part of the church's history and the file is what is left if the
 * database is not. **Credentials are not in it** — no password hash, no session, no storage key — so a
 * file that ends up in the wrong hands cannot be used to sign in as anybody. And **the file says what
 * it is**: the church, the moment, the counts, and what was left out.
 *
 * Stored file *contents* are deliberately absent. Uploads live in the database by default, are
 * already covered by the database's own dump, and embedding them here would turn a ten-megabyte
 * export into a gigabyte of base64 that nobody can open.
 */
export async function exportOrganization(actorId: string) {
  const exportAll = () => ({ orderBy: { createdAt: 'asc' as const } });
  const logs = { orderBy: { createdAt: 'desc' as const }, take: LOG_EXPORT_LIMIT };

  const [
    profile,
    members,
    households,
    ministries,
    ministryMembers,
    services,
    orderOfService,
    attendance,
    rosterDuties,
    swapRequests,
    serviceReports,
    tithes,
    offerings,
    projects,
    contributions,
    welfare,
    charity,
    announcements,
    broadcasts,
    events,
    prayerRequests,
    meetings,
    resolutions,
    documents,
    files,
    staff,
    audit,
    financeLedger,
    archived,
  ] = await Promise.all([
    prisma.organizationProfile.findFirst(),
    prisma.member.findMany(exportAll()),
    prisma.household.findMany(exportAll()),
    prisma.ministry.findMany(exportAll()),
    prisma.ministryMember.findMany(),
    prisma.service.findMany(exportAll()),
    prisma.orderOfServiceItem.findMany(),
    prisma.attendance.findMany(),
    prisma.rosterDuty.findMany(),
    prisma.swapRequest.findMany(),
    prisma.serviceReport.findMany(),
    prisma.tithe.findMany(exportAll()),
    prisma.offering.findMany(exportAll()),
    prisma.project.findMany(exportAll()),
    prisma.projectContribution.findMany(exportAll()),
    prisma.welfareDisbursement.findMany(exportAll()),
    prisma.charityActivity.findMany(exportAll()),
    prisma.announcement.findMany(exportAll()),
    prisma.broadcast.findMany(exportAll()),
    prisma.event.findMany(exportAll()),
    prisma.prayerRequest.findMany(exportAll()),
    prisma.meeting.findMany(exportAll()),
    prisma.resolution.findMany(exportAll()),
    prisma.governanceDocument.findMany(exportAll()),
    // Metadata only: a `select` that leaves the bytes, the bucket key and the checksum behind.
    prisma.storedFile.findMany({ select: { id: true, purpose: true, fileName: true, mimeType: true, byteSize: true, createdAt: true } }),
    // Who works here, and in what role — never how they sign in.
    prisma.organizationMember.findMany({
      select: {
        roleId: true,
        isDefault: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } },
      },
    }),
    prisma.auditLog.findMany(logs),
    prisma.financeAuditEntry.findMany({ orderBy: { sequence: 'desc' }, take: LOG_EXPORT_LIMIT }),
    prisma.softDeletedRecord.findMany({ orderBy: { deletedAt: 'desc' }, take: LOG_EXPORT_LIMIT }),
  ]);

  const records = {
    members: members.length,
    households: households.length,
    ministries: ministries.length,
    services: services.length,
    tithesAndOfferings: tithes.length + offerings.length,
    projects: projects.length,
    meetings: meetings.length,
    documents: documents.length,
    files: files.length,
  };

  // A Trash snapshot of a retired file carries the row as it stood — including the bytes, for the
  // database driver that keeps them on the row. This bundle lists files by name and size on purpose
  // (see `excluded.uploads`), so the same strip is applied to the snapshots rather than making the
  // "no file contents" promise true everywhere except the one section nobody reads until a crisis.
  const stripFileBytes = (rows: Record<string, unknown>[]) =>
    rows.map((row) => {
      const snapshot = row.snapshot as Record<string, unknown> | null;
      if (!snapshot || typeof snapshot !== 'object' || !('storageKey' in snapshot)) return row;
      const { data: bytes, storageKey, ...rest } = snapshot;
      void bytes;
      void storageKey;
      return { ...row, snapshot: rest };
    });

  const bundle = {
    // A version, so a file found in three years can still be read by whatever then reads these.
    format: 'praxis.church-export/1',
    exportedAt: new Date().toISOString(),
    church: { id: requireTenantId(), name: profile?.name ?? null, location: profile?.location ?? null },
    records,
    totalRecords: Object.values(records).reduce((sum, count) => sum + count, 0),
    /** What the file does not contain, said in the file. */
    excluded: {
      uploads: 'Uploaded files are listed by name and size; their contents stay in the database.',
      credentials: 'Password hashes and session tokens are never exported.',
      logs: `The audit log, the finance ledger and the Trash are capped at the ${LOG_EXPORT_LIMIT} most recent rows each.`,
    },
    profile,
    members: plain(members),
    households: plain(households),
    ministries: plain(ministries),
    ministryMembers: plain(ministryMembers),
    services: plain(services),
    orderOfService: plain(orderOfService),
    attendance: plain(attendance),
    rosterDuties: plain(rosterDuties),
    swapRequests: plain(swapRequests),
    serviceReports: plain(serviceReports),
    tithes: plain(tithes),
    offerings: plain(offerings),
    projects: plain(projects),
    projectContributions: plain(contributions),
    welfare: plain(welfare),
    charity: plain(charity),
    announcements: plain(announcements),
    broadcasts: plain(broadcasts),
    events: plain(events),
    prayerRequests: plain(prayerRequests),
    meetings: plain(meetings),
    resolutions: plain(resolutions),
    documents: plain(documents),
    files: plain(files),
    staff: plain(staff as unknown as Record<string, unknown>[]),
    auditLog: plain(audit),
    financeLedger: plain(financeLedger),
    trash: stripFileBytes(plain(archived)),
  };

  // The copy is the one thing here that a church would want a record of, so it is recorded.
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'view',
      entityName: 'Organization',
      entityId: requireTenantId(),
      summary: `Downloaded a copy of the church's records (${bundle.totalRecords} records) from Settings → Data & backup`,
      after: { records, format: bundle.format },
    },
  });

  return bundle;
}
