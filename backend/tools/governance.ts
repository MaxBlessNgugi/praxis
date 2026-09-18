import { basePrisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { provisionChurch, removeChurch, roleId } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The council domain, checked against the running API.
 *
 * Every claim the council screens make is asserted here: that the **quorum figure is counted** from
 * the council roll rather than sent by a client, that it follows the roll when the roll changes and
 * counts people rather than offices; that a minute is sealed only once the sitting has been held and
 * the words written, that sealing fixes the register and that only an administrator may then touch it;
 * that a resolution walks proposed → voted → implemented → closed and refuses every shortcut; that the
 * code is issued in the year's series; that a by-law keeps its version and its flag for the version in
 * force; that a scanned copy can be attached to a document but a logo cannot; that a retired record
 * keeps the reason it was retired with; and that another church can reach none of it.
 *
 * It runs inside a **probe church of its own**, so the seeded church's council is not filled with probe
 * sittings, and the cleanup is the sweep in `lib/provision` — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/governance.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'council-probe-church';
const PROBE_EMAIL = 'probe-clerk@council.test';
const PROBE_PASSWORD = 'council-probe-password';
const PROBE_NAME = 'Council Probe Clerk';
const STAFF_EMAIL = 'probe-deputy@council.test';
const STAFF_PASSWORD = 'council-deputy-password';

/** Evenings well away from the day the check runs, so nothing here depends on the calendar. */
const SITTING = '2026-11-04T19:00:00.000Z';
const LATER_SITTING = '2026-12-02T19:00:00.000Z';

let checks = 0;
let failed = 0;

function check(what: string, passed: boolean, detail = ''): void {
  checks += 1;
  if (passed) {
    console.log(`  ✓ ${what}`);
    return;
  }
  failed += 1;
  console.log(`  ✗ ${what}${detail ? ` — ${detail}` : ''}`);
}

interface Answer {
  status: number;
  body: unknown;
}

async function call(method: string, path: string, token?: string, body?: unknown): Promise<Answer> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed };
}

function data<T>(answer: Answer): T | null {
  const body = answer.body as { data?: T } | null;
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : null;
}

function errorOf(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

function listOf<T>(answer: Answer): { data: T[]; total: number } | null {
  const body = answer.body as { data?: T[]; meta?: { total?: number } } | null;
  return body?.meta ? { data: body.data ?? [], total: body.meta.total ?? 0 } : null;
}

interface MeetingRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  attendees: number | null;
  quorumRequired: number | null;
  quorumMet: boolean | null;
  minutes: string | null;
  minutesFinalizedAt: string | null;
  minutesFinalizedBy: { name: string } | null;
}

interface ResolutionRow {
  id: string;
  code: string;
  title: string;
  stage: string;
  voteSummary: string | null;
  votesFor: number | null;
  votesAbstain: number | null;
  leadNote: string | null;
}

interface DocumentRow {
  id: string;
  reference: string;
  version: string;
  isActive: boolean;
  file: { fileName: string } | null;
}

async function signIn(email: string, password: string): Promise<string> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? '';
}

/** A member of the church office: staff may write the records but may not decide or seal one. */
async function provisionStaff(organizationId: string, name: string, email: string): Promise<void> {
  const staffRoleId = await roleId('staff');
  await basePrisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(STAFF_PASSWORD),
      roleId: staffRoleId,
      memberships: { create: { organizationId, roleId: staffRoleId, isDefault: true } },
    },
  });
}

