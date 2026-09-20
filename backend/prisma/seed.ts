import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { env } from '../src/config/env';
import { PANEL_KEYS } from '../src/lib/panels';
import { basePrisma, money, prisma } from '../src/lib/prisma';
import { appendFinanceEntry } from '../src/lib/financeAudit';
import { quorumMet, quorumRequired } from '../src/lib/quorum';
import { enterTenant, requireTenantId } from '../src/lib/tenant';

/**
 * The password this file writes for its two accounts, and the guard that keeps it out of production.
 *
 * These credentials are printed in the README, so they are public: they are fine for a laptop and a
 * demonstration, and they are a back door on a parish's live database. The seed therefore refuses to
 * run with `NODE_ENV=production` unless an operator says `ALLOW_DEMO_SEED=true` on that one command,
 * and it takes `SEED_ADMIN_PASSWORD` when one is given — so a real installation can be provisioned
 * with a real password in the first place rather than being told to change it afterwards.
 */
const DEMO_PASSWORD = 'praxis-demo-2025';

/**
 * Loads the church this system was built for: Destiny Sanctuary Int'L, Nyahururu.
 *
 * The seed is destructive by design — it clears the domain tables and writes a known state — so it
 * is safe to run repeatedly and always lands on the same numbers. It is a development and
 * demonstration fixture, not something to point at a live parish database.
 *
 * Column names follow the schema; where the console and the schema disagree the schema wins, because
 * the API is what other clients will read.
 *
 * It seeds **one church**, and only that church's rows: the organisation it attaches everything to is
 * the tenant, so a second parish on the same database keeps its data when this runs. The one
 * exception is the role table, which is platform-wide — roles are ensured rather than re-created.
 */
const CHURCH_SLUG = 'destiny-sanctuary';

/**
 * The church the seed writes into: created once, then reused.
 *
 * Read through the unscoped client on purpose — there is no context to scope by until this row
 * exists, which is the same reason `authenticate` reads memberships unscoped.
 */
async function ensureOrganization(): Promise<{ id: string; name: string }> {
  const existing = await basePrisma.organization.findFirst({ where: { slug: CHURCH_SLUG } });
  if (existing) {
    // A church Praxis provisioned has been through setup by definition, which is what the welcome
    // wizard switches on: it is for the churches that sign themselves up. This one's profile is
    // written by this very file, so leaving the flag unset would ask the office to describe a church
    // that is already described.
    if (!existing.onboardedAt) {
      await basePrisma.organization.update({
        where: { id: existing.id },
        data: { onboardedAt: new Date() },
      });
    }
    return existing;
  }
  return basePrisma.organization.create({
    data: { name: "Destiny Sanctuary Int'L", slug: CHURCH_SLUG, onboardedAt: new Date() },
    select: { id: true, name: true },
  });
}

const NYAHURURU = 'Nyahururu Main Church';
/**
 * The second campus, spelled the way the console spells it.
 *
 * `NYAHURURU` and `ANNEX` are the only two location values any screen filters on — they are
 * `LOCATIONS` in `src/data/churchDomain.ts`. A record tagged with anything else (a village name, an
 * "Outstation") still reads fine on its own record and is invisible the moment somebody filters by
 * campus, which is a defect nobody reports because nothing looks broken.
 */
const ANNEX = 'Nyahururu Annex';

async function clearDomain(): Promise<void> {
  // Children before parents: the foreign keys are the reason for this order, not taste.
  await prisma.stockMovement.deleteMany();
  await prisma.stockTake.deleteMany();
  await prisma.purchaseLine.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.transfer.deleteMany();
  // A maintenance record RESTRICT-deletes the item it names, so it leaves before its item does.
  await prisma.maintenanceRecord.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.tithe.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.projectContribution.deleteMany();
  await prisma.welfareDisbursement.deleteMany();
  await prisma.charityActivity.deleteMany();
  await prisma.financeAuditEntry.deleteMany();
  // Governance: resolutions point at a meeting, and both point at members.
  await prisma.resolution.deleteMany();
  await prisma.governanceDocument.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.prayerRequest.deleteMany();
  await prisma.groupMeeting.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.ministryMember.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.rosterDuty.deleteMany();
  await prisma.orderOfServiceItem.deleteMany();
  await prisma.serviceReport.deleteMany();
  await prisma.service.deleteMany();
  await prisma.ministry.deleteMany();
  await prisma.member.deleteMany();
  await prisma.household.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.softDeletedRecord.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationProfile.deleteMany();
  await prisma.appSetting.deleteMany();
  // Accounts and roles are platform rows, not this church's, so they are cleared by membership and
  // never wholesale: `user.deleteMany()` would take a second parish's logins with it.
  await prisma.user.deleteMany({
    where: { memberships: { some: { organizationId: requireTenantId() } } },
  });
}

/**
 * The plans Praxis sells, and what each one covers.
 *
 * Ensured, not re-created, for the same reason the roles are: a plan is a platform row that churches
 * point at, so re-seeding must update it rather than replace it — a delete would take every parish's
 * subscription with it. Prices are in shillings a month, which is what a Kenyan parish office budgets
 * in; the limits are generous on members and tight on accounts, because that is the shape of the
 * thing being sold: a big congregation, administered by a handful of people.
 *
 * `limits` is where the member and account ceilings live, and the console renders them as the first
 * two lines of every plan card — so the `features` lists say what a plan *does* and never repeat a
 * number, which would otherwise read as two different promises on the same card.
 */
