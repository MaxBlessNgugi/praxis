import { provisionChurch, removeChurch } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The people domain, checked against the running API.
 *
 * Two journeys the standing suites only touch in passing: a **household** — created, two people
 * joined to it, a head set, retired and put back — and a **ministry** — created, staffed, its roll
 * read, guarded against retiring while people still serve, then retired once they are off it. The
 * last section is the **role matrix**: a viewer who may read but not write, and a staff member who
 * may write but not retire — the two boundaries the console's own buttons claim.
 *
 * It runs inside a probe church of its own and removes it either way.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/people.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'people-probe-church';
const PROBE_EMAIL = 'probe-clerk@people.test';
const PROBE_PASSWORD = 'people-probe-password';
const PROBE_NAME = 'People Probe Clerk';

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

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
}

interface HouseholdRow {
  id: string;
  name: string;
  members?: Array<{ id: string; memberId: string; householdRole: string; isHouseholdHead: boolean }>;
}

interface MinistryRow {
  id: string;
  name: string;
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 3, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'People Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const signedIn = await call('POST', '/api/auth/login', undefined, { email: PROBE_EMAIL, password: PROBE_PASSWORD });
  const adminToken = data<{ token: string }>(signedIn)?.token ?? '';
  check('its clerk can sign in', adminToken.length > 0, errorOf(signedIn));

  // Two people for the household, one more for the ministry roll.
  const family: Array<MemberRow | null> = [];
  for (const [firstName, lastName] of [['Joseph', 'Wanjiru'], ['Mary', 'Wanjiru'], ['Peter', 'Kamau']] as const) {
    const answer = await call('POST', '/api/members', adminToken, { firstName, lastName, location: 'Probe Congregation' });
    family.push(data<MemberRow>(answer));
  }
  const [joseph, mary, peter] = family;
  check('three people are on the register', family.every((row) => Boolean(row?.id)));

