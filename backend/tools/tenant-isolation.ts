import { basePrisma } from '../src/lib/prisma';
import { provisionChurch, removeChurch, roleId } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * One church cannot see or touch another's records.
 *
 * This is the test that matters for multi-tenancy, and it is the one thing a unit test of the
 * tenant-scoped client cannot prove, because the guarantee lives in the request path: token →
 * membership → church context → every query. So it runs against a live API, like `smoke.mjs`.
 *
 * It provisions a second church, signs in as that church's administrator, and then tries — with the
 * API's own endpoints — to read, change, retire and restore the first church's rows. Every attempt
 * must fail, and every list must come back empty rather than filtered. The second church is removed
 * again at the end, including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4001 npx tsx tools/tenant-isolation.ts
 */

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';

const PROBE_SLUG = 'isolation-probe-church';
const PROBE_EMAIL = 'probe-admin@isolation.test';
const PROBE_PASSWORD = 'isolation-probe-password';
const PROBE_NAME = 'Probe Administrator';

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
  const response = await fetch(`${API_URL}${path}`, {
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

/** The payload of a `{ data: … }` answer. */
function data<T>(answer: Answer): T | null {
  const body = answer.body as { data?: T } | null;
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : null;
}

function errorMessage(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

/** The `{ data: […], meta: { total } }` shape every paged list returns. */
function listOf<T>(answer: Answer): { data: T[]; total: number } | null {
  const body = answer.body as { data?: T[]; meta?: { total?: number } } | null;
  return body?.meta ? { data: body.data ?? [], total: body.meta.total ?? 0 } : null;
}

async function signInAs(email: string, password: string): Promise<string | null> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? null;
}

async function churchOf(token: string): Promise<{ id: string; name: string } | null> {
  return data<{ organization: { id: string; name: string } }>(await call('GET', '/api/auth/me', token))?.organization ?? null;
}

/** The modules a second church must find empty. Each is a list endpoint of the first church's data. */
const ISOLATED_LISTS: Array<[string, string, string]> = [
  ['the household roll', '/api/households', '/api/households?pageSize=50'],
  ['the service plan', '/api/services', '/api/services?pageSize=50'],
  ['the roster', '/api/services/roster', '/api/services/roster'],
  ['the ministries', '/api/ministries', '/api/ministries'],
  ['the meeting list', '/api/governance/meetings', '/api/governance/meetings?pageSize=50'],
  ['the resolutions', '/api/governance/resolutions', '/api/governance/resolutions?pageSize=50'],
  ['the document library', '/api/governance/documents', '/api/governance/documents?pageSize=50'],
  ['the offering ledger', '/api/finance/offerings', '/api/finance/offerings?pageSize=50'],
  ['the project list', '/api/finance/projects', '/api/finance/projects?pageSize=50'],
  ['the welfare register', '/api/finance/welfare', '/api/finance/welfare?pageSize=50'],
  ['the charity register', '/api/finance/charity', '/api/finance/charity?pageSize=50'],
  ['the file library', '/api/files', '/api/files?pageSize=50'],
];

/** One id per domain from the first church, taken as the first church, to aim at from outside. */
interface ForeignIds {
  member: string;
  household: string;
  service: string;
  ministry: string;
  meeting: string;
  resolution: string;
  document: string;
  offering: string;
  project: string;
  welfare: string;
  charity: string;
}

const firstId = async (token: string, path: string): Promise<string> => {
  const rows = data<Array<{ id: string }>>(await call('GET', path, token)) ?? [];
  return rows[0]?.id ?? '';
};

async function collectIds(token: string): Promise<ForeignIds> {
  return {
    member: await firstId(token, '/api/members?pageSize=1'),
    household: await firstId(token, '/api/households?pageSize=1'),
    service: await firstId(token, '/api/services?pageSize=1'),
    ministry: await firstId(token, '/api/ministries'),
    meeting: await firstId(token, '/api/governance/meetings?pageSize=1'),
    resolution: await firstId(token, '/api/governance/resolutions?pageSize=1'),
    document: await firstId(token, '/api/governance/documents?pageSize=1'),
    offering: await firstId(token, '/api/finance/offerings?pageSize=1'),
    project: await firstId(token, '/api/finance/projects?pageSize=1'),
    welfare: await firstId(token, '/api/finance/welfare?pageSize=1'),
    charity: await firstId(token, '/api/finance/charity?pageSize=1'),
  };
}

/** A one-pixel PNG, named so the run's audit rows can be swept with it. */
const PROBE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

async function uploadProbeFile(token: string): Promise<string | null> {
  const answer = await call('POST', '/api/files', token, {
    purpose: 'other',
    fileName: 'isolation-probe-file.png',
    mimeType: 'image/png',
    content: PROBE_PNG,
  });
  return data<{ id: string }>(answer)?.id ?? null;
}

async function main(): Promise<void> {
  console.log(`Tenant isolation → ${API_URL}`);

  // Two sign-ins below, on an address that other suites in the same CI job share.
  await waitForSignInBudget(API_URL, 3);

  const houseToken = await signInAs(EMAIL, PASSWORD);
  if (!houseToken) throw new Error(`could not sign in as ${EMAIL}`);
  const house = await churchOf(houseToken);
  if (!house) throw new Error('the first church did not come back from /api/auth/me');

  console.log(`\n1. The first church reaches its own records  (${house.name})`);
  const members = data<Array<{ id: string }>>(await call('GET', '/api/members?pageSize=5', houseToken)) ?? [];
  const announcements = data<Array<{ id: string }>>(await call('GET', '/api/communications/announcements?pageSize=5', houseToken)) ?? [];
  const tithes = data<Array<{ id: string }>>(await call('GET', '/api/finance/tithes?pageSize=5', houseToken)) ?? [];
  check('the register lists its members', members.length > 0, `got ${members.length}`);
  check('the noticeboard lists its announcements', announcements.length > 0, `got ${announcements.length}`);
  check('the tithe ledger lists its entries', tithes.length > 0, `got ${tithes.length}`);
  if (!members[0] || !announcements[0] || !tithes[0]) throw new Error('the first church has nothing to isolate');
  const [memberId, announcementId, titheId] = [members[0].id, announcements[0].id, tithes[0].id];

  console.log('\n2. A second church is provisioned');
  // Provision a church the way an operator would: there is deliberately no endpoint for this.
  const probe = await provisionChurch({
    name: 'Isolation Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  try {
    const probeToken = await signInAs(PROBE_EMAIL, PROBE_PASSWORD);
    check('its administrator can sign in', Boolean(probeToken));
    if (!probeToken) return;
    check('and lands in its own church', (await churchOf(probeToken))?.id === probe.organizationId);

    console.log('\n3. It sees none of the first church’s records');
    check(
      'the register is empty, not filtered',
      data<unknown[]>(await call('GET', '/api/members?pageSize=50', probeToken))?.length === 0,
    );
    check(
      'the noticeboard is empty',
      data<unknown[]>(await call('GET', '/api/communications/announcements?pageSize=50', probeToken))?.length === 0,
    );
    check(
      'the tithe ledger is empty',
      data<unknown[]>(await call('GET', '/api/finance/tithes?pageSize=50', probeToken))?.length === 0,
    );
    const cards = data<{ cards: { membersTotal: number; giving: number } }>(
      await call('GET', '/api/reports/overview', probeToken),
    )?.cards;
    check('the home figures count nothing', cards?.membersTotal === 0 && cards.giving === 0, JSON.stringify(cards));
    check('the Trash is empty', data<unknown[]>(await call('GET', '/api/admin/trash?pageSize=50', probeToken))?.length === 0);
    // Its own sign-in is legitimately in its log; the first church's history is what must not be.
    const probeAudit =
      data<Array<{ actor: { email: string } | null }>>(
        await call('GET', '/api/admin/audit?pageSize=50', probeToken),
      ) ?? [];
    check(
      'the audit log holds only its own history',
      probeAudit.length > 0 && probeAudit.every((row) => row.actor?.email !== EMAIL),
      `${probeAudit.length} rows`,
    );

    console.log('\n4. It cannot reach a record of the first church’s by id');
    check('reading a member is refused', (await call('GET', `/api/members/${memberId}`, probeToken)).status === 404);
    check(
      'changing a member is refused',
      (await call('PATCH', `/api/members/${memberId}`, probeToken, { phone: '+254700000000' })).status === 404,
    );
    const retire = await call(
      'DELETE',
      `/api/members/${memberId}?reason=other&reasonLabel=${encodeURIComponent('cross-tenant probe')}`,
      probeToken,
    );
    check('retiring a member is refused', retire.status === 404, errorMessage(retire));
    check(
      'reading an announcement is refused',
      (await call('GET', `/api/communications/announcements/${announcementId}`, probeToken)).status === 404,
    );
    check('reading a tithe is refused', (await call('GET', `/api/finance/tithes/${titheId}`, probeToken)).status === 404);

    console.log('\n5. Its own records go in and come back out');
    const created = await call('POST', '/api/members', probeToken, {
      firstName: 'Probe',
      lastName: 'Member',
      phone: '+254700111222',
      location: 'Probe Congregation',
    });
    const probeMemberId = data<{ id: string }>(created)?.id;
    check('it can enrol its own member', Boolean(probeMemberId), errorMessage(created));
    check(
      'which the first church cannot read',
      probeMemberId !== undefined && (await call('GET', `/api/members/${probeMemberId}`, houseToken)).status === 404,
    );

    if (probeMemberId) {
      const retired = await call(
        'DELETE',
        `/api/members/${probeMemberId}?reason=other&reasonLabel=${encodeURIComponent('isolation probe')}`,
        probeToken,
      );
      check('it can retire that member', retired.status < 300, errorMessage(retired));

      const archive = data<Array<{ id: string }>>(
        await call('GET', '/api/admin/trash?entityName=Member', probeToken),
      );
      const archivedId = archive?.[0]?.id;
      check('and sees it in its own Trash', Boolean(archivedId), `got ${archive?.length} rows`);

      const houseTrash = data<Array<{ id: string }>>(
        await call('GET', '/api/admin/trash?entityName=Member&pageSize=100', houseToken),
      );
      check(
        'while the first church’s Trash does not contain it',
        archivedId !== undefined && !houseTrash?.some((row) => row.id === archivedId),
      );

      if (archivedId) {
        const stolen = await call('POST', `/api/members/trash/${archivedId}/restore`, houseToken);
        check('the first church cannot restore it', stolen.status === 404, errorMessage(stolen));
        const own = await call('POST', `/api/members/trash/${archivedId}/restore`, probeToken);
        check('and the second church can', own.status < 300, errorMessage(own));
      }
    }

    // ---------------------------------------------------------------------------------------------
    // The rest of the modules, and nested references
    // ---------------------------------------------------------------------------------------------
    console.log('\n9. Every module’s lists are empty for the second church, not filtered');
    for (const [label, path, query] of ISOLATED_LISTS) {
      check(
        `${label} is empty`,
        data<unknown[]>(await call('GET', query, probeToken))?.length === 0,
        path,
      );
    }

    console.log('\n10. And none of the first church’s rows can be reached by id');
    const foreignIds = await collectIds(houseToken);
    // The probe church's own member, so a roster write aimed at the *other* church's service is a
    // valid request that tenancy has to refuse. With an invalid payload the check would pass on a
    // validation error and prove nothing at all.
    const ownMemberId = await firstId(probeToken, '/api/members?pageSize=1');
    const idChecks: Array<[string, () => Promise<Answer>]> = [
      ['household', () => call('GET', `/api/households/${foreignIds.household}`, probeToken)],
      ['service', () => call('GET', `/api/services/${foreignIds.service}`, probeToken)],
      ['service attendance', () => call('GET', `/api/services/${foreignIds.service}/attendance`, probeToken)],
      ['service report', () => call('GET', `/api/services/${foreignIds.service}/report`, probeToken)],
      ['liturgy write', () => call('PUT', `/api/services/${foreignIds.service}/liturgy`, probeToken, { items: [] })],
      [
        'roster duty',
        () =>
          call('POST', `/api/services/${foreignIds.service}/roster`, probeToken, {
            memberId: ownMemberId,
            roleTitle: 'Probe',
          }),
      ],
      ['ministry', () => call('GET', `/api/ministries/${foreignIds.ministry}`, probeToken)],
      ['meeting', () => call('GET', `/api/governance/meetings/${foreignIds.meeting}`, probeToken)],
      ['resolution', () => call('GET', `/api/governance/resolutions/${foreignIds.resolution}`, probeToken)],
      ['governance document', () => call('GET', `/api/governance/documents/${foreignIds.document}`, probeToken)],
      ['offering', () => call('GET', `/api/finance/offerings/${foreignIds.offering}`, probeToken)],
      ['project', () => call('GET', `/api/finance/projects/${foreignIds.project}`, probeToken)],
      ['welfare case', () => call('GET', `/api/finance/welfare/${foreignIds.welfare}`, probeToken)],
      ['charity activity', () => call('GET', `/api/finance/charity/${foreignIds.charity}`, probeToken)],
      ['project contributions', () => call('GET', `/api/finance/projects/${foreignIds.project}/contributions`, probeToken)],
    ];
    for (const [label, attempt] of idChecks) {
      const answer = await attempt();
      check(`reading a ${label} is refused`, answer.status === 404 || answer.status === 403, errorMessage(answer));
    }

    console.log('\n11. A file belongs to its church, bearer token or not');
    const fileId = await uploadProbeFile(houseToken);
    check('the first church can store a file', Boolean(fileId));
    if (fileId) {
      check('reading its bytes is refused', (await call('GET', `/api/files/${fileId}`, probeToken)).status === 404);
      check('reading its metadata is refused', (await call('GET', `/api/files/${fileId}/meta`, probeToken)).status === 404);
      // Well-formed, so the refusal that comes back is the tenant's, not the validator's.
      const deleted = await call(
        'DELETE',
        `/api/files/${fileId}?reason=other&reasonLabel=${encodeURIComponent('Probe attempted deletion')}`,
        probeToken,
      );
      check('deleting it is refused', deleted.status === 404 || deleted.status === 403, errorMessage(deleted));
      // The owner's list is the proof: every library row carries its church's id, so a file the
      // probe reached would be absent from this page even though the probe's delete was refused.
      const stillListed = listOf<{ id: string }>(
        await call('GET', `/api/files?pageSize=50`, houseToken),
      );
      check(
        'and the file is still listed by the church that owns it',
        stillListed?.data.some((file) => file.id === fileId) === true,
        stillListed === null ? 'list did not parse' : 'not on the owner’s page',
      );
      // Tidy the probe's own upload as the API requires it: every retirement names its reason.
      await call(
        'DELETE',
        `/api/files/${fileId}?reason=other&reasonLabel=${encodeURIComponent('Isolation probe cleanup')}`,
        houseToken,
      );
    }

    console.log('\n12. A reference to the other church’s row is refused, not recorded');
    const linkedToMember = await call('POST', '/api/members', probeToken, {
      firstName: 'Probe',
      lastName: 'Linked',
      location: 'Probe Congregation',
      householdId: foreignIds.household,
    });
    check(
      'a member cannot be added to the other church’s household',
      linkedToMember.status >= 400,
      `got ${linkedToMember.status}`,
    );
    const linkedTithe = await call('POST', '/api/finance/tithes', probeToken, {
      memberId: foreignIds.member,
      donorName: 'Probe Donor',
      amount: 100,
      method: 'cash',
      category: 'general_tithe',
    });
    check(
      'a tithe cannot be attributed to the other church’s member',
      linkedTithe.status >= 400,
      `got ${linkedTithe.status}`,
    );

    console.log('\n6. A session cannot be moved into a church it does not serve');
    check(
      'switching to the other church is refused',
      (await call('POST', '/api/auth/switch-organization', houseToken, { organizationId: probe.organizationId })).status === 403,
    );
    check(
      'switching to its own church is allowed',
      (await call('POST', '/api/auth/switch-organization', houseToken, { organizationId: house.id })).status < 300,
    );

    console.log('\n7. Neither church’s history mentions the other');
    const houseHistory =
      data<Array<{ summary: string | null }>>(
        await call('GET', `/api/admin/audit?q=${encodeURIComponent(PROBE_NAME)}`, houseToken),
      ) ?? [];
    check('the first church’s audit log does not name the second’s administrator', houseHistory.length === 0);

    console.log('\n7b. An account of one church cannot be administered by another, by id');
    // `User` is a global model — the tenant-scoped client deliberately does not scope it — so the
    // **membership** is the boundary. Until section 8 below adds one, the probe account serves only
    // its own church, so these must all be refused: the password reset in particular is a complete
    // account takeover, not a read. (After section 8 the account legitimately serves this church
    // too, which is why the section lives *before* it.)
    const takeoverAttempts: Array<[string, () => Promise<Answer>]> = [
      ['updating it', () => call('PATCH', `/api/admin/users/${probe.userId}`, houseToken, { name: 'Renamed by another church' })],
      ['re-roling it', () => call('POST', `/api/admin/users/${probe.userId}/role`, houseToken, { roleKey: 'viewer' })],
      ['resetting its password', () => call('POST', `/api/admin/users/${probe.userId}/password`, houseToken, { password: 'Taken-Over-2026!' })],
      ['retiring it', () => call('DELETE', `/api/admin/users/${probe.userId}?reason=account&reasonLabel=Probe%20attempt`, houseToken)],
      ['re-inviting it', () => call('POST', `/api/admin/users/${probe.userId}/reinvite`, houseToken)],
    ];
    for (const [what, attempt] of takeoverAttempts) {
      const answer = await attempt();
      check(`${what} is refused`, answer.status === 403 || answer.status === 404, errorMessage(answer));
    }
    // The refusals are only proof if nothing changed: the probe administrator signs in with the
    // password it was provisioned with and still holds its own role.
    const stillSignsIn = await signInAs(PROBE_EMAIL, PROBE_PASSWORD);
    check('the probe account still signs in with its own password', Boolean(stillSignsIn));
    const probeStillAdmin = stillSignsIn
      ? data<{ user: { roleKey: string } }>(await call('GET', '/api/auth/me', stillSignsIn))?.user.roleKey
      : null;
    check('and still holds its own role', probeStillAdmin === 'admin', `got ${probeStillAdmin}`);

    console.log('\n8. One account serving two churches keeps a separate role in each');
    // The case memberships exist for: one login, two parishes, different authority in each. The rights
    // screen of one church must change the role it governs and no other.
    await basePrisma.organizationMember.create({
      data: { organizationId: house.id, userId: probe.userId, roleId: await roleId('viewer'), isDefault: false },
    });
    const shared =
      data<Array<{ id: string; roleKey: string }>>(
        await call('GET', `/api/admin/users?q=${encodeURIComponent(PROBE_NAME)}`, houseToken),
      ) ?? [];
    check('the first church lists the account that serves it', shared.length === 1, `got ${shared.length}`);
    check('in the role it holds there, not the role it holds elsewhere', shared[0]?.roleKey === 'viewer', `got ${shared[0]?.roleKey}`);

    const changed =
      shared[0] === undefined
        ? null
        : await call('POST', `/api/admin/users/${shared[0].id}/role`, houseToken, { roleKey: 'staff' });
    check('changing that role is allowed', changed !== null && changed.status < 300, changed ? errorMessage(changed) : 'not listed');
    const probeMe = data<{ user: { roleKey: string } }>(await call('GET', '/api/auth/me', probeToken));
    check(
      'and the second church’s role for the same account is untouched',
      probeMe?.user.roleKey === 'admin',
      `got ${probeMe?.user.roleKey}`,
    );
  } finally {
    // The run also writes into the seeded church: the probe account's refusals and the role it was
    // given there. Those rows name the probe, so they go with it — a check that only passes on a
    // database nobody has touched is worth very little.
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL],
      residualAudit: {
        organizationId: house.id,
        mentions: [PROBE_NAME, PROBE_EMAIL, 'isolation-probe'],
      },
    });
    console.log('\nThe probe church and its rows were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} isolation checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nIsolation test could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