async function seedPlans(): Promise<Record<string, string>> {
  const plans = [
    {
      key: 'mustard-seed',
      name: 'Mustard Seed',
      tagline: 'For a congregation finding its feet',
      price: new Prisma.Decimal('1500'),
      limits: { maxMembers: 150, maxUsers: 3 },
      features: [
        'Members, households and pastoral care',
        'Services, order of worship and attendance',
        'Tithes, offerings and the giving ledger',
        'Announcements and the Sunday order',
      ],
      sortOrder: 1,
    },
    {
      key: 'harvest',
      name: 'Harvest',
      tagline: 'The whole office, for a growing parish',
      price: new Prisma.Decimal('3500'),
      limits: { maxMembers: 600, maxUsers: 8 },
      features: [
        'Everything in Mustard Seed',
        'Departments, rosters and volunteer cover',
        'Welfare, charity and project funding',
        'Governance: meetings, resolutions and documents',
        'Reports, certificates and the audit trail',
      ],
      sortOrder: 2,
    },
    {
      key: 'sanctuary',
      name: 'Sanctuary',
      tagline: 'For a cathedral or a multi-campus church',
      price: new Prisma.Decimal('7500'),
      limits: { maxMembers: 3000, maxUsers: 20 },
      features: [
        'Everything in Harvest',
        'Multiple campuses and congregations',
        'Room for 20 staff accounts',
        'Priority support and data export',
      ],
      sortOrder: 3,
      isPublic: false,
    },
  ];

  const ids: Record<string, string> = {};
  for (const plan of plans) {
    const saved = await basePrisma.plan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        tagline: plan.tagline,
        price: plan.price,
        limits: plan.limits as Prisma.InputJsonValue,
        features: plan.features as Prisma.InputJsonValue,
        sortOrder: plan.sortOrder,
        // Sanctuary is quoted in a conversation rather than listed on the upgrade screen, which is
        // how the largest parishes are handled; the other two are offered self-service.
        isPublic: plan.isPublic ?? true,
      },
      create: {
        key: plan.key,
        name: plan.name,
        tagline: plan.tagline,
        price: plan.price,
        limits: plan.limits as Prisma.InputJsonValue,
        features: plan.features as Prisma.InputJsonValue,
        sortOrder: plan.sortOrder,
        trialDays: 14,
        isPublic: plan.isPublic ?? true,
      },
    });
    ids[plan.key] = saved.id;
  }
  return ids;
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Refusing to seed a production database with demo data. This command clears the domain tables ' +
        'and writes accounts whose password is published in the README. If that is really what you want ' +
        'for a brand-new install, run it with ALLOW_DEMO_SEED=true and SEED_ADMIN_PASSWORD=<a real one>.',
    );
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || DEMO_PASSWORD;
  if (env.NODE_ENV === 'production' && adminPassword === DEMO_PASSWORD) {
    console.warn(
      'WARNING: seeding with the published demo password. Change it from the console immediately ' +
        '(Account menu → Security) or the installation is open to anyone who has read the README.',
    );
  }

  const organization = await ensureOrganization();
  // The seed serves exactly one church for its whole life, so the context is entered once rather
  // than wrapped around every statement. `enterWith` is legitimate here and nowhere in the request
  // path: in a server it would outlive the request that set it.
  enterTenant({ organizationId: organization.id });

  await clearDomain();

  // -------------------------------------------------------------------------------------------
  // The profile screen, verbatim from the church
  // -------------------------------------------------------------------------------------------
  // Every fact below is taken from destinysanctuary.co.ke (home, about, contact) and is the *same*
  // value the console carries in `src/data/churchDomain.ts`. Those two must not drift: the console
  // reads its identity from there and this row is what the API serves, so an edit in one place that
  // is not made in the other is two screens disagreeing about the church's own phone number.
  await prisma.organizationProfile.create({
    data: {
      name: "Destiny Sanctuary Int'L",
      tagline: 'Raising a generation that demonstrates the raw Power of God',
      location: NYAHURURU,
      address: "Destiny Sanctuary Int'L, Nyahururu, Laikipia, Kenya",
      phone: '+254 721 338 928',
      email: 'sachemwa@yahoo.com',
      website: 'https://destinysanctuary.co.ke',
      vision:
        'Destiny Sanctuary exists to see every believer built, equipped, trained, empowered and made whole through the word of God and His manifest presence.',
      // The site publishes a three-point mission; the column is a single string, so the points are
      // numbered rather than merged into one run-on sentence nobody can quote back.
      mission:
        '1. To build a family of true sons and daughters who pursue the presence of God and demonstrate the raw power of God to our community, region, and the Nations. ' +
        '2. To establish a strong base in Kenya full of the love of God to serve as a sending body to reach out into African communities with the love, compassion and the grace that sets all free. ' +
        '3. To reach the unreached; the dying, hungry and needy.',
      coreValues: [
        'His Presence',
        'Supernatural Lifestyle',
        'Healthy Relationships',
        'Wholeness',
        'Responsive to Grace',
        'Free and Responsible',
        'Honor Affirms Value',
        'Jesus is Our Model',
        "God's Word Transforms",
        'Community Engagement',
      ],
      // Their published Sunday running order, then their Wednesday block. The six Sunday rows add up
      // to the 8:00 AM – 2:00 PM window the Service Planner plans inside, which is why the seeded
      // services start at 8:00 AM rather than at some rounder hour.
      serviceTimes: {
        'First Service': '8:00 AM – 10:00 AM',
        'Praise & Worship': '10:00 AM – 11:00 AM',
        'Presentation / Visitors': '11:00 AM – 11:30 AM',
        'Sermon / Word Ministry': '11:30 AM – 12:45 PM',
        'Congregation Dismissed': '12:50 PM',
        'Groups Meetings & Fellowship': '1:30 PM – 2:00 PM',
        'Wednesdays (Counseling, Prayers & Midweek Services)': '9:00 AM – 5:00 PM',
      },
      socials: {
        Facebook: 'https://www.facebook.com/destinysanctuary',
        YouTube: 'https://www.youtube.com/@destinysanctuary',
        Instagram: 'https://www.instagram.com/destiny_sanctuary',
        'Twitter / X': 'https://twitter.com/destinysanctuary',
        Podcast: 'https://destinysanctuary.co.ke/',
        Email: 'sachemwa@yahoo.com',
      },
    },
  });

  // -------------------------------------------------------------------------------------------
  // Roles: four keys, the same ones the console's permission module resolves
  // -------------------------------------------------------------------------------------------
  // The console's `PanelKey` union, not this file's inventiveness: a right granted under a key the
  // console does not read is a right nobody has.
  // Read from the module the authorisation gate reads, so a panel added there cannot be granted here
  // under a key no gate asks about — or gated there under a key no role grants.
  const fullPanels = Object.fromEntries(PANEL_KEYS.map((key) => [key, true]));
  // Staff run the office but not the platform: every panel except the rights editor.
  const staffPanels = { ...fullPanels, admin: false };
  // A viewer is granted its four panels explicitly. The console **denies any key the API does not
  // send**, so listing them is not decoration — an omitted key would otherwise read as a grant.
  const viewerPanels = { home: true, members: true, giving: true, reports: true };

  // Ensured, not re-created: a role is a template the platform ships, and a membership in another
  // church may already point at it.
  const role = (key: string, name: string, panels: Record<string, boolean>, actions: Record<string, boolean>) =>
    prisma.role.upsert({ where: { key }, update: { name, panels, actions }, create: { key, name, panels, actions } });

  const [superAdmin, admin] = await Promise.all([
    role('super_admin', 'Super Administrator', fullPanels, { view: true, edit: true, delete: true }),
    role('admin', 'Administrator', fullPanels, { view: true, edit: true, delete: true }),
    role('staff', 'Church Staff', staffPanels, { view: true, edit: true, delete: false }),
    role('viewer', 'Viewer', viewerPanels, { view: true, edit: false, delete: false }),
  ]);

  // -------------------------------------------------------------------------------------------
  // Leadership, then the register around them
  // -------------------------------------------------------------------------------------------
  const bishop = await prisma.user.create({
    data: {
      name: 'Bishop Sammy',
      email: 'bishop@destinysanctuary.co.ke',
      passwordHash: await hashPassword(adminPassword),
      roleId: superAdmin.id,
      lastLoginAt: new Date(),
      // The operator's flag, and the only account in the fixture that carries it: it is what opens the
      // vendor screens, which list every church on the platform. A church's own staff must never hold
      // it, which is why it is not a role — every parish has a `super_admin` of its own.
      isPlatformAdmin: true,
      // An account is a login; the membership is what puts it in this church, in this role.
      memberships: { create: { roleId: superAdmin.id, isDefault: true } },
    },
  });

  const alice = await prisma.user.create({
    data: {
      name: 'Rev. Alice',
      email: 'alice@destinysanctuary.co.ke',
      passwordHash: await hashPassword(adminPassword),
      roleId: admin.id,
      memberships: { create: { roleId: admin.id, isDefault: true } },
    },
  });

  await prisma.household.createMany({
    data: [
      { name: 'The Ngugi Household', unitNumber: 'HH-101', location: NYAHURURU, address: 'Kenyatta Avenue, Nyahururu' },
      { name: 'The Njeri Household', unitNumber: 'HH-102', location: NYAHURURU, address: 'Gichagi Road, Nyahururu' },
      { name: 'The Mwangi Household', unitNumber: 'HH-103', location: NYAHURURU, address: 'Nyeri Road, Nyahururu' },
      { name: 'The Kimani Household', unitNumber: 'HH-104', location: NYAHURURU, address: 'Engineer Road, Nyahururu' },
      { name: 'The Mwaura Household', unitNumber: 'HH-105', location: NYAHURURU, address: 'Ol Ngarua Road, Nyahururu' },
      { name: 'The Kiptoo Household', unitNumber: 'HH-106', location: ANNEX, address: 'Ol Kalou Road, Nyahururu' },
    ],
  });
  const householdByUnit = new Map(
    (await prisma.household.findMany({ select: { id: true, unitNumber: true } })).map((row) => [row.unitNumber, row.id]),
  );
  const home = (unitNumber: string): string => {
    const id = householdByUnit.get(unitNumber);
    if (!id) throw new Error(`The seed named a household it never created: ${unitNumber}`);
    return id;
  };

  // The register. Written as data rather than eighteen `create` calls: at this size the shape of the
  // register is the interesting part and the ceremony of building it row by row is noise. Birthdays
  // and wedding dates are here on purpose — the console's Birthdays & Anniversaries screen counts down
  // to them, and a register with no dates in it makes that screen look broken.
  const register: Prisma.MemberCreateManyInput[] = [
    {
      memberId: 'MBR-1001', firstName: 'Sammy', lastName: 'Ngugi', initials: 'SN',
      email: 'bishop@destinysanctuary.co.ke', phone: '+254 721 338 928',
      dateOfBirth: new Date('1970-03-14T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-101'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1001', baptismType: 'baptized', baptismDate: new Date('1994-08-14T00:00:00+03:00'),
      baptismOfficiant: 'Bishop Sammy', tags: ['Church Council', 'Visionary Leadership'],
      joinedAt: new Date('2012-01-08T00:00:00+03:00'),
      weddingAnniversary: new Date('2005-06-11T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1002', firstName: 'Alice', lastName: 'Njeri', initials: 'AN',
      email: 'alice@destinysanctuary.co.ke', phone: '+254 720 118 340',
      dateOfBirth: new Date('1974-07-22T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-102'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1002', baptismType: 'baptized',
      tags: ['Church Council', 'Church Administrator'],
      joinedAt: new Date('2012-01-08T00:00:00+03:00'),
      weddingAnniversary: new Date('2009-09-05T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1003', firstName: 'Caleb', lastName: 'Mwangi', initials: 'CM',
      email: 'caleb.mwangi@destinysanctuary.co.ke', phone: '+254 733 902 771',
      dateOfBirth: new Date('1988-11-02T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-103'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1003', baptismType: 'baptized',
      tags: ['Worship & Word Ministry', 'Choir & Band'], joinedAt: new Date('2015-03-15T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1004', firstName: 'Mary', lastName: 'Wanjiku', initials: 'MW', phone: '+254 715 447 220',
      dateOfBirth: new Date('1991-05-30T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-103'), householdRole: 'Spouse',
      envelopeNumber: 'ENV-1004', baptismType: 'baptized', tags: ["Women's Fellowship"],
      joinedAt: new Date('2016-02-14T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1005', firstName: 'Daniel', lastName: 'Kiptoo', initials: 'DK', phone: '+254 701 335 908',
      dateOfBirth: new Date('1996-01-19T00:00:00+03:00'),
      location: ANNEX, householdId: home('HH-106'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1005', baptismType: 'baptized', tags: ['Destiny Youth'],
      joinedAt: new Date('2019-06-09T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1006', firstName: 'David', lastName: 'Kimani', initials: 'DK', phone: '+254 722 664 118',
      dateOfBirth: new Date('1985-09-12T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-104'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1006', baptismType: 'baptized',
      tags: ['Destiny Youth', 'Mentorship'], joinedAt: new Date('2014-09-07T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1007', firstName: 'Sarah', lastName: 'Kimani', initials: 'SK', phone: '+254 711 220 774',
      dateOfBirth: new Date('1987-04-03T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-104'), householdRole: 'Spouse',
      envelopeNumber: 'ENV-1007', baptismType: 'baptized', tags: ["Women's Fellowship"],
      joinedAt: new Date('2014-09-07T00:00:00+03:00'),
      weddingAnniversary: new Date('2011-12-03T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1008', firstName: 'Hannah', lastName: 'Kimani', initials: 'HK', phone: '+254 745 118 902',
      dateOfBirth: new Date('2005-02-17T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-104'), householdRole: 'Daughter',
      envelopeNumber: 'ENV-1008', baptismType: 'dedicated',
      baptismDate: new Date('2010-04-11T00:00:00+03:00'), tags: ['Destiny Youth'],
      joinedAt: new Date('2010-04-11T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1009', firstName: 'Jonathan', lastName: 'Mwaura', initials: 'JM',
      email: 'jonathan.mwaura@destinysanctuary.co.ke', phone: '+254 733 551 204',
      dateOfBirth: new Date('1969-08-25T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-105'), householdRole: 'Head', isHouseholdHead: true,
      envelopeNumber: 'ENV-1009', baptismType: 'baptized', tags: ['Groups & Discipleship'],
      joinedAt: new Date('2013-05-19T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1010', firstName: 'Esther', lastName: 'Muthoni', initials: 'EM', phone: '+254 722 908 331',
      dateOfBirth: new Date('1972-12-08T00:00:00+03:00'),
      location: NYAHURURU, householdId: home('HH-105'), householdRole: 'Spouse',
      envelopeNumber: 'ENV-1010', baptismType: 'baptized', tags: ["Women's Fellowship"],
      joinedAt: new Date('2013-05-19T00:00:00+03:00'),
      weddingAnniversary: new Date('1997-08-23T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1011', firstName: 'Clara', lastName: 'Wambui', initials: 'CW', phone: '+254 726 445 019',
      dateOfBirth: new Date('1979-02-11T00:00:00+03:00'), location: NYAHURURU,
      envelopeNumber: 'ENV-1011', baptismType: 'baptized',
      tags: ['Missions, Mercy & Church Planting'], joinedAt: new Date('2016-10-02T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1012', firstName: 'Marcus', lastName: 'Kamau', initials: 'MK', phone: '+254 700 774 226',
      dateOfBirth: new Date('1983-06-06T00:00:00+03:00'), location: NYAHURURU,
      envelopeNumber: 'ENV-1012', baptismType: 'baptized', tags: ['Ushering & Hospitality'],
      joinedAt: new Date('2017-01-15T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1013', firstName: 'Grace', lastName: 'Wairimu', initials: 'GW', phone: '+254 718 330 615',
      dateOfBirth: new Date('1994-10-19T00:00:00+03:00'), location: NYAHURURU,
      envelopeNumber: 'ENV-1013', baptismType: 'baptized', tags: ["Women's Fellowship"],
      joinedAt: new Date('2020-02-09T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1014', firstName: 'Elena', lastName: 'Mwangi', initials: 'EM', phone: '+254 741 552 088',
      dateOfBirth: new Date('1990-03-27T00:00:00+03:00'), location: NYAHURURU,
      envelopeNumber: 'ENV-1014', baptismType: 'baptized', tags: ['Next Generation & Children'],
      joinedAt: new Date('2018-04-08T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1015', firstName: 'Peter', lastName: 'Njoroge', initials: 'PN', phone: '+254 713 908 447',
      dateOfBirth: new Date('1999-07-14T00:00:00+03:00'), location: ANNEX,
      envelopeNumber: 'ENV-1015', baptismType: 'baptized', tags: ['Destiny Youth'],
      joinedAt: new Date('2022-05-22T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1016', firstName: 'Ruth', lastName: 'Adhiambo', initials: 'RA', phone: '+254 702 118 663',
      dateOfBirth: new Date('2001-11-09T00:00:00+03:00'), location: ANNEX,
      envelopeNumber: 'ENV-1016', baptismType: 'dedicated', tags: ['Destiny Youth'],
      joinedAt: new Date('2023-01-08T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1017', firstName: 'Joseph', lastName: 'Mutua', initials: 'JM', phone: '+254 734 220 991',
      dateOfBirth: new Date('1976-09-30T00:00:00+03:00'), location: NYAHURURU, status: 'inactive',
      envelopeNumber: 'ENV-1017', baptismType: 'baptized',
      pastoralNotes: 'Moved to Nakuru for work; asked to stay on the roll until the family settles.',
      joinedAt: new Date('2015-11-01T00:00:00+03:00'),
    },
    {
      memberId: 'MBR-1018', firstName: 'Lucy', lastName: 'Chebet', initials: 'LC', phone: '+254 716 443 208',
      dateOfBirth: new Date('2014-06-21T00:00:00+03:00'),
      location: ANNEX, householdId: home('HH-106'), householdRole: 'Daughter',
      envelopeNumber: 'ENV-1018', baptismType: 'dedicated',
      baptismDate: new Date('2018-09-09T00:00:00+03:00'), tags: ['Next Generation & Children'],
      joinedAt: new Date('2018-09-09T00:00:00+03:00'),
    },
  ];

  await prisma.member.createMany({ data: register });

  const memberByNumber = new Map(
    (await prisma.member.findMany({ select: { id: true, memberId: true } })).map((row) => [row.memberId, row.id]),
  );
  const person = (memberId: string): string => {
    const id = memberByNumber.get(memberId);
    if (!id) throw new Error(`The seed named a member it never created: ${memberId}`);
    return id;
  };

  // The five people the rest of this file hangs records off. Held as `{ id }` so every call site below
  // reads exactly as it did when these were rows handed back by `create`.
  const bishopRecord = { id: person('MBR-1001') };
  const aliceRecord = { id: person('MBR-1002') };
  const caleb = { id: person('MBR-1003') };
  const mary = { id: person('MBR-1004') };
  const daniel = { id: person('MBR-1005') };

  // The two office logins belong to people on the register. That link is what lets a volunteer
  // request cover for their own duty rather than only an administrator acting on their behalf.
  await prisma.user.update({ where: { id: bishop.id }, data: { memberId: bishopRecord.id } });
  await prisma.user.update({ where: { id: alice.id }, data: { memberId: aliceRecord.id } });

  // -------------------------------------------------------------------------------------------
  // Ministry: the seven departments the Ministries screen shows, under Bishop Sammy and Rev. Alice
  // -------------------------------------------------------------------------------------------
  // The seven departments are the church's own ministries, and the two people it publishes as its
  // leaders lead all seven: **Bishop Sammy four, Rev. Alice three**. That split is not decoration —
  // they are the only two leaders this church documents, so a card with a third figurehead on it is
  // an invented office. Everyone else appears as a member of a department, which is what they are.
  // The names, the split and the meeting days are the same values the console's department grid
  // carries, so the two halves of the system describe one organization.
  const ministries = await Promise.all(
    [
      { name: 'Visionary Leadership & Church Council', description: 'The Bishop, the elders and the deacons who set direction.', leaderId: bishopRecord.id, meetingDay: 'Tuesday', location: NYAHURURU },
      { name: 'Worship & Word Ministry', description: 'Choir, instrumentalists, sound and the pulpit.', leaderId: bishopRecord.id, meetingDay: 'Sunday', location: NYAHURURU },
      { name: "Women's Fellowship", description: 'The women of the congregation, meeting weekly.', leaderId: aliceRecord.id, meetingDay: 'Thursday', location: NYAHURURU },
      { name: 'Destiny Youth', description: 'Teens and young adults.', leaderId: aliceRecord.id, meetingDay: 'Friday', location: NYAHURURU },
      { name: 'Next Generation & Children', description: 'Sunday school and teen discipleship.', leaderId: aliceRecord.id, meetingDay: 'Sunday', location: NYAHURURU },
      { name: 'Groups & Discipleship', description: 'Cell groups and the discipleship classes.', leaderId: bishopRecord.id, meetingDay: 'Sunday', location: NYAHURURU },
      { name: 'Missions, Mercy & Church Planting', description: 'Outreach, the welfare fund and the outstations.', leaderId: bishopRecord.id, meetingDay: 'Tuesday & Saturday', location: NYAHURURU },
    ].map((data) => prisma.ministry.create({ data })),
  );
  const department = (name: string) => {
    const found = ministries.find((ministry) => ministry.name === name);
    if (!found) throw new Error(`The seed named a department it never created: ${name}`);
    return found.id;
  };

  // One row per person per department, with the office each holds. `associate` is the role the
  // console prints under a department's leader: a named deputy, not a second leader.
  const ministryRoll = [
    { ministryId: department('Visionary Leadership & Church Council'), memberId: bishopRecord.id, roleTitle: 'Moderator' },
    { ministryId: department('Visionary Leadership & Church Council'), memberId: aliceRecord.id, roleTitle: 'Church Administrator' },
    { ministryId: department('Worship & Word Ministry'), memberId: caleb.id, roleTitle: 'Director of Music & Service' },
    { ministryId: department('Worship & Word Ministry'), memberId: person('MBR-1014'), roleTitle: 'Member' },
    { ministryId: department("Women's Fellowship"), memberId: person('MBR-1007'), roleTitle: 'Women\u2019s Ministry Coordinator' },
    { ministryId: department("Women's Fellowship"), memberId: mary.id, roleTitle: 'Member' },
    { ministryId: department("Women's Fellowship"), memberId: person('MBR-1010'), roleTitle: 'Member' },
    { ministryId: department("Women's Fellowship"), memberId: person('MBR-1013'), roleTitle: 'Member' },
    { ministryId: department('Destiny Youth'), memberId: person('MBR-1008'), roleTitle: 'Youth Coordinator' },
    { ministryId: department('Destiny Youth'), memberId: daniel.id, roleTitle: 'Member' },
    { ministryId: department('Destiny Youth'), memberId: person('MBR-1015'), roleTitle: 'Member' },
    { ministryId: department('Destiny Youth'), memberId: person('MBR-1016'), roleTitle: 'Member' },
    { ministryId: department('Next Generation & Children'), memberId: person('MBR-1014'), roleTitle: "Children\u2019s Director" },
    { ministryId: department('Next Generation & Children'), memberId: person('MBR-1018'), roleTitle: 'Member' },
    { ministryId: department('Groups & Discipleship'), memberId: person('MBR-1009'), roleTitle: 'Discipleship & Bible Study Dean' },
    { ministryId: department('Groups & Discipleship'), memberId: mary.id, roleTitle: 'Member' },
    { ministryId: department('Missions, Mercy & Church Planting'), memberId: person('MBR-1011'), roleTitle: 'Outreach Almoner' },
    { ministryId: department('Missions, Mercy & Church Planting'), memberId: daniel.id, roleTitle: 'Member' },
    { ministryId: department('Missions, Mercy & Church Planting'), memberId: person('MBR-1012'), roleTitle: 'Member' },
  ];
  await prisma.ministryMember.createMany({ data: ministryRoll });

  // -------------------------------------------------------------------------------------------
  // The midweek circles — the Groups & Fellowships tab's own register. The church already names a
  // **Groups & Discipleship** department, so the two seeded circles sit under its Dean's shepherding:
  // one meets midweek in a home, one gathers after service. Each carries a roll and one recorded
  // gathering, so a fresh install opens on a screen that shows the pattern rather than an empty page.
  const groupsAndMeetings = [
    {
      group: {
        name: 'Grace Circle (Tuesday Cell)',
        description: 'A midweek cell meeting in a member\u2019s home, under the Groups & Discipleship department.',
        leaderId: person('MBR-1009'),
        meetingDay: 'Tuesday',
        location: 'Member\u2019s home, Nyahururu',
      },
      members: [
        { memberId: person('MBR-1009'), roleTitle: 'Shepherd' },
        { memberId: person('MBR-1007'), roleTitle: 'Member' },
        { memberId: person('MBR-1010'), roleTitle: 'Member' },
      ],
      meeting: { metAt: new Date('2026-09-15T19:00:00+03:00'), hostName: 'Sarah Kimani', attendedCount: 3, notes: 'Opened with the Tuesday hymn; studied John 15.' },
    },
    {
      group: {
        name: 'Sunday Encouragement Circle',
        description: 'Gathers after second service for prayer and a short study.',
        leaderId: mary.id,
        meetingDay: 'Sunday',
        location: NYAHURURU,
      },
      members: [
        { memberId: mary.id, roleTitle: 'Shepherd' },
        { memberId: person('MBR-1013'), roleTitle: 'Member' },
      ],
      meeting: { metAt: new Date('2026-09-13T11:30:00+03:00'), hostName: null, attendedCount: 2, notes: null },
    },
  ];
  for (const entry of groupsAndMeetings) {
    const group = await prisma.group.create({ data: entry.group });
    await prisma.groupMember.createMany({ data: entry.members.map((row) => ({ ...row, groupId: group.id })) });
    await prisma.groupMeeting.create({ data: { ...entry.meeting, groupId: group.id } });
  }

  /**
   * The Session's roll, and what a sitting of it needs.
   *
   * Counted from the rows just written, by the rule in `src/lib/quorum` rather than by a number typed
   * here, so a seeded sitting carries the quorum figure the API arrives at for the same church. The
   * attendance and the division are derived from that roll for the same reason: a minute claiming
   * fourteen votes in a council of eight is not a record, it is a contradiction.
   */
  const officerRoll = new Set(
    ministryRoll.filter((row) => row.roleTitle !== 'Member').map((row) => row.memberId),
  ).size;
  const sittingQuorum = quorumRequired(officerRoll);
  const sittingAttendance = officerRoll - 1;

  // -------------------------------------------------------------------------------------------
  // Six Sundays of history, ending on the day the console pretends is today
  // -------------------------------------------------------------------------------------------
  // A fixture with one service in it makes every trend on every screen a flat line and leaves the
  // giving ledger looking like a stub, so a real quarter-to-date is written: the census, the
  // collection and the tithes for each Sunday.
  //
  // The history stops on **2025-02-09** because that is the day the console pretends is today
  // (`DEMO_TODAY` in `src/data/churchDomain.ts`); the one service after it is the Sunday being
  // planned. Services start at **8:00 AM** because that is the church's published First Service —
  // the window the Service Planner's own running order adds up to.
  const theme = 'My Year of Dominion';

  /** One Sunday's numbers. A `giving` row reads [member number, amount, method, category]. */
  type Giving = [string | null, number, Prisma.TitheCreateManyInput['method'], string];
  interface Sunday {
    date: string;
    adults: number;
    children: number;
    visitors: number;
    plateCash: number;
    envelopes: number;
    giving: Giving[];
  }

  const sundays: Sunday[] = [
    {
      date: '2025-01-05', adults: 604, children: 118, visitors: 11, plateCash: 49760, envelopes: 14300,
      giving: [
        ['MBR-1001', 25000, 'mpesa', 'Tithe'],
        ['MBR-1003', 8000, 'cash', 'Tithe'],
        ['MBR-1009', 12000, 'bank_transfer', 'Tithe'],
        ['MBR-1011', 3500, 'mpesa', 'Thanksgiving'],
        [null, 2000, 'cash', 'Building Fund'],
      ],
    },
    {
      date: '2025-01-12', adults: 622, children: 124, visitors: 9, plateCash: 51230, envelopes: 15800,
      giving: [
        ['MBR-1001', 25000, 'mpesa', 'Tithe'],
        ['MBR-1004', 5000, 'mpesa', 'Thanksgiving'],
        ['MBR-1006', 6000, 'cash', 'Tithe'],
        ['MBR-1010', 6500, 'bank_transfer', 'Tithe'],
        ['MBR-1013', 2000, 'mpesa', 'Tithe'],
      ],
    },
    {
      date: '2025-01-19', adults: 658, children: 131, visitors: 16, plateCash: 53980, envelopes: 16250,
      giving: [
        ['MBR-1001', 30000, 'mpesa', 'Tithe'],
        ['MBR-1003', 8000, 'cash', 'Tithe'],
        ['MBR-1007', 4500, 'mpesa', 'Thanksgiving'],
        ['MBR-1014', 3000, 'cash', 'Tithe'],
        ['MBR-1015', 1200, 'mpesa', 'Tithe'],
        [null, 5000, 'cash', 'Building Fund'],
      ],
    },
    {
      date: '2025-01-26', adults: 641, children: 128, visitors: 12, plateCash: 52410, envelopes: 15900,
      giving: [
        ['MBR-1001', 25000, 'mpesa', 'Tithe'],
        ['MBR-1004', 5000, 'mpesa', 'Thanksgiving'],
        ['MBR-1009', 12000, 'bank_transfer', 'Tithe'],
        ['MBR-1012', 1500, 'cash', 'Tithe'],
        ['MBR-1016', 800, 'mpesa', 'Tithe'],
      ],
    },
    {
      date: '2025-02-02', adults: 693, children: 137, visitors: 21, plateCash: 58470, envelopes: 17600,
      giving: [
        ['MBR-1001', 25000, 'mpesa', 'Tithe'],
        ['MBR-1003', 8000, 'cash', 'Tithe'],
        ['MBR-1007', 4500, 'mpesa', 'Thanksgiving'],
        ['MBR-1010', 6500, 'bank_transfer', 'Tithe'],
        ['MBR-1011', 3500, 'mpesa', 'Tithe'],
        [null, 2500, 'cash', 'Building Fund'],
      ],
    },
    // The console's clock day. Its figures are the ones a demo is expected to open on, so the census
    // reads twenty-three first-time visitors and the write-up below quotes it.
    {
      date: '2025-02-09', adults: 712, children: 140, visitors: 23, plateCash: 61240, envelopes: 18900,
      giving: [
        ['MBR-1001', 25000, 'mpesa', 'Tithe'],
        ['MBR-1003', 8000, 'cash', 'Tithe'],
        ['MBR-1004', 5000, 'mpesa', 'Thanksgiving'],
        ['MBR-1006', 6000, 'cash', 'Tithe'],
        ['MBR-1009', 12000, 'bank_transfer', 'Tithe'],
        ['MBR-1014', 3000, 'mpesa', 'Tithe'],
        [null, 2000, 'cash', 'Building Fund'],
      ],
    },
  ];

  let titheSeq = 0;
  let offeringSeq = 0;
  /** The Sundays written above, with the figures each week's report has to agree with. */
  const seededSundays: Array<{ id: string; sunday: Sunday; tithesTotal: number }> = [];

  for (const sunday of sundays) {
    const created = await prisma.service.create({
      data: {
        title: 'Sunday Worship Service',
        heldAt: new Date(`${sunday.date}T08:00:00+03:00`),
        startTime: '8:00 AM',
        venue: NYAHURURU,
        theme,
        officiantId: bishopRecord.id,
      },
    });

    await prisma.attendance.createMany({
      data: [
        { serviceId: created.id, kind: 'service', count: sunday.adults, notes: 'Adults and youth' },
        { serviceId: created.id, kind: 'service', count: sunday.children, notes: 'Children' },
        { serviceId: created.id, kind: 'service', count: sunday.visitors, notes: 'First-time visitors' },
      ],
    });

    await prisma.offering.createMany({
      data: [
        { txCode: `OF-2025-${String((offeringSeq += 1)).padStart(4, '0')}`, serviceId: created.id, amount: sunday.plateCash.toFixed(2), method: 'cash', category: 'Plate Cash', receivedAt: new Date(`${sunday.date}T11:05:00+03:00`), recordedById: bishop.id },
        { txCode: `OF-2025-${String((offeringSeq += 1)).padStart(4, '0')}`, serviceId: created.id, amount: sunday.envelopes.toFixed(2), method: 'mpesa', category: 'Designated Envelopes', receivedAt: new Date(`${sunday.date}T11:08:00+03:00`), recordedById: bishop.id },
      ],
    });

    // A donor's name and envelope come off the register rather than being retyped beside it, so a
    // giving record can never name somebody the register has never heard of. A `null` member is the
    // unaddressed envelope a treasurer still has to bank: it is recorded, and it is anonymous.
    const giving = sunday.giving.map(([memberNumber, amount, method, category]) => {
      const donor = memberNumber === null ? null : register.find((row) => row.memberId === memberNumber);
      if (memberNumber !== null && !donor) {
        throw new Error(`The seed gave from a member it never created: ${memberNumber}`);
      }
      return {
        txCode: `TX-2025-${String((titheSeq += 1)).padStart(4, '0')}`,
        memberId: memberNumber === null ? null : person(memberNumber),
        donorName: donor ? `${donor.firstName} ${donor.lastName}` : 'Anonymous Giver',
        envelopeNo: donor?.envelopeNumber ?? null,
        amount: amount.toFixed(2),
        method,
        category,
        recordedById: bishop.id,
        receivedAt: new Date(`${sunday.date}T11:12:00+03:00`),
      };
    });
    await prisma.tithe.createMany({ data: giving });

    seededSundays.push({
      id: created.id,
      sunday,
      tithesTotal: sunday.giving.reduce((total, [, amount]) => total + amount, 0),
    });
  }

  const latest = seededSundays[seededSundays.length - 1]!;
  const previous = seededSundays[seededSundays.length - 2]!;
  /** What the plate, the envelopes and the named giving came to, which is the report's own total. */
  const collected = ({ sunday, tithesTotal }: (typeof seededSundays)[number]) =>
    (sunday.plateCash + sunday.envelopes + tithesTotal).toFixed(2);

  // A roster is a plan rather than an archive, so only the two most recent Sundays carry one; six
  // weeks of it would be noise on the Volunteer Roster screen.
  await prisma.rosterDuty.createMany({
    data: [
      { serviceId: latest.id, memberId: aliceRecord.id, roleTitle: 'Service Leader', ministryId: department('Visionary Leadership & Church Council'), status: 'completed' },
      { serviceId: latest.id, memberId: caleb.id, roleTitle: 'Worship Leader', ministryId: department('Worship & Word Ministry'), status: 'completed' },
      // Ushering is a serving team, not one of the seven departments, so this duty carries no
      // `ministryId`. See the note in README's "Known modelling gaps".
      { serviceId: latest.id, memberId: person('MBR-1012'), roleTitle: 'Welcome & Ushering Lead', status: 'completed' },
      { serviceId: latest.id, memberId: person('MBR-1014'), roleTitle: "Children's Church Teacher", ministryId: department('Next Generation & Children'), status: 'completed' },
      { serviceId: previous.id, memberId: aliceRecord.id, roleTitle: 'Service Leader', ministryId: department('Visionary Leadership & Church Council'), status: 'completed' },
      { serviceId: previous.id, memberId: caleb.id, roleTitle: 'Worship Leader', ministryId: department('Worship & Word Ministry'), status: 'completed' },
      { serviceId: previous.id, memberId: daniel.id, roleTitle: 'Welcome & Ushering Lead', status: 'completed' },
    ],
  });

  // A rehearsal is a group attendance, not a service one, which is what `kind` is for.
  await prisma.attendance.create({
    data: { serviceId: latest.id, memberId: caleb.id, kind: 'group', count: 1, notes: 'Praise & Worship rehearsal' },
  });

  // The write-up that closes a week, for the last two Sundays.
  await prisma.serviceReport.createMany({
    data: [
      {
        serviceId: latest.id,
        summary: 'A full sanctuary for the second Sunday of February, with twenty-three first-time visitors received and the choir leading the procession.',
        adultsCount: latest.sunday.adults,
        childrenCount: latest.sunday.children,
        visitorsCount: latest.sunday.visitors,
        offeringsTotal: collected(latest),
        highlights: 'Three families asked about joining a household unit after the service.',
        preparedById: bishop.id,
      },
      {
        serviceId: previous.id,
        summary: 'A strong first Sunday of the month, with twenty-one visitors and the youth leading the praise set.',
        adultsCount: previous.sunday.adults,
        childrenCount: previous.sunday.children,
        visitorsCount: previous.sunday.visitors,
        offeringsTotal: collected(previous),
        highlights: 'The youth presented their plans for the National Youth Conference in December.',
        preparedById: bishop.id,
      },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // Next Sunday, planned in advance: the order of service written, the volunteers rostered, and one
  // of them asking for cover — the three states the planner, the roster and the swap list show.
  // -------------------------------------------------------------------------------------------
  const nextSunday = await prisma.service.create({
    data: {
      title: 'Sunday Worship Service', heldAt: new Date('2025-02-16T08:00:00+03:00'), startTime: '8:00 AM',
      venue: NYAHURURU, theme, officiantId: bishopRecord.id,
    },
  });

  // `position` is written out rather than implied: a liturgy is an ordered list, and "which item is
  // third" must not depend on insertion order or row ids.
  //
  // The rows are the church's own published Sunday running order, element for element, and they add
  // up to the **320 minutes** the Service Planner prints as its total. These are the same six
  // elements and the same durations the console's `SUNDAY_ORDER` carries, so a planner opened
  // against the API and the one drawn from the console's own data agree about the shape of a Sunday.
  await prisma.orderOfServiceItem.createMany({
    data: [
      { serviceId: nextSunday.id, position: 1, title: 'First Service', kind: 'call_to_worship', durationMinutes: 120, responsible: 'Bishop Sammy', notes: '8:00 AM – 10:00 AM' },
      { serviceId: nextSunday.id, position: 2, title: 'Praise & Worship', kind: 'praise_worship', durationMinutes: 60, responsible: 'Caleb Mwangi', notes: '10:00 AM – 11:00 AM', ministryId: department('Worship & Word Ministry') },
      { serviceId: nextSunday.id, position: 3, title: 'Presentation / Visitors', kind: 'presentation', durationMinutes: 30, responsible: 'Marcus Kamau', notes: '11:00 AM – 11:30 AM' },
      { serviceId: nextSunday.id, position: 4, title: 'Sermon / Word Ministry', kind: 'sermon', durationMinutes: 75, responsible: 'Bishop Sammy', notes: '11:30 AM – 12:45 PM' },
      { serviceId: nextSunday.id, position: 5, title: 'Congregation Dismissed', kind: 'dismissal', durationMinutes: 5, responsible: 'Bishop Sammy', notes: '12:50 PM' },
      { serviceId: nextSunday.id, position: 6, title: 'Groups Meetings & Fellowship', kind: 'other', durationMinutes: 30, responsible: 'Rev. Alice', notes: '1:30 PM – 2:00 PM' },
    ],
  });

  const [, , welcomeDuty] = await Promise.all([
    prisma.rosterDuty.create({ data: { serviceId: nextSunday.id, memberId: aliceRecord.id, roleTitle: 'Service Leader', ministryId: department('Visionary Leadership & Church Council'), status: 'confirmed' } }),
    prisma.rosterDuty.create({ data: { serviceId: nextSunday.id, memberId: caleb.id, roleTitle: 'Worship Leader', ministryId: department('Worship & Word Ministry'), status: 'confirmed' } }),
    prisma.rosterDuty.create({ data: { serviceId: nextSunday.id, memberId: daniel.id, roleTitle: 'Welcome & Ushering Lead', status: 'scheduled' } }),
    prisma.rosterDuty.create({ data: { serviceId: nextSunday.id, memberId: mary.id, roleTitle: "Children's Church Teacher", ministryId: department('Next Generation & Children'), status: 'scheduled' } }),
  ]);

  // Daniel is away that weekend and has asked for cover. Nobody is named yet, so the request sits
  // open for an administrator to decide.
  await prisma.swapRequest.create({
    data: { dutyId: welcomeDuty.id, requestedById: daniel.id, status: 'requested', reason: 'Travelling to Nakuru that weekend' },
  });

  // -------------------------------------------------------------------------------------------
  // A project and a welfare case, so both screens have something real
  // -------------------------------------------------------------------------------------------
  const project = await prisma.project.create({
    data: { name: 'Sanctuary Expansion', description: 'Additional seating and a larger sound booth.', targetAmount: '1500000.00', status: 'active', startsAt: new Date('2025-01-12T00:00:00+03:00') },
  });
  // One cash gift, one larger one that has cleared, and one pledge that has not — so the funding
  // screen's "in escrow" and "signed" bars are both non-zero, which is the state that actually
  // exercises the progress maths.
  await prisma.projectContribution.createMany({
    data: [
      { txCode: 'PC-2025-0001', projectId: project.id, memberId: bishopRecord.id, donorName: 'Bishop Sammy', amount: '150000.00', method: 'bank_transfer', kind: 'cash', reference: 'KCB/8842', contributedAt: new Date('2025-01-12T11:00:00+03:00') },
      { txCode: 'PC-2025-0002', projectId: project.id, memberId: daniel.id, donorName: 'Daniel Kiptoo', amount: '370200.00', method: 'mpesa', kind: 'cash', reference: 'QGH7X2M9PL', contributedAt: new Date('2025-02-02T10:15:00+03:00') },
      { txCode: 'PC-2025-0003', projectId: project.id, memberId: aliceRecord.id, donorName: 'Rev. Alice', amount: '117300.00', method: 'bank_transfer', kind: 'pledge', reference: 'PLEDGE/2025', contributedAt: new Date('2025-02-05T16:40:00+03:00') },
    ],
  });

  await prisma.welfareDisbursement.create({
    data: {
      caseCode: 'WF-2025-0001', memberId: mary.id, beneficiaryName: 'Mary Wanjiku', amount: '12000.00',
      purpose: 'Hospital bill support for a family member in treatment at Nyahururu Level 4', category: 'medical',
      status: 'approved', assignedToId: aliceRecord.id, approvedById: bishop.id,
      requestedAt: new Date('2025-02-01T08:30:00+03:00'),
    },
  });

  await prisma.welfareDisbursement.create({
    data: {
      caseCode: 'WF-2025-0002', memberId: daniel.id, beneficiaryName: 'The Kiptoo Household', amount: '8500.00',
      purpose: 'School fees top-up for two children joining Form One', category: 'education',
      status: 'disbursed', assignedToId: daniel.id, approvedById: bishop.id,
      requestedAt: new Date('2025-01-20T09:00:00+03:00'), disbursedAt: new Date('2025-02-04T11:00:00+03:00'),
    },
  });

  // -------------------------------------------------------------------------------------------
  // Charity: what was given away, and to whom it was paid
  // -------------------------------------------------------------------------------------------
  await prisma.charityActivity.createMany({
    data: [
      { code: 'CH-2025-0001', item: 'Fresh produce pallets (3 tons)', initiative: 'Community Food Drive', vendor: 'Valley Harvest Co-Op', amount: '184000.00', occurredAt: new Date('2025-02-06T10:00:00+03:00'), status: 'verified', ledById: bishop.id },
      { code: 'CH-2025-0002', item: 'Solar submersible well pump and rig', initiative: 'Kenya Water Borehole Project', vendor: 'Nairobi Water Works Ltd', amount: '320000.00', occurredAt: new Date('2025-02-03T09:30:00+03:00'), status: 'verified', ledById: bishop.id },
      { code: 'CH-2025-0003', item: 'Blood glucose testing strips and cuffs', initiative: 'Free Medical Screening Clinic', vendor: 'MedSupply Kenya Ltd', amount: '95000.00', occurredAt: new Date('2025-01-30T08:00:00+03:00'), status: 'recorded', ledById: bishop.id },
    ],
  });

  // Every money row written above gets its ledger line, inside one transaction, so the chain
  // verifies from the first run instead of the fixture data looking unaccounted for. Real traffic
  // appends its own entry in the same transaction as the change it records.
  await prisma.$transaction(async (tx) => {
    for (const tithe of await tx.tithe.findMany({ orderBy: { txCode: 'asc' } })) {
      await appendFinanceEntry(tx, {
        action: 'recorded', entityName: 'Tithe', entityId: tithe.id, actorId: bishop.id, amount: tithe.amount,
        summary: `${tithe.txCode}: ${tithe.donorName} gave KSh ${money(tithe.amount)} (${tithe.category}, ${tithe.method})`,
      });
    }
    for (const offering of await tx.offering.findMany({ orderBy: { txCode: 'asc' } })) {
      await appendFinanceEntry(tx, {
        action: 'recorded', entityName: 'Offering', entityId: offering.id, actorId: bishop.id, amount: offering.amount,
        summary: `${offering.txCode}: KSh ${money(offering.amount)} collected (${offering.category}, ${offering.method})`,
      });
    }
    for (const contribution of await tx.projectContribution.findMany({ orderBy: { txCode: 'asc' } })) {
      await appendFinanceEntry(tx, {
        action: 'recorded', entityName: 'ProjectContribution', entityId: contribution.id, actorId: bishop.id, amount: contribution.amount,
        summary: `${contribution.txCode}: ${contribution.donorName} ${contribution.kind === 'pledge' ? 'pledged' : 'gave'} KSh ${money(contribution.amount)} to ${project.name}`,
      });
    }
    for (const activity of await tx.charityActivity.findMany({ orderBy: { code: 'asc' } })) {
      await appendFinanceEntry(tx, {
        action: 'recorded', entityName: 'CharityActivity', entityId: activity.id, actorId: bishop.id, amount: activity.amount,
        summary: `${activity.code}: KSh ${money(activity.amount)} - ${activity.item} for ${activity.initiative}`,
      });
    }
    for (const welfareCase of await tx.welfareDisbursement.findMany({ orderBy: { caseCode: 'asc' } })) {
      await appendFinanceEntry(tx, {
        action: 'recorded', entityName: 'WelfareDisbursement', entityId: welfareCase.id, actorId: bishop.id, amount: welfareCase.amount,
        summary: `${welfareCase.caseCode}: KSh ${money(welfareCase.amount)} for ${welfareCase.beneficiaryName} (${welfareCase.category})`,
      });
      if (welfareCase.status === 'approved' || welfareCase.status === 'disbursed') {
        await appendFinanceEntry(tx, {
          action: 'approved', entityName: 'WelfareDisbursement', entityId: welfareCase.id, actorId: bishop.id, amount: welfareCase.amount,
          summary: `${welfareCase.caseCode}: approved - KSh ${money(welfareCase.amount)} for ${welfareCase.beneficiaryName}`,
        });
      }
      if (welfareCase.status === 'disbursed') {
        await appendFinanceEntry(tx, {
          action: 'disbursed', entityName: 'WelfareDisbursement', entityId: welfareCase.id, actorId: bishop.id, amount: welfareCase.amount,
          summary: `${welfareCase.caseCode}: KSh ${money(welfareCase.amount)} paid out to ${welfareCase.beneficiaryName}`,
        });
      }
    }
  });

  // -------------------------------------------------------------------------------------------
  // Communications and the calendar
  // -------------------------------------------------------------------------------------------
  // The notices the office would actually have posted, newest first. Titles and authors are the ones
  // the console's own noticeboard carries, so the two halves read as one church's week.
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Annual General Conference \u2014 Registration Now Open',
        body: 'Registration for the Annual General Conference is open at the office desk. Delegates from the outstations should register through their group leader so travel can be arranged together.',
        audience: 'Everyone', authorId: bishop.id, isPinned: true, priority: 'urgent',
        publishedAt: new Date('2025-02-08T09:00:00+03:00'),
      },
      {
        title: 'Community Food Drive & Mercy Parcel Packing Day',
        body: 'Packing day for the mercy parcels is on Saturday at the fellowship hall. Bring the family; the children can help sort the dry goods.',
        audience: 'Everyone', authorId: alice.id, isPinned: true,
        publishedAt: new Date('2025-02-06T14:30:00+03:00'),
      },
      {
        title: 'Choir & Orchestra Rehearsal Schedule Resumes',
        body: 'Rehearsals resume on Saturday at 4:00 PM. The praise set for Sunday is the one from the conference songbook.',
        audience: 'Ministry Leaders', authorId: bishop.id,
        publishedAt: new Date('2025-02-03T08:15:00+03:00'),
      },
      // A notice the office has written ahead of the date it goes up, and one already taken down: the
      // console's three states, so a new church sees what they look like rather than an empty column.
      {
        title: 'Harvest Thanksgiving \u2014 Service Times Move Forward',
        body: 'From the first Sunday of March the morning service begins at 8:00 AM and the second at 10:30 AM, so the thanksgiving procession has room.',
        audience: 'Everyone', authorId: alice.id, priority: 'urgent',
        publishedAt: new Date('2025-03-01T06:00:00+03:00'),
      },
      {
        title: 'Baptismal Class Registration Closed',
        body: 'Registration for the February baptismal class is now closed. The next intake is announced in April.',
        audience: 'Everyone', authorId: bishop.id,
        publishedAt: new Date('2025-01-20T09:00:00+03:00'),
        expiresAt: new Date('2025-02-01T00:00:00+03:00'),
      },
    ],
  });

  // One message delivered and one still being composed. The composer is the point: a broadcast is
  // written, reviewed and *then* sent, and the console's send button refuses to pretend otherwise
  // while no SMS provider is configured.
  await prisma.broadcast.createMany({
    data: [
      {
        channel: 'sms', body: 'Destiny Sanctuary: Sunday service begins 8:00 AM. All are welcome.',
        audience: 'Members', status: 'sent', sentAt: new Date('2025-02-08T18:00:00+03:00'),
        recipients: 412, createdById: bishop.id,
        // The provider's own account of the send, which is what the console shows. The eight numbers
        // that bounced are kept as shortages, not quietly rounded away.
        lastReport: {
          attempted: 412, delivered: 404, failed: 8,
          failures: [
            { recipient: '+2547\u2022\u2022\u2022\u2022281', reason: 'Number not reachable' },
            { recipient: '+2547\u2022\u2022\u2022\u2022904', reason: 'Number not reachable' },
          ],
        },
      },
      {
        channel: 'sms',
        body: 'Destiny Sanctuary: the Annual General Conference runs 16\u201319 April. Register at the office before 31 March.',
        audience: 'Members', status: 'draft', createdById: alice.id,
      },
      {
        channel: 'sms',
        body: 'Destiny Sanctuary: the women\u2019s fellowship meets this Saturday at 3:00 PM in the fellowship hall.',
        audience: 'Women\u2019s Fellowship', status: 'scheduled',
        scheduledFor: new Date('2025-02-14T17:00:00+03:00'), createdById: alice.id,
      },
    ],
  });

  // The four conferences the church publishes, plus the dedication Sunday after the clock day. Their
  // titles, dates and the venue label are theirs; the console's calendar carries the same four. A
  // conference that runs across several days carries its last day in `endsAt`, because an event with
  // a single timestamp silently reads as a one-day affair.
  const conferenceVenue = "Destiny Sanctuary Int'L Nyahururu";
  await prisma.event.createMany({
    data: [
      {
        title: 'Family Dedication Sunday', kind: 'service', venue: NYAHURURU,
        organizerId: person('MBR-1001'), startsAt: new Date('2025-02-23T09:00:00+03:00'),
        endsAt: new Date('2025-02-23T12:00:00+03:00'),
        description: 'Families present their children before the congregation and commit to raising them in the Lord.',
      },
      {
        title: 'Annual General Conference', kind: 'conference', venue: conferenceVenue,
        organizerId: person('MBR-1001'),
        startsAt: new Date('2025-04-16T08:00:00+03:00'), endsAt: new Date('2025-04-19T17:30:00+03:00'),
        description: 'A powerful gathering of believers for spiritual renewal, prophetic teachings and community fellowship \u2014 uplifting sessions, impactful worship and transformative discussions designed to inspire and equip you for the year ahead.',
      },
      {
        title: 'National Women\u2019s Conference', kind: 'conference', venue: conferenceVenue,
        organizerId: person('MBR-1010'),
        startsAt: new Date('2025-08-15T18:00:00+03:00'), endsAt: new Date('2025-08-19T20:30:00+03:00'),
        description: 'A time for women from all walks of life to come together in unity, empowerment and spiritual growth \u2014 with anointed speakers, dynamic workshops and powerful worship.',
      },
      {
        // Called off, and left on the calendar saying so: the people who had already been told the
        // date need to see that it moved rather than find it missing.
        title: 'Outreach Medical Camp', kind: 'outreach', venue: 'Nyahururu Town Hall',
        organizerId: person('MBR-1016'), status: 'cancelled',
        startsAt: new Date('2025-10-04T08:00:00+03:00'), endsAt: new Date('2025-10-04T16:00:00+03:00'),
        description: 'Postponed to the new year \u2014 the county health team could not release the nurses for the day.',
      },
      {
        title: 'Thanksgiving Service', kind: 'service', venue: conferenceVenue,
        organizerId: person('MBR-1001'),
        startsAt: new Date('2025-11-24T08:00:00+03:00'), endsAt: new Date('2025-11-24T18:30:00+03:00'),
        description: 'A time to reflect on the blessings of the year, offer heartfelt thanks, and experience a powerful time of worship, prayer and fellowship as we honour God for His goodness.',
      },
      {
        title: 'National Youth Conference', kind: 'conference', venue: conferenceVenue,
        organizerId: person('MBR-1004'),
        startsAt: new Date('2025-12-16T07:00:00+03:00'), endsAt: new Date('2025-12-19T20:30:00+03:00'),
        description: 'An exciting event designed for young people to experience spiritual growth, build lasting friendships and engage in vibrant discussions on faith, purpose and leadership.',
      },
    ],
  });
  // Every state the prayer wall shows, so a pastor opening it sees a list rather than a category:
  // one still open, two being prayed for, and one already answered.
  await prisma.prayerRequest.createMany({
    data: [
      { memberId: mary.id, requesterName: 'Mary Wanjiku', request: 'Healing for a family member in hospital.', status: 'praying' },
      { requesterName: 'A visitor', request: 'Guidance on a new job.', status: 'open', isPrivate: true },
      { memberId: person('MBR-1010'), requesterName: 'Esther Muthoni', request: 'Journey mercies for the family travelling to Nakuru this week.', status: 'praying' },
      { memberId: person('MBR-1016'), requesterName: 'Ruth Adhiambo', request: 'Thanksgiving for a place in the nursing course she applied for.', status: 'answered' },
      {
        requesterName: 'A family in the fellowship', request: 'Reconciliation between two brothers over their father\u2019s estate.',
        status: 'archived', isPrivate: true,
      },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // Governance: the Session's sittings, the resolutions they carried, and the bylaws in force
  // -------------------------------------------------------------------------------------------
  const statedConclave = await prisma.meeting.create({
    data: {
      title: 'Q1 Stated Council Conclave #2025-03', kind: 'stated', status: 'held',
      heldAt: new Date('2025-02-06T19:00:00+03:00'), venue: 'Nyahururu Main Church - Council Chamber',
      chairId: bishopRecord.id, secretaryId: aliceRecord.id,
      attendees: sittingAttendance, quorumRequired: sittingQuorum,
      quorumMet: quorumMet(sittingAttendance, sittingQuorum),
      agenda: [
        'Opening devotion and roll call',
        'Minutes of the previous stated conclave',
        'Sanctuary HVAC and acoustic contract',
        '2025 general operating budget',
        'Youth ministry transport',
        'Any other business',
      ],
      minutes:
        `The Moderator opened in prayer at 7:05 PM. ${sittingAttendance} of the church's ${officerRoll} officers were present, against a quorum of ${sittingQuorum}, so the sitting was quorate. The HVAC contract was awarded and referred to the trustees for implementation. The 2025 operating budget was carried with one abstention. The bus grant was held over for the fourteen-day elder review.`,
      // Sealed a few days later, the way the clerk would have filed it.
      minutesFinalizedAt: new Date('2025-02-10T09:30:00+03:00'),
      minutesFinalizedById: bishop.id,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Ordinary Council Conclave', kind: 'stated', status: 'scheduled',
      heldAt: new Date('2025-02-27T19:00:00+03:00'), venue: 'Nyahururu Main Church - Council Chamber',
      chairId: bishopRecord.id, secretaryId: aliceRecord.id,
      // Still to come, so it carries the figure it needs and no register to judge it against.
      quorumRequired: sittingQuorum,
      agenda: ['Roll call', 'Youth ministry bus fleet replacement grant', 'Annex and outreach reports', 'Closing prayer'],
    },
  });

  // Held, minuted, not yet sealed: the state that shows what sealing a minute does.
  await prisma.meeting.create({
    data: {
      title: 'Executive Committee Session', kind: 'executive', status: 'held',
      heldAt: new Date('2025-02-20T18:30:00+03:00'), venue: 'Nyahururu Main Church - Annex Boardroom',
      chairId: bishopRecord.id, secretaryId: aliceRecord.id,
      attendees: sittingAttendance - 1, quorumRequired: sittingQuorum,
      quorumMet: quorumMet(sittingAttendance - 1, sittingQuorum),
      agenda: ['Devotion', 'Annex roof repairs', 'Outstation transport'],
      minutes:
        'The committee met after devotion. The annex roof repair was costed and left with the trustees for a second quotation; transport for the Ndaragwa outstation was approved within the existing vote.',
    },
  });

  await prisma.resolution.createMany({
    data: [
      {
        code: 'RES-2025-042', title: 'Sanctuary HVAC & Acoustic Tech Contract',
        summary: 'Award the sanctuary climate and acoustic contract and refer implementation to the trustees.',
        sponsor: 'Trustee Board', sponsorOfficer: 'Arthur Wanjala', meetingId: statedConclave.id,
        councilDate: new Date('2025-02-06T19:00:00+03:00'), stage: 'implementing',
        voteSummary: `${sittingAttendance} Yea - 0 Nay`, votesFor: sittingAttendance, votesAgainst: 0, votesAbstain: 0,
        lead: 'Elder Marcus Kamau', leadNote: '2 of 4 milestones; due Dec 31, 2025', decidedAt: new Date('2025-02-06T20:10:00+03:00'),
      },
      {
        code: 'RES-2025-043', title: '2025 General Church Operating Budget',
        summary: 'Adopt the 2025 operating budget as presented by the Finance Committee.',
        sponsor: 'Finance Committee', sponsorOfficer: 'Clara Wambui', meetingId: statedConclave.id,
        councilDate: new Date('2025-02-06T19:00:00+03:00'), stage: 'voted_approved',
        voteSummary: `${sittingAttendance - 1} Yea - 1 Abstain`, votesFor: sittingAttendance - 1, votesAgainst: 0, votesAbstain: 1,
        lead: 'Bishop Sammy', leadNote: 'Awaiting Council enactment', decidedAt: new Date('2025-02-06T20:25:00+03:00'),
      },
      {
        code: 'RES-2025-045', title: 'Youth Ministry Bus Fleet Replacement Grant',
        summary: 'A grant toward replacing the youth ministry fleet, held over for the fourteen-day elder review.',
        sponsor: 'Destiny Youth', sponsorOfficer: 'Bishop Sammy',
        councilDate: new Date('2025-02-13T19:00:00+03:00'), stage: 'proposed',
        voteSummary: 'Pending Feb 27', lead: 'Bishop Sammy', leadNote: 'Conclave target Feb 27, 2025',
      },
      {
        code: 'RES-2025-039', title: 'Benevolence Fund Operating Cap to KSh 50,000',
        summary: 'Raise the operating cap on the benevolence fund to fifty thousand shillings.',
        sponsor: 'Missions, Mercy & Church Planting', sponsorOfficer: 'Clara Wambui',
        councilDate: new Date('2025-01-15T19:00:00+03:00'), stage: 'closed',
        voteSummary: `${officerRoll} Yea - 0 Nay`, votesFor: officerRoll, votesAgainst: 0, votesAbstain: 0,
        lead: 'Clara Wambui', leadNote: 'Fully audited, completed Jan 30, 2025', decidedAt: new Date('2025-01-15T20:00:00+03:00'),
      },
    ],
  });

  await prisma.governanceDocument.createMany({
    data: [
      { title: 'Destiny Sanctuary Constitution & By-laws', kind: 'constitution', reference: 'GC-CONST-001', version: '3.0', adoptedAt: new Date('2019-03-10T00:00:00+03:00'), body: 'The constitution of the church, as adopted by the congregational meeting.' },
      { title: 'Financial Management Policy', kind: 'policy', reference: 'GC-FIN-004', version: '2.1', adoptedAt: new Date('2023-01-15T00:00:00+03:00'), body: 'Collection, banking, approval thresholds and the audit trail required of every record.' },
      { title: 'Staff & Volunteer Conduct Policy', kind: 'policy', reference: 'GC-HR-002', version: '1.4', adoptedAt: new Date('2022-08-01T00:00:00+03:00'), body: 'Expectations of office holders, employees and rostered volunteers.' },
      { title: 'Child Protection Policy', kind: 'policy', reference: 'GC-CPP-001', version: '2.0', adoptedAt: new Date('2024-05-19T00:00:00+03:00'), body: 'Safeguarding requirements for the children and teen ministries.' },
      { title: 'Minutes of the Q1 Stated Conclave', kind: 'minutes', reference: 'GC-MIN-2025-03', version: '1.0', adoptedAt: new Date('2025-02-06T00:00:00+03:00'), body: 'Signed minutes of the sitting held on 6 February 2025.' },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // The three preference documents the Settings screens edit
  // -------------------------------------------------------------------------------------------
  await prisma.appSetting.createMany({
    data: [
      {
        key: 'notifications', description: 'Which office alerts are sent, and how often.', updatedById: bishop.id,
        value: { emailAlerts: true, smsAlerts: true, prayerDigest: 'weekly', welfareAlerts: true, givingReceipts: true },
      },
      {
        key: 'integrations', description: 'The gateways the office has connected.', updatedById: bishop.id,
        value: { smsGateway: "Africa's Talking", payments: 'M-Pesa (Daraja)', accounting: 'None', email: 'SMTP' },
      },
      {
        key: 'customization', description: 'How the console reads and how it looks.', updatedById: bishop.id,
        value: { currency: 'KES', locale: 'en-KE', timezone: 'Africa/Nairobi', weekStartsOn: 'sunday', density: 'spacious' },
      },
    ],
  });

  await prisma.auditLog.create({
    data: { actorId: bishop.id, action: 'create', entityName: 'Member', entityId: bishopRecord.id, summary: 'Seeded the parish register' },
  });

  // -------------------------------------------------------------------------------------------
  // The certificate register: what the church has officially issued
  // -------------------------------------------------------------------------------------------
  // Two ceremonies the register actually holds, recorded the way issuance would have happened —
  // wording as celebrated, serial from the church's year series, issued by the moderator.
  await prisma.certificate.createMany({
    data: [
      {
        organizationId: organization.id,
        serial: 'BAP-2025-0001',
        kind: 'baptism',
        fullName: 'Caleb Timothy Mwangi',
        memberId: caleb.id,
        memberNumber: 'MBR-1003',
        ceremonyDate: new Date('2025-06-15T11:00:00+03:00'),
        officiant: 'Bishop Sammy',
        scripture: 'Romans 6:4',
        issuedById: bishop.id,
        issuedAt: new Date('2025-06-15T15:00:00+03:00'),
      },
      {
        organizationId: organization.id,
        serial: 'DED-2025-0001',
        kind: 'dedication',
        fullName: 'Joy Wanjiru Kariuki',
        memberId: mary.id,
        memberNumber: 'MBR-1004',
        parents: 'Mr & Mrs Kariuki',
        ceremonyDate: new Date('2025-08-03T10:30:00+03:00'),
        officiant: 'Rev. Alice',
        issuedById: bishop.id,
        issuedAt: new Date('2025-08-03T14:00:00+03:00'),
      },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // Inventory and assets: what the church owns, and how the shelf got that way
  // -------------------------------------------------------------------------------------------
  // Two suppliers, six register lines spanning both kinds, and a ledger that shows the life a
  // register has: bought, issued to a ministry, counted, and corrected by an approved take. Every
  // movement names its actor so the "who authorized this" question the register exists to answer has
  // an answer from line one.
  const [soundHouse, harvestBookshop] = await Promise.all([
    prisma.supplier.create({
      data: {
        organizationId: organization.id,
        name: 'Sound House Kenya',
        phone: '+254 722 118 404',
        email: 'sales@soundhouse.co.ke',
        notes: 'PA systems, microphones and cabling. Delivers to Nyahururu on Thursdays.',
      },
    }),
    prisma.supplier.create({
      data: {
        organizationId: organization.id,
        name: 'Harvest Bookshop Nakuru',
        phone: '+254 51 221 7703',
        email: 'orders@harvestbooks.co.ke',
        notes: 'Bookshop lines: Bibles, hymnals and Sunday school materials.',
      },
    }),
  ]);

  const item = async (data: {
    sku: string;
    name: string;
    kind: 'consumable' | 'asset';
    category: string;
    unit: string;
    location: string;
    quantity: number;
    reorderAt?: number;
    cost?: string;
    condition?: 'good' | 'fair' | 'poor';
    status?: 'active' | 'in_service' | 'maintenance' | 'lost' | 'damaged' | 'disposed';
    supplierId?: string;
    purchasedAt?: Date;
    custodianId?: string;
    openingQuantity: number;
  }) => {
    const { openingQuantity, ...fields } = data;
    const row = await prisma.inventoryItem.create({
      data: { ...fields, organizationId: organization.id, quantity: openingQuantity },
    });
    await prisma.stockMovement.create({
      data: {
        organizationId: organization.id,
        itemId: row.id,
        kind: 'adjustment',
        delta: openingQuantity,
        balanceAfter: openingQuantity,
        note: 'Opening count when the item joined the register',
        actorId: alice.id,
        occurredAt: new Date('2026-08-02T09:00:00+03:00'),
      },
    });
    return row;
  };

  const yamahaMixer = await item({
    sku: 'AST-0001',
    name: 'Yamaha MG16XU Mixing Desk',
    kind: 'asset',
    category: 'Sound & Media',
    unit: 'pcs',
    location: NYAHURURU,
    quantity: 1,
    cost: '82000.00',
    condition: 'good',
    status: 'in_service',
    supplierId: soundHouse.id,
    purchasedAt: new Date('2025-03-14T10:00:00+03:00'),
    custodianId: bishopRecord.id,
    openingQuantity: 1,
  });
  const shureMic = await item({
    sku: 'AST-0002',
    name: 'Shure SM58 Microphone',
    kind: 'asset',
    category: 'Sound & Media',
    unit: 'pcs',
    location: NYAHURURU,
    quantity: 4,
    cost: '13500.00',
    condition: 'good',
    supplierId: soundHouse.id,
    purchasedAt: new Date('2025-03-14T10:00:00+03:00'),
    openingQuantity: 5,
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: organization.id,
      itemId: shureMic.id,
      kind: 'loss',
      delta: -1,
      balanceAfter: 4,
      note: 'Not returned after the outdoor crusade — written off by council minute RES-2026-0011',
      actorId: bishop.id,
      occurredAt: new Date('2026-07-19T18:30:00+03:00'),
    },
  });
  await item({
    sku: 'AST-0003',
    name: 'Epson EB-X500 Projector',
    kind: 'asset',
    category: 'Sound & Media',
    unit: 'pcs',
    location: ANNEX,
    quantity: 1,
    cost: '58000.00',
    condition: 'fair',
    status: 'maintenance',
    supplierId: soundHouse.id,
    purchasedAt: new Date('2024-11-08T10:00:00+03:00'),
    openingQuantity: 1,
  });
  const bibles = await item({
    sku: 'BKS-0001',
    name: 'NIV Bible (hardcover)',
    kind: 'consumable',
    category: 'Bookshop',
    unit: 'pcs',
    location: NYAHURURU,
    quantity: 22,
    reorderAt: 10,
    cost: '1450.00',
    supplierId: harvestBookshop.id,
    purchasedAt: new Date('2026-06-30T10:00:00+03:00'),
    openingQuantity: 30,
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: organization.id,
      itemId: bibles.id,
      kind: 'issue',
      delta: -8,
      balanceAfter: 22,
      note: 'Sold at the bookstall after the youth service',
      actorId: alice.id,
      occurredAt: new Date('2026-08-16T12:30:00+03:00'),
    },
  });
  const hymnals = await item({
    sku: 'BKS-0002',
    name: 'Nyimbo Standard Hymnal',
    kind: 'consumable',
    category: 'Bookshop',
    unit: 'pcs',
    location: NYAHURURU,
    quantity: 6,
    reorderAt: 12,
    cost: '900.00',
    supplierId: harvestBookshop.id,
    openingQuantity: 18,
  });
  await prisma.stockMovement.createMany({
    data: [
      {
        organizationId: organization.id,
        itemId: hymnals.id,
        kind: 'issue',
        delta: -10,
        balanceAfter: 8,
        note: 'Distributed to the new converts\' class',
        actorId: alice.id,
        occurredAt: new Date('2026-08-09T11:00:00+03:00'),
      },
      {
        organizationId: organization.id,
        itemId: hymnals.id,
        kind: 'return',
        delta: 8,
        balanceAfter: 16,
        note: 'Class ended — copies brought back to the cupboard',
        actorId: alice.id,
        occurredAt: new Date('2026-09-06T13:00:00+03:00'),
      },
    ],
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: organization.id,
      itemId: hymnals.id,
      kind: 'issue',
      delta: -10,
      balanceAfter: 6,
      note: 'Choir copies for Friday rehearsal season',
      actorId: bishop.id,
      occurredAt: new Date('2026-09-10T17:00:00+03:00'),
    },
  });
  const teaSupplies = await item({
    sku: 'KIT-0001',
    name: 'Tea Supplies Crate (sugar, leaves, milk powder)',
    kind: 'consumable',
    category: 'Kitchen',
    unit: 'crate',
    location: ANNEX,
    quantity: 3,
    reorderAt: 2,
    cost: '4200.00',
    openingQuantity: 5,
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: organization.id,
      itemId: teaSupplies.id,
      kind: 'issue',
      delta: -2,
      balanceAfter: 3,
      note: 'Fellowship tea after the combined service',
      actorId: alice.id,
      occurredAt: new Date('2026-09-13T12:00:00+03:00'),
    },
  });

  // One approved stock take with a variance, so the review workflow and the report's variance list
  // both have a real example: counted 5 against 6 on the books, approved, one hymnal written off.
  const septemberTake = await prisma.stockTake.create({
    data: {
      organizationId: organization.id,
      itemId: hymnals.id,
      status: 'approved',
      bookQuantity: 6,
      countedQuantity: 5,
      variance: -1,
      countedById: alice.id,
      approvedById: bishop.id,
      approvedAt: new Date('2026-09-13T14:00:00+03:00'),
      note: 'September shelf count — one copy found with a torn spine',
      createdAt: new Date('2026-09-13T13:30:00+03:00'),
    },
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: organization.id,
      itemId: hymnals.id,
      kind: 'adjustment',
      delta: -1,
      balanceAfter: 5,
      reference: `stock-take:${septemberTake.id}`,
      note: 'Stock take approved: counted 5 against 6 on the books',
      actorId: bishop.id,
      occurredAt: new Date('2026-09-13T14:00:00+03:00'),
    },
  });

  // A purchase, priced the way the lines price it: the total is computed from them, never typed in.
  await prisma.purchase.create({
    data: {
      organizationId: organization.id,
      supplierId: harvestBookshop.id,
      reference: 'INV-2026-0731',
      total: new Prisma.Decimal('21750.00'),
      purchasedAt: new Date('2026-06-30T10:00:00+03:00'),
      recordedById: alice.id,
      lines: {
        create: [{ itemId: bibles.id, quantity: 15, unitCost: new Prisma.Decimal('1450.00') }],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: alice.id,
      action: 'create',
      entityName: 'InventoryItem',
      entityId: yamahaMixer.id,
      summary: 'Seeded the asset & stock register (6 lines, 2 suppliers)',
    },
  });

  // -------------------------------------------------------------------------------------------
  // The commercial layer: the plans, and the parish's own standing with Praxis
  // -------------------------------------------------------------------------------------------
  // Plans are platform rows, so they are ensured rather than cleared; the church's subscription is
  // this church's row, so it was deleted with the rest of the domain and is written fresh here.
  const planIds = await seedPlans();
  const subscribedAt = new Date();
  const periodEnd = new Date(subscribedAt);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planId: planIds['sanctuary'] as string,
      status: 'active',
      currentPeriodStart: subscribedAt,
      currentPeriodEnd: periodEnd,
    },
  });

  // The money behind the period, recorded the way the office would record it: a bank transfer, with
  // the reference a treasurer can look up. Development and vendor screens read this row rather than
  // computing a period out of thin air.
  await prisma.subscriptionPayment.create({
    data: {
      organizationId: organization.id,
      subscriptionId: subscription.id,
      amount: new Prisma.Decimal('7500'),
      method: 'bank_transfer',
      reference: 'PRAXIS-2026-0001',
      periodStart: subscribedAt,
      periodEnd,
      note: 'Annual subscription, paid by bank transfer',
      recordedById: bishop.id,
    },
  });

  // A summary worth reading, because it is also what a provisioning check asserts on. "Seeded 5
  // members" on a database that is meant to hold a congregation is exactly the shape of failure this
  // line exists to expose, so it prints the whole fixture rather than a token of it.
  const counts = {
    members: await prisma.member.count(),
    households: await prisma.household.count(),
    ministries: await prisma.ministry.count(),
    services: await prisma.service.count(),
    attendance: await prisma.attendance.count(),
    tithes: await prisma.tithe.count(),
    offerings: await prisma.offering.count(),
    ledgerEntries: await prisma.financeAuditEntry.count(),
    meetings: await prisma.meeting.count(),
    resolutions: await prisma.resolution.count(),
    documents: await prisma.governanceDocument.count(),
  };
  console.log(
    `Seeded ${counts.members} members, ${counts.households} households, ${counts.ministries} departments, ` +
      `${counts.services} services, ${counts.attendance} attendance rows, ${counts.tithes} tithes, ` +
      `${counts.offerings} offerings, ${counts.ledgerEntries} ledger entries, ${counts.meetings} meetings, ` +
      `${counts.resolutions} resolutions and ${counts.documents} documents.`,
  );
  console.log(
    `Plans: ${Object.keys(planIds).length} on the platform; ${organization.name} is on Sanctuary, paid to ` +
      `${periodEnd.toDateString()}.`,
  );
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