  try {
    console.log('\n2. A household is created, staffed and headed');
    const household = await call('POST', '/api/households', adminToken, {
      name: 'The Wanjiru Home',
      unitNumber: 'U-12',
      location: 'Probe Congregation',
    });
    const home = data<HouseholdRow>(household);
    check('the household is created', household.status === 201, errorOf(household));

    const head = await call('POST', `/api/households/${home?.id}/members`, adminToken, {
      memberId: joseph?.id,
      householdRole: 'Head',
      makeHead: true,
    });
    check('the first member joins as its head', head.status === 200 || head.status === 201, errorOf(head));

    const spouse = await call('POST', `/api/households/${home?.id}/members`, adminToken, {
      memberId: mary?.id,
      householdRole: 'Spouse',
    });
    check('a second member joins with her own relationship', spouse.status === 200 || spouse.status === 201, errorOf(spouse));

    // The household's member rows are the register rows themselves: `id` is the person, while
    // `memberId` is their register number — so the lookups below key on `id`.
    const readBack = data<HouseholdRow>(await call('GET', `/api/households/${home?.id}`, adminToken));
    const roles = new Map((readBack?.members ?? []).map((row) => [row.id, row]));
    check(
      'reading it back shows both people and their relationships',
      roles.get(joseph?.id ?? '')?.householdRole === 'Head' && roles.get(mary?.id ?? '')?.householdRole === 'Spouse',
      JSON.stringify(readBack?.members?.map((row) => row.householdRole) ?? []),
    );

    const otherHead = await call('POST', `/api/households/${home?.id}/head`, adminToken, { memberId: mary?.id });
    const afterSwap = data<HouseholdRow>(await call('GET', `/api/households/${home?.id}`, adminToken));
    const swapped = new Map((afterSwap?.members ?? []).map((row) => [row.id, row.isHouseholdHead]));
    check(
      'headship moves, and moves off the one who held it',
      otherHead.status === 200 && swapped.get(mary?.id ?? '') === true && swapped.get(joseph?.id ?? '') === false,
      errorOf(otherHead),
    );    console.log('\n3. The household is emptied, retired, and put back');
    // A household with people still in it is refused — the register never strands a person under a
    // deleted roof — so the two are moved out first, which is also what retires *with* integrity.
    const blocked = await call(
      'DELETE',
      `/api/households/${home?.id}?reason=wrong_entry&reasonLabel=${encodeURIComponent('Probe: wrong address keyed')}`,
      adminToken,
    );
    check('retiring with people still inside is refused', blocked.status === 409, `got ${blocked.status}: ${errorOf(blocked)}`);
    for (const person of [joseph, mary]) {
      await call('DELETE', `/api/households/${home?.id}/members/${person?.id}`, adminToken);
    }
    const retired = await call(
      'DELETE',
      `/api/households/${home?.id}?reason=wrong_entry&reasonLabel=${encodeURIComponent('Probe: wrong address keyed')}`,
      adminToken,
    );
    check('and an emptied household retires cleanly', retired.status === 200, errorOf(retired));
    const gone = await call('GET', `/api/households/${home?.id}`, adminToken);
    check('it no longer reads on the roll', gone.status === 404, `got ${gone.status}`);

    const trashAnswer = await call('GET', '/api/admin/trash', adminToken);
    const trash = ((trashAnswer.body as { data?: Array<{ id: string; entityId: string }> } | null)?.data ?? []) as Array<{
      id: string;
      entityId: string;
    }>;
    const row = trash.find((entry) => entry.entityId === home?.id);
    const restored = row ? await call('POST', `/api/admin/trash/${row.id}/restore`, adminToken, {}) : null;
    check('and it can be put back from the trash', restored?.status === 200, `got ${restored?.status}`);
    const back = data<HouseholdRow>(await call('GET', `/api/households/${home?.id}`, adminToken));
    check('the restored household reads again', Boolean(back?.id), `${(back?.members ?? []).length} members (its people were moved out first)`);

    console.log('\n4. A ministry is created, staffed and read');
    const ministry = await call('POST', '/api/ministries', adminToken, {
      name: 'Probe Sanctuary Choir',
      meetingDay: 'Thursday',
      location: 'Probe Hall',
    });
    const choir = data<MinistryRow>(ministry);
    check('the ministry is created', ministry.status === 201, errorOf(ministry));

    const master = await call('POST', `/api/ministries/${choir?.id}/members`, adminToken, {
      memberId: peter?.id,
      roleTitle: 'Choir Master',
    });
    check('a member joins with a named role', master.status === 201, errorOf(master));
    const returned = await call('POST', `/api/ministries/${choir?.id}/members`, adminToken, {
      memberId: peter?.id,
      roleTitle: 'Choir Master',
    });
    const rollAnswer = await call('GET', `/api/ministries/${choir?.id}`, adminToken);
    const roll = ((rollAnswer.body as { data?: { members?: Array<{ id: string; memberId: string; roleTitle: string }> } } | null)?.data?.members ?? []) as Array<{
      id: string;
      memberId: string;
      roleTitle: string;
    }>;
    check(
      're-adding the same person re-rolls rather than duplicating',
      (returned.status === 200 || returned.status === 201) && roll.filter((entry) => entry.memberId === peter?.id).length === 1,
      `${roll.length} rows`,
    );
    void rollAnswer;

    const leadership = ((await call('GET', `/api/ministries/roster?ministryId=${choir?.id}&leadershipOnly=true`, adminToken)).body as {
      data?: Array<{ roleTitle: string }>;
    } | null)?.data ?? [];
    check('the leadership roster names the role, not just the person', (leadership ?? []).some((entry) => entry.roleTitle === 'Choir Master'), `${(leadership ?? []).length} rows`);

    console.log('\n5. A ministry with people on it cannot be retired');
    const ministryBlocked = await call(
      'DELETE',
      `/api/ministries/${choir?.id}?reason=cancelled&reasonLabel=${encodeURIComponent('Probe: closing the choir')}`, 
      adminToken,
    );
    check('retiring is refused while people still serve', ministryBlocked.status === 409, `got ${ministryBlocked.status}: ${errorOf(ministryBlocked)}`);

    const membershipId = roll[0] ? await firstMembershipId(adminToken, choir?.id ?? '') : null;
    if (membershipId) {
      const takenOff = await call('DELETE', `/api/ministries/members/${membershipId}`, adminToken);
      const unblocked = await call(
        'DELETE',
        `/api/ministries/${choir?.id}?reason=cancelled&reasonLabel=${encodeURIComponent('Probe: closing the choir')}`,
        adminToken,
      );
      check('once the roll is empty, retiring is allowed', (takenOff.status === 200 || takenOff.status === 204) && unblocked.status === 200, `${takenOff.status}, ${unblocked.status}`);
    }

    console.log('\n6. The role matrix: read, write, retire');
    const viewer = await call('POST', '/api/admin/users', adminToken, {
      name: 'People Probe Viewer',
      email: 'viewer@people.test',
      password: 'people-viewer-password',
      roleKey: 'viewer',
    });
    check('a viewer account exists to be gated against', viewer.status === 201, errorOf(viewer));
    const viewerToken = data<{ token: string }>(await call('POST', '/api/auth/login', undefined, { email: 'viewer@people.test', password: 'people-viewer-password' }))?.token ?? '';

    const viewerReads = await call('GET', '/api/households', viewerToken);
    check('a viewer may read the household roll', viewerReads.status === 200, `got ${viewerReads.status}`);
    const viewerWrites = await call('POST', '/api/households', viewerToken, {
      name: 'The Viewer House',
      unitNumber: 'V-1',
      location: 'Probe Congregation',
    });
    check('a viewer may not create one', viewerWrites.status === 403, `got ${viewerWrites.status}`);
    const viewerRetires = await call(
      'DELETE',
      `/api/households/${home?.id}?reason=other&reasonLabel=${encodeURIComponent('Probe: not yours')}`,
      viewerToken,
    );
    check('and may not retire one either', viewerRetires.status === 403, `got ${viewerRetires.status}`);

    const staff = await call('POST', '/api/admin/users', adminToken, {
      name: 'People Probe Staff',
      email: 'staff@people.test',
      password: 'people-staff-password',
      roleKey: 'staff',
    });
    const staffToken = data<{ token: string }>(await call('POST', '/api/auth/login', undefined, { email: 'staff@people.test', password: 'people-staff-password' }))?.token ?? '';
    check('a staff account signs in under its own role', staff.status === 201 && staffToken.length > 0, `create ${staff.status}`);
    const staffWrites = await call('POST', '/api/ministries', staffToken, { name: 'Probe Ushering Team' });
    check('a staff member may create in the register', staffWrites.status === 201, `got ${staffWrites.status}: ${errorOf(staffWrites)}`);
    const staffRetires = await call(
      'DELETE',
      `/api/households/${home?.id}?reason=other&reasonLabel=${encodeURIComponent('Probe: not yours')}`,
      staffToken,
    );
    check('but may not retire what the administrators own', staffRetires.status === 403, `got ${staffRetires.status}`);
  } finally {
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL, 'viewer@people.test', 'staff@people.test'],
    });
    console.log('\nThe probe church, its people and its rolls were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} people & ministries checks passed`);
  if (failed > 0) process.exitCode = 1;
}

async function firstMembershipId(token: string, ministryId: string): Promise<string | null> {
  const answer = data<Array<{ id: string; ministryId: string }>>(await call('GET', `/api/ministries/roster?ministryId=${ministryId}`, token));
  return answer?.[0]?.id ?? null;
}

main().catch((error: Error) => {
  console.error(`\nThe people suite could not run: ${error.message}`);
  process.exitCode = 1;
});
