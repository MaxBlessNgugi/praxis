import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { money } from '../src/lib/prisma';
import { appendFinanceEntry } from '../src/lib/financeAudit';

/**
 * Loads the church this system was built for: Destiny Sanctuary Int'L, Nyahururu.
 *
 * The seed is destructive by design — it clears the domain tables and writes a known state — so it
 * is safe to run repeatedly and always lands on the same numbers. It is a development and
 * demonstration fixture, not something to point at a live parish database.
 *
 * Column names follow the schema; where the console and the schema disagree the schema wins, because
 * the API is what other clients will read.
 */
const prisma = new PrismaClient();

const NYAHURURU = 'Nyahururu Main Church';

async function clearDomain(): Promise<void> {
  // Children before parents: the foreign keys are the reason for this order, not taste.
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
  await prisma.prayerRequest.deleteMany();
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
  await prisma.auditLog.deleteMany();
  await prisma.softDeletedRecord.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationProfile.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

async function main(): Promise<void> {
  await clearDomain();

  // -------------------------------------------------------------------------------------------
  // The profile screen, verbatim from the church
  // -------------------------------------------------------------------------------------------
  await prisma.organizationProfile.create({
    data: {
      name: "Destiny Sanctuary Int'L",
      tagline: 'A Sanctuary of Destiny, A House of Purpose',
      location: NYAHURURU,
      address: 'Nyahururu, Laikipia County, Kenya',
      phone: '+254 726 502 108',
      email: 'info@destinysanctuary.co.ke',
      website: 'http://destinysanctuary.co.ke',
      vision: "To raise a generation of believers who walk in their God-given destiny and transform society.",
      mission:
        'To win souls, disciple believers, and equip every member for service through sound teaching, prayer and fellowship.',
      coreValues: [
        'Sound Doctrine',
        'Spirit-Led Worship',
        'Holistic Discipleship',
        'Family and Fellowship',
        'Stewardship',
        'Compassion and Mercy',
        'Excellence in Service',
        'Integrity',
        'Evangelism',
        'Generational Impact',
      ],
      serviceTimes: {
        firstService: '7:00 AM',
        secondService: '9:00 AM',
        groupsMeetings: '4:00 PM',
      },
      socials: {
        facebook: 'https://facebook.com/destinysanctuary',
        youtube: 'https://youtube.com/@destinysanctuary',
      },
    },
  });

  // -------------------------------------------------------------------------------------------
  // Roles: four keys, the same ones the console's permission module resolves
  // -------------------------------------------------------------------------------------------
  // The console's `PanelKey` union, not this file's inventiveness: a right granted under a key the
  // console does not read is a right nobody has.
  const panelKeys = ['home', 'members', 'services', 'council', 'giving', 'inventory', 'groups', 'reports', 'communications', 'settings', 'admin'];
  const fullPanels = Object.fromEntries(panelKeys.map((key) => [key, true]));
  const readOnly = Object.fromEntries(panelKeys.map((key) => [key, true]));

  const [superAdmin, admin] = await Promise.all([
    prisma.role.create({ data: { key: 'super_admin', name: 'Super Administrator', panels: fullPanels, actions: { view: true, edit: true, delete: true } } }),
    prisma.role.create({ data: { key: 'admin', name: 'Administrator', panels: fullPanels, actions: { view: true, edit: true, delete: true } } }),
    prisma.role.create({ data: { key: 'staff', name: 'Church Staff', panels: readOnly, actions: { view: true, edit: true, delete: false } } }),
    prisma.role.create({ data: { key: 'viewer', name: 'Viewer', panels: { home: true, members: true, finances: true, reports: true }, actions: { view: true, edit: false, delete: false } } }),
  ]);

  // -------------------------------------------------------------------------------------------
  // Leadership, then the register around them
  // -------------------------------------------------------------------------------------------
  const bishop = await prisma.user.create({
    data: {
      name: 'Bishop Sammy',
      email: 'bishop@destinysanctuary.co.ke',
      passwordHash: await hashPassword('praxis-demo-2025'),
      roleId: superAdmin.id,
      lastLoginAt: new Date(),
    },
  });

  const alice = await prisma.user.create({
    data: {
      name: 'Rev. Alice',
      email: 'alice@destinysanctuary.co.ke',
      passwordHash: await hashPassword('praxis-demo-2025'),
      roleId: admin.id,
    },
  });

  const households = await Promise.all([
    prisma.household.create({ data: { name: 'The Mwangi Household', unitNumber: 'HH-101', location: NYAHURURU, address: 'Kenyatta Avenue, Nyahururu' } }),
    prisma.household.create({ data: { name: 'The Wanjiku Household', unitNumber: 'HH-102', location: NYAHURURU, address: 'Gichagi Road, Nyahururu' } }),
    prisma.household.create({ data: { name: 'The Kiptoo Household', unitNumber: 'HH-103', location: 'Nyahururu Outstation', address: 'Ol Kalou Road' } }),
  ]);

  const [bishopRecord, aliceRecord, caleb, mary, daniel] = await Promise.all([
    prisma.member.create({
      data: {
        memberId: 'MBR-1001', firstName: 'Sammy', lastName: 'Ngugi', initials: 'SN', phone: '+254 726 502 108',
        email: 'bishop@destinysanctuary.co.ke', location: NYAHURURU, householdId: households[0]!.id, householdRole: 'Head',
        isHouseholdHead: true, envelopeNumber: 'ENV-1001', baptismType: 'baptized', baptismOfficiant: 'Bishop Sammy',
        weddingAnniversary: new Date('2005-06-11T00:00:00+03:00'),
      },
    }),
    prisma.member.create({
      data: {
        memberId: 'MBR-1002', firstName: 'Alice', lastName: 'Njeri', initials: 'AN', phone: '+254 720 118 340',
        email: 'alice@destinysanctuary.co.ke', location: NYAHURURU, householdId: households[1]!.id, householdRole: 'Head',
        isHouseholdHead: true, envelopeNumber: 'ENV-1002', baptismType: 'baptized',
        weddingAnniversary: new Date('2009-09-05T00:00:00+03:00'),
      },
    }),
    prisma.member.create({
      data: {
        memberId: 'MBR-1003', firstName: 'Caleb', lastName: 'Mwangi', initials: 'CM', phone: '+254 733 902 771',
        email: 'caleb.mwangi@destinysanctuary.co.ke', location: NYAHURURU, householdId: households[0]!.id,
        householdRole: 'Member', envelopeNumber: 'ENV-1003', baptismType: 'baptized',
      },
    }),
    prisma.member.create({
      data: {
        memberId: 'MBR-1004', firstName: 'Mary', lastName: 'Wanjiku', initials: 'MW', phone: '+254 715 447 220',
        location: NYAHURURU, householdId: households[1]!.id, householdRole: 'Member', envelopeNumber: 'ENV-1004',
      },
    }),
    prisma.member.create({
      data: {
        memberId: 'MBR-1005', firstName: 'Daniel', lastName: 'Kiptoo', initials: 'DK', phone: '+254 701 335 908',
        location: 'Nyahururu Outstation', householdId: households[2]!.id, householdRole: 'Head', isHouseholdHead: true,
        envelopeNumber: 'ENV-1005', status: 'active',
      },
    }),
  ]);

  // The two office logins belong to people on the register. That link is what lets a volunteer
  // request cover for their own duty rather than only an administrator acting on their behalf.
  await prisma.user.update({ where: { id: bishop.id }, data: { memberId: bishopRecord.id } });
  await prisma.user.update({ where: { id: alice.id }, data: { memberId: aliceRecord.id } });

  // -------------------------------------------------------------------------------------------
  // Ministry: the seven departments the Ministries screen shows, under Bishop Sammy and Rev. Alice
  // -------------------------------------------------------------------------------------------
  const ministries = await Promise.all(
    [
      { name: 'Visionary Leadership & Church Council', description: 'The Bishop, the elders and the deacons who set direction.', leaderId: bishopRecord.id, meetingDay: 'Tuesday', location: NYAHURURU },
      { name: 'Worship & Word Ministry', description: 'Choir, instrumentalists, sound and the pulpit.', leaderId: caleb.id, meetingDay: 'Saturday', location: NYAHURURU },
      { name: "Women's Fellowship", description: 'The women of the congregation, meeting weekly.', leaderId: mary.id, meetingDay: 'Wednesday', location: NYAHURURU },
      { name: 'Destiny Youth', description: 'Teens and young adults.', leaderId: daniel.id, meetingDay: 'Saturday', location: 'Nyahururu Outstation' },
      { name: 'Next Generation & Children', description: 'Sunday school and teen discipleship.', leaderId: mary.id, meetingDay: 'Sunday', location: NYAHURURU },
      { name: 'Groups & Discipleship', description: 'Cell groups and the discipleship classes.', leaderId: aliceRecord.id, meetingDay: 'Friday', location: NYAHURURU },
      { name: 'Missions, Mercy & Church Planting', description: 'Outreach, the welfare fund and the outstations.', leaderId: aliceRecord.id, meetingDay: 'Thursday', location: NYAHURURU },
    ].map((data) => prisma.ministry.create({ data })),
  );
  const department = (name: string) => {
    const found = ministries.find((ministry) => ministry.name === name);
    if (!found) throw new Error(`The seed named a department it never created: ${name}`);
    return found.id;
  };

  await prisma.ministryMember.createMany({
    data: [
      { ministryId: department('Visionary Leadership & Church Council'), memberId: bishopRecord.id, roleTitle: 'Moderator' },
      { ministryId: department('Worship & Word Ministry'), memberId: caleb.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Worship & Word Ministry'), memberId: bishopRecord.id, roleTitle: 'Member' },
      { ministryId: department("Women's Fellowship"), memberId: mary.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Destiny Youth'), memberId: daniel.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Next Generation & Children'), memberId: mary.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Groups & Discipleship'), memberId: aliceRecord.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Missions, Mercy & Church Planting'), memberId: aliceRecord.id, roleTitle: 'Ministry Leader' },
      { ministryId: department('Missions, Mercy & Church Planting'), memberId: daniel.id, roleTitle: 'Member' },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // A service, its attendance, and the giving that came in
  // -------------------------------------------------------------------------------------------
  const service = await prisma.service.create({
    data: {
      title: 'Sunday Worship Service', heldAt: new Date('2025-02-09T07:00:00+03:00'), startTime: '7:00 AM',
      venue: NYAHURURU, theme: 'My Year of Dominion', officiantId: bishopRecord.id,
    },
  });

  await prisma.attendance.createMany({
    data: [
      { serviceId: service.id, kind: 'service', count: 712, notes: 'Adults and youth' },
      { serviceId: service.id, kind: 'service', count: 140, notes: 'Children' },
      { serviceId: service.id, kind: 'service', count: 23, notes: 'First-time visitors' },
      { memberId: caleb.id, kind: 'group', count: 1, notes: 'Praise & Worship rehearsal' },
    ],
  });

  await prisma.tithe.createMany({
    data: [
      { txCode: 'TX-2025-0001', memberId: bishopRecord.id, donorName: 'Bishop Sammy', envelopeNo: 'ENV-1001', amount: '25000.00', method: 'mpesa', category: 'Tithe', reference: 'QGH7X2M9PL', recordedById: bishop.id, receivedAt: new Date('2025-02-09T09:12:00+03:00') },
      { txCode: 'TX-2025-0002', memberId: caleb.id, donorName: 'Caleb Mwangi', envelopeNo: 'ENV-1003', amount: '8000.00', method: 'cash', category: 'Tithe', recordedById: bishop.id, receivedAt: new Date('2025-02-09T09:20:00+03:00') },
      { txCode: 'TX-2025-0003', memberId: mary.id, donorName: 'Mary Wanjiku', envelopeNo: 'ENV-1004', amount: '5000.00', method: 'mpesa', category: 'Thanksgiving', recordedById: bishop.id, receivedAt: new Date('2025-02-09T09:31:00+03:00') },
      { txCode: 'TX-2025-0004', donorName: 'Anonymous Giver', amount: '2000.00', method: 'cash', category: 'Building Fund', recordedById: bishop.id, receivedAt: new Date('2025-02-09T09:44:00+03:00') },
    ],
  });

  await prisma.offering.createMany({
    data: [
      { txCode: 'OF-2025-0001', serviceId: service.id, amount: '61240.00', method: 'cash', category: 'Plate Cash', receivedAt: new Date('2025-02-09T09:50:00+03:00'), recordedById: bishop.id },
      { txCode: 'OF-2025-0002', serviceId: service.id, amount: '18900.00', method: 'mpesa', category: 'Designated Envelopes', receivedAt: new Date('2025-02-09T09:52:00+03:00'), recordedById: bishop.id },
    ],
  });

  // Who was serving on the day, and the write-up that closes the week.
  await prisma.rosterDuty.createMany({
    data: [
      { serviceId: service.id, memberId: aliceRecord.id, roleTitle: 'Service Leader', ministryId: department('Visionary Leadership & Church Council'), status: 'completed' },
      { serviceId: service.id, memberId: caleb.id, roleTitle: 'Worship Leader', ministryId: department('Worship & Word Ministry'), status: 'completed' },
      // Ushering is a serving team, not one of the seven departments, so this duty carries no
      // `ministryId`. See the note in README's "Known modelling gaps".
      { serviceId: service.id, memberId: daniel.id, roleTitle: 'Welcome & Ushering Lead', status: 'completed' },
      { serviceId: service.id, memberId: mary.id, roleTitle: "Children's Church Teacher", ministryId: department('Next Generation & Children'), status: 'completed' },
    ],
  });

  await prisma.serviceReport.create({
    data: {
      serviceId: service.id,
      summary: 'A full sanctuary for the second Sunday of the year, with twenty-three first-time visitors received and the choir leading the procession.',
      adultsCount: 712,
      childrenCount: 140,
      visitorsCount: 23,
      offeringsTotal: '80140.00',
      highlights: 'Three families asked about joining a household unit after the service.',
      preparedById: bishop.id,
    },
  });

  // -------------------------------------------------------------------------------------------
  // Next Sunday, planned in advance: the order of service written, the volunteers rostered, and one
  // of them asking for cover — the three states the planner, the roster and the swap list show.
  // -------------------------------------------------------------------------------------------
  const nextSunday = await prisma.service.create({
    data: {
      title: 'Sunday Worship Service', heldAt: new Date('2025-02-16T07:00:00+03:00'), startTime: '7:00 AM',
      venue: NYAHURURU, theme: 'My Year of Dominion', officiantId: bishopRecord.id,
    },
  });

  // `position` is written out rather than implied: a liturgy is an ordered list, and "which item is
  // third" must not depend on insertion order or row ids.
  await prisma.orderOfServiceItem.createMany({
    data: [
      { serviceId: nextSunday.id, position: 1, title: 'Call to Worship', kind: 'call_to_worship', durationMinutes: 5, responsible: 'Rev. Alice' },
      { serviceId: nextSunday.id, position: 2, title: 'Praise & Worship', kind: 'praise_worship', durationMinutes: 35, responsible: 'Praise & Worship', ministryId: department('Worship & Word Ministry') },
      { serviceId: nextSunday.id, position: 3, title: 'Presentation of Visitors', kind: 'presentation', durationMinutes: 10, responsible: 'Ushering & Hospitality' },
      { serviceId: nextSunday.id, position: 4, title: 'Sermon / Word Ministry', kind: 'sermon', durationMinutes: 45, responsible: 'Bishop Sammy' },
      { serviceId: nextSunday.id, position: 5, title: 'Congregation Dismissed', kind: 'dismissal', durationMinutes: 5, responsible: 'Bishop Sammy' },
      { serviceId: nextSunday.id, position: 6, title: 'Groups Meetings & Fellowship', kind: 'other', durationMinutes: 60, responsible: 'Ministry Leaders' },
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
  await prisma.announcement.create({
    data: { title: 'Reformation Heritage Dinner & Hymn Sing', body: 'Join the congregation for an evening of hymns and fellowship in the main sanctuary.', audience: 'Everyone', authorId: bishop.id, isPinned: true },
  });
  await prisma.broadcast.create({
    data: { channel: 'sms', body: 'Destiny Sanctuary: Sunday service begins 7:00 AM. All are welcome.', audience: 'Members', status: 'sent', sentAt: new Date('2025-02-08T18:00:00+03:00'), recipients: 412, createdById: bishop.id },
  });
  await prisma.event.createMany({
    data: [
      { title: 'Harvest Praise Feast & Hymn Festival', kind: 'conference', venue: NYAHURURU, startsAt: new Date('2025-03-14T18:00:00+03:00'), endsAt: new Date('2025-03-14T21:00:00+03:00') },
      { title: 'Annual Leaders Retreat', kind: 'conference', venue: NYAHURURU, startsAt: new Date('2025-04-25T09:00:00+03:00'), endsAt: new Date('2025-04-26T16:00:00+03:00') },
      { title: 'Youth Destiny Conference', kind: 'conference', venue: NYAHURURU, startsAt: new Date('2025-05-30T09:00:00+03:00'), endsAt: new Date('2025-06-01T16:00:00+03:00') },
      { title: 'Family Dedication Sunday', kind: 'service', venue: NYAHURURU, startsAt: new Date('2025-02-23T09:00:00+03:00'), endsAt: new Date('2025-02-23T12:00:00+03:00') },
    ],
  });
  await prisma.prayerRequest.createMany({
    data: [
      { memberId: mary.id, requesterName: 'Mary Wanjiku', request: 'Healing for a family member in hospital.', status: 'praying' },
      { requesterName: 'A visitor', request: 'Guidance on a new job.', status: 'open', isPrivate: true },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // Governance: the Session's sittings, the resolutions they carried, and the bylaws in force
  // -------------------------------------------------------------------------------------------
  const statedConclave = await prisma.meeting.create({
    data: {
      title: 'Q1 Stated Council Conclave #2025-03', kind: 'stated', status: 'held',
      heldAt: new Date('2025-02-06T19:00:00+03:00'), venue: 'Nyahururu Main Church - Council Chamber',
      chairId: bishopRecord.id, secretaryId: aliceRecord.id, attendees: 14, quorumMet: true,
      agenda: [
        'Opening devotion and roll call',
        'Minutes of the previous stated conclave',
        'Sanctuary HVAC and acoustic contract',
        '2025 general operating budget',
        'Youth ministry transport',
        'Any other business',
      ],
      minutes:
        'The Moderator opened in prayer at 7:05 PM. Fourteen of fifteen members were present, so the meeting was quorate. The HVAC contract was awarded and referred to the trustees for implementation. The 2025 operating budget was carried with one abstention. The bus grant was held over for the fourteen-day elder review.',
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Ordinary Council Conclave', kind: 'stated', status: 'scheduled',
      heldAt: new Date('2025-02-27T19:00:00+03:00'), venue: 'Nyahururu Main Church - Council Chamber',
      chairId: bishopRecord.id, secretaryId: aliceRecord.id,
      agenda: ['Roll call', 'Youth ministry bus fleet replacement grant', 'Outstation reports', 'Closing prayer'],
    },
  });

  await prisma.resolution.createMany({
    data: [
      {
        code: 'RES-2025-042', title: 'Sanctuary HVAC & Acoustic Tech Contract',
        summary: 'Award the sanctuary climate and acoustic contract and refer implementation to the trustees.',
        sponsor: 'Trustee Board', sponsorOfficer: 'Arthur Wanjala', meetingId: statedConclave.id,
        councilDate: new Date('2025-02-06T19:00:00+03:00'), stage: 'implementing',
        voteSummary: '13 Yea - 0 Nay', votesFor: 13, votesAgainst: 0, votesAbstain: 0,
        lead: 'Elder Marcus Kamau', leadNote: '2 of 4 milestones; due Dec 31, 2025', decidedAt: new Date('2025-02-06T20:10:00+03:00'),
      },
      {
        code: 'RES-2025-043', title: '2025 General Church Operating Budget',
        summary: 'Adopt the 2025 operating budget as presented by the Finance Committee.',
        sponsor: 'Finance Committee', sponsorOfficer: 'Clara Wambui', meetingId: statedConclave.id,
        councilDate: new Date('2025-02-06T19:00:00+03:00'), stage: 'voted_approved',
        voteSummary: '12 Yea - 1 Abstain', votesFor: 12, votesAgainst: 0, votesAbstain: 1,
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
        voteSummary: '14 Yea - 0 Nay', votesFor: 14, votesAgainst: 0, votesAbstain: 0,
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

  const counts = {
    members: await prisma.member.count(),
    households: await prisma.household.count(),
    ministries: await prisma.ministry.count(),
    tithes: await prisma.tithe.count(),
    offerings: await prisma.offering.count(),
    meetings: await prisma.meeting.count(),
    resolutions: await prisma.resolution.count(),
    documents: await prisma.governanceDocument.count(),
    ledgerEntries: await prisma.financeAuditEntry.count(),
  };
  console.log(
    `Seeded ${counts.members} members, ${counts.households} households, ${counts.ministries} departments, ` +
      `${counts.tithes} tithes, ${counts.offerings} offerings, ${counts.ledgerEntries} ledger entries, ` +
      `${counts.meetings} meetings, ${counts.resolutions} resolutions and ${counts.documents} documents.`,
  );
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