/** Enrol a member and hand back their id, for the council roll. */
async function enrol(token: string, firstName: string, lastName: string): Promise<string> {
  const answer = await call('POST', '/api/members', token, { firstName, lastName, location: 'Probe Congregation' });
  return data<{ id: string }>(answer)?.id ?? '';
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 3, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Council Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const token = await signIn(PROBE_EMAIL, PROBE_PASSWORD);
  check('its warden can sign in', token.length > 0);
  await provisionStaff(probe.organizationId, 'Deputy Clerk', STAFF_EMAIL);
  const staffToken = await signIn(STAFF_EMAIL, STAFF_PASSWORD);
  check('so can a member of its office', staffToken.length > 0);

  // The seeded church signs in too, so the last sections can prove it can reach none of this.
  const houseToken = await signIn(
    process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
    process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
  );
  check('the seeded church can sign in', houseToken.length > 0);
  const houseOrgId =
    data<{ organization: { id: string } }>(await call('GET', '/api/auth/me', houseToken))?.organization?.id ?? '';
  const houseBefore = listOf<MeetingRow>(await call('GET', '/api/governance/meetings?pageSize=50', houseToken))?.total ?? -1;
  const houseMeetingId = listOf<MeetingRow>(await call('GET', '/api/governance/meetings?pageSize=1', houseToken))?.data[0]?.id ?? '';

  try {
    console.log('\n2. The quorum figure is counted from the council roll');
    const unstaffed = await call('POST', '/api/governance/meetings', token, {
      title: 'Probe sitting with no roll',
      heldAt: SITTING,
      venue: 'Probe Chamber',
    });
    check('a church with no offices gets no quorum figure', data<MeetingRow>(unstaffed)?.quorumRequired === null);
    check(
      'and its register is not judged against one',
      data<MeetingRow>(unstaffed)?.quorumMet === null,
      String(data<MeetingRow>(unstaffed)?.quorumMet),
    );
    check(
      'the figure cannot be claimed by a client',
      (await call('POST', '/api/governance/meetings', token, {
        title: 'A sitting that tries to set its own quorum',
        heldAt: LATER_SITTING,
        venue: 'Probe Chamber',
        quorumMet: true,
        quorumRequired: 1,
      })).status < 300,
    );
    check(
      'and is still the server’s answer',
      data<MeetingRow>(
        await call('GET', `/api/governance/meetings/${data<MeetingRow>(unstaffed)?.id}`, token),
      )?.quorumRequired === null,
    );

    // Three officeholders and one plain member: the roll is the three, and a member of a ministry who
    // holds no office is not part of it.
    const elder = await enrol(token, 'Grace', 'Wanjiru');
    const clerk = await enrol(token, 'Samuel', 'Kiptoo');
    const treasurer = await enrol(token, 'Naomi', 'Chebet');
    const pew = await enrol(token, 'John', 'Mutiso');
    const ministry = data<{ id: string }>(
      await call('POST', '/api/ministries', token, {
        name: 'Probe Council',
        description: 'The probe church’s council.',
        location: 'Probe Congregation',
      }),
    );
    check('four members are enrolled', Boolean(elder) && Boolean(clerk) && Boolean(treasurer) && Boolean(pew));

    const offices: Array<[string, string]> = [
      [elder, 'Elder'],
      [clerk, 'Church Secretary'],
      [treasurer, 'Treasurer'],
      [pew, 'Member'],
    ];
    for (const [memberId, roleTitle] of offices) {
      await call('POST', `/api/ministries/${ministry?.id}/members`, token, { memberId, roleTitle });
    }

    const counted = await call('POST', '/api/governance/meetings', token, {
      title: 'Probe stated sitting',
      kind: 'stated',
      heldAt: SITTING,
      venue: 'Probe Chamber',
      chairId: elder,
      secretaryId: clerk,
      attendees: 2,
      agenda: ['Roll call', 'Probe business'],
    });
    const sitting = data<MeetingRow>(counted);
    check('a majority of three offices is two', sitting?.quorumRequired === 2, String(sitting?.quorumRequired));
    check('two present is quorate', sitting?.quorumMet === true, String(sitting?.quorumMet));

    const thinned = await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { attendees: 1 });
    check('one present is not', data<MeetingRow>(thinned)?.quorumMet === false, String(data<MeetingRow>(thinned)?.quorumMet));

    // A second office for the same person is one person: the roll counts people, not rows.
    await call('POST', `/api/ministries/${ministry?.id}/members`, token, { memberId: elder, roleTitle: 'Moderator' });
    const recounted = data<MeetingRow>(
      await call('POST', '/api/governance/meetings', token, {
        title: 'Probe sitting after a second office',
        heldAt: LATER_SITTING,
        venue: 'Probe Chamber',
      }),
    );
    check('a second office for one person does not raise the roll', recounted?.quorumRequired === 2, String(recounted?.quorumRequired));

    check(
      'a chair who is not on the register is refused',
      (await call('POST', '/api/governance/meetings', token, {
        title: 'Probe sitting with an invented chair',
        heldAt: LATER_SITTING,
        venue: 'Probe Chamber',
        chairId: '11111111-1111-4111-8111-111111111111',
      })).status === 400,
    );

    console.log('\n3. A minute is sealed once, and the register is fixed after it');
    check('a sitting that has not been held cannot be sealed', (await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, token)).status === 409);
    check('staff cannot seal a minute', (await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, staffToken)).status === 403);

    await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { status: 'held', minutes: 'Too short' });
    check('a minute too thin to be a minute is refused', (await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, token)).status === 409);

    const written = 'The Moderator opened in prayer; the roll was called and the annex roof was left with the trustees.';
    await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { minutes: written });
    const sealed = await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, token);
    check('an administrator seals the minute', sealed.status < 300, errorOf(sealed));
    check('the minute records who sealed it', data<MeetingRow>(sealed)?.minutesFinalizedBy?.name === PROBE_NAME);
    const sealedAt = data<MeetingRow>(sealed)?.minutesFinalizedAt ?? '';

    check(
      'sealing twice keeps the day it was sealed',
      data<MeetingRow>(await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, token))?.minutesFinalizedAt === sealedAt,
    );
    check(
      'a sealed sitting cannot be called off',
      (await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { status: 'cancelled' })).status === 409,
    );
    check(
      'nor can its register be rewritten',
      (await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { attendees: 3 })).status === 409,
    );
    check(
      'an administrator may still correct the minute itself',
      (await call('PATCH', `/api/governance/meetings/${sitting?.id}`, token, { minutes: `${written} Corrected: the second quote was accepted.` }))
        .status < 300,
    );

    console.log('\n4. A resolution moves by its acts, and by nothing else');
    const year = new Date(SITTING).getUTCFullYear();
    const tabled = await call('POST', '/api/governance/resolutions', token, {
      title: 'Probe annex roof contract',
      summary: 'Award the annex roof contract and refer implementation to the trustees.',
      sponsor: 'Trustee Board',
      sponsorOfficer: 'Grace Wanjiru',
      meetingId: sitting?.id,
      councilDate: SITTING,
      stage: 'closed',
    });
    const resolution = data<ResolutionRow>(tabled);
    check('the code is issued in the year’s series', resolution?.code === `RES-${year}-001`, resolution?.code ?? 'none');
    check('and it starts proposed however the client asked', resolution?.stage === 'proposed', resolution?.stage ?? 'none');

    check(
      'the work cannot start before the vote',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
        decision: 'implementing',
        note: 'Starting early',
      })).status === 409,
    );
    check(
      'a closure cannot be jumped to either',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
        decision: 'closed',
        note: 'Closing early',
      })).status === 409,
    );
    check(
      'staff cannot decide a resolution',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, staffToken, {
        decision: 'voted_approved',
        voteSummary: '2 Yea - 0 Nay',
      })).status === 403,
    );
    check(
      'a vote with no division is refused',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, { decision: 'voted_approved' })).status === 400,
    );

    const voted = await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
      decision: 'voted_approved',
      voteSummary: '2 Yea - 0 Nay',
      votesFor: 2,
      votesAgainst: 0,
      votesAbstain: 0,
    });
    check('the vote is recorded with its counts', data<ResolutionRow>(voted)?.votesFor === 2, String(data<ResolutionRow>(voted)?.votesFor));
    check('and the stage follows', data<ResolutionRow>(voted)?.stage === 'voted_approved');

    const started = await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
      decision: 'implementing',
      note: 'The trustees have the contract and are seeking a second quotation.',
    });
    check('the work is put into effect with the lead’s note', data<ResolutionRow>(started)?.stage === 'implementing');
    check('the note is kept', (data<ResolutionRow>(started)?.leadNote ?? '').includes('second quotation'));

    const closed = await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
      decision: 'closed',
      note: 'Roof replaced and paid for; the contractor has signed off.',
    });
    check('and it closes', data<ResolutionRow>(closed)?.stage === 'closed');
    check(
      'nothing follows a closure',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, token, {
        decision: 'implementing',
        note: 'Reopening it',
      })).status === 409,
    );
    check(
      'staff may still amend the words',
      (await call('PATCH', `/api/governance/resolutions/${resolution?.id}`, staffToken, { lead: 'Elder Marcus Kamau' })).status < 300,
    );

    const second = data<ResolutionRow>(
      await call('POST', '/api/governance/resolutions', token, {
        title: 'Probe bus fleet grant',
        summary: 'A grant toward replacing the probe church’s bus fleet.',
        sponsor: 'Destiny Youth',
        councilDate: LATER_SITTING,
      }),
    );
    check('the next resolution takes the next number', second?.code === `RES-${year}-002`, second?.code ?? 'none');
    check(
      'a resolution cannot be tabled at another church’s sitting',
      (await call('POST', '/api/governance/resolutions', token, {
        title: 'Probe resolution at a foreign sitting',
        summary: 'Tabled at a sitting that belongs to another church.',
        sponsor: 'Trustee Board',
        councilDate: LATER_SITTING,
        meetingId: houseMeetingId,
      })).status === 400,
    );
    check(
      'the docket counts what sits at each stage',
      listOf<ResolutionRow>(await call('GET', '/api/governance/resolutions?stage=closed', token))?.total === 1,
    );

    console.log('\n5. The library keeps the version in force, and the copy held');
    const constitution = await call('POST', '/api/governance/documents', token, {
      title: 'Probe Church Constitution',
      kind: 'constitution',
      reference: 'GC-PROBE-001',
      version: '1.0',
      adoptedAt: '2026-01-18',
      body: 'The constitution of the probe church, as adopted by the congregational meeting.',
    });
    const document = data<DocumentRow>(constitution);
    check('a document is filed', Boolean(document?.id));
    check(
      'and is in force unless it says otherwise',
      document?.isActive === true,
      String(document?.isActive),
    );
    check(
      'a second document cannot take the same reference',
      (await call('POST', '/api/governance/documents', token, {
        title: 'A second constitution',
        kind: 'constitution',
        reference: 'GC-PROBE-001',
      })).status === 409,
    );

    const scan = data<{ id: string; fileName: string }>(
      await call('POST', '/api/files', token, {
        purpose: 'document',
        fileName: 'probe-minute.txt',
        mimeType: 'text/plain',
        content: Buffer.from('A scanned minute of the probe sitting.').toString('base64'),
      }),
    );
    const attached = await call('PATCH', `/api/governance/documents/${document?.id}`, token, { fileId: scan?.id });
    check('the copy the church holds can be attached', data<DocumentRow>(attached)?.file?.fileName === 'probe-minute.txt');

    const logo = data<{ id: string }>(
      await call('POST', '/api/files', token, {
        purpose: 'logo',
        fileName: 'probe-logo.png',
        // A one-pixel PNG: enough for the upload, and exactly what a by-law is not.
        mimeType: 'image/png',
        content:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      }),
    );
    check(
      'a logo cannot be filed as a by-law',
      (await call('PATCH', `/api/governance/documents/${document?.id}`, token, { fileId: logo?.id })).status === 400,
    );

    const policy = data<DocumentRow>(
      await call('POST', '/api/governance/documents', token, {
        title: 'Probe Financial Policy',
        kind: 'policy',
        reference: 'GC-PROBE-002',
        version: '2.0',
      }),
    );
    await call('PATCH', `/api/governance/documents/${policy?.id}`, token, { version: '2.1', isActive: false });
    check(
      'a superseded version stays readable',
      (listOf<DocumentRow>(await call('GET', '/api/governance/documents?q=Probe%20Financial%20Policy', token))?.total ?? 0) === 1,
    );
    check(
      'but is not what is in force',
      (listOf<DocumentRow>(await call('GET', '/api/governance/documents?isActive=true&q=Probe%20Financial%20Policy', token))?.total ?? -1) === 0,
    );
    check(
      'the library counts what it holds by kind',
      (listOf<DocumentRow>(await call('GET', '/api/governance/documents?kind=constitution', token))?.total ?? -1) === 1,
    );

    console.log('\n6. A retired record keeps why, and comes back');
    check(
      'staff cannot retire a document',
      (await call('DELETE', `/api/governance/documents/${policy?.id}?reason=wrong_entry&reasonLabel=Needs%20a%20reissue`, staffToken)).status === 403,
    );
    const retired = await call(
      'DELETE',
      `/api/governance/documents/${policy?.id}?reason=other&reasonLabel=${encodeURIComponent('Superseded by the 2027 policy')}`,
      token,
    );
    check('an administrator can retire it', retired.status < 300, errorOf(retired));
    check(
      'it leaves the library',
      (listOf<DocumentRow>(await call('GET', '/api/governance/documents?q=Probe%20Financial%20Policy', token))?.total ?? -1) === 0,
    );

    const inTrash = (listOf<{ id: string; entityId: string; reasonLabel: string }>(
      await call('GET', '/api/admin/trash?pageSize=100', token),
    )?.data ?? []).find((row) => row.entityId === policy?.id);
    check('it is in the Trash', Boolean(inTrash));
    check(
      'with the reason its clerk gave kept beside it',
      (inTrash?.reasonLabel ?? '').includes('Superseded'),
      inTrash?.reasonLabel ?? 'none',
    );
    if (inTrash) {
      check('it can be put back', (await call('POST', `/api/admin/trash/${inTrash.id}/restore`, token, {})).status < 300);
      check(
        'and returns to the library',
        (listOf<DocumentRow>(await call('GET', '/api/governance/documents?q=Probe%20Financial%20Policy', token))?.total ?? 0) === 1,
      );
    }

    console.log('\n7. The register keeps its own history');
    const history = data<{ audit: Array<{ summary: string }> }>(
      await call('GET', `/api/admin/audit/Meeting/${sitting?.id}`, token),
    );
    const summaries = (history?.audit ?? []).map((line) => line.summary);
    check('the sitting has a history', summaries.length > 0, `${summaries.length} lines`);
    check('its sealing is in it', summaries.some((line) => line.includes('Sealed')), summaries.join(' | '));
    check(
      'the resolution’s acts are in its history',
      ((data<{ audit: Array<{ summary: string }> }>(await call('GET', `/api/admin/audit/Resolution/${resolution?.id}`, token))?.audit ?? [])
        .map((line) => line.summary)
        .join(' | ')).includes('carried'),
    );
    check('staff cannot read the audit trail', (await call('GET', '/api/admin/audit', staffToken)).status === 403);

    console.log('\n8. Another church can reach none of it');
    check('reading a sitting by id is refused', (await call('GET', `/api/governance/meetings/${sitting?.id}`, houseToken)).status === 404);
    check(
      'amending it is refused',
      (await call('PATCH', `/api/governance/meetings/${sitting?.id}`, houseToken, { title: 'Taken over' })).status === 404,
    );
    check(
      'sealing its minute is refused',
      (await call('POST', `/api/governance/meetings/${sitting?.id}/minutes/seal`, houseToken)).status === 404,
    );
    check(
      'retiring it is refused',
      (await call('DELETE', `/api/governance/meetings/${sitting?.id}?reason=other&reasonLabel=Not%20mine`, houseToken)).status === 404,
    );
    check(
      'deciding the resolution is refused',
      (await call('POST', `/api/governance/resolutions/${resolution?.id}/decision`, houseToken, {
        decision: 'implementing',
        note: 'Not mine to move',
      })).status === 404,
    );
    check('reading the document is refused', (await call('GET', `/api/governance/documents/${document?.id}`, houseToken)).status === 404);
    check('its history is refused', (await call('GET', `/api/admin/audit/Meeting/${sitting?.id}`, houseToken)).status === 404);
    check(
      'its docket never enters the other church’s list',
      (listOf<ResolutionRow>(await call('GET', '/api/governance/resolutions?pageSize=50', houseToken))?.data ?? []).every((row) =>
        row.code.startsWith('RES-') && row.code !== resolution?.code,
      ),
    );
    const houseAfter = listOf<MeetingRow>(await call('GET', '/api/governance/meetings?pageSize=50', houseToken))?.total ?? -2;
    check('and neither does its calendar', houseAfter === houseBefore, `${houseBefore} → ${houseAfter}`);
  } finally {
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL, STAFF_EMAIL],
      // The refusals in the last sections were written into the *seeded* church's log and name the probe.
      residualAudit: {
        organizationId: houseOrgId,
        mentions: [PROBE_NAME, PROBE_EMAIL, 'Probe Chamber', 'Probe sitting'],
      },
    });
    console.log('\nThe probe church, its council and its rows were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} governance checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nGovernance check could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
