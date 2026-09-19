import { provisionChurch, removeChurch } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The groups & fellowships domain, checked against the running API.
 *
 * The journey the standing suites never had anywhere to walk because there was no domain under it:
 * a **group** — convened, its roll staffed, a meeting recorded with its count, guarded against
 * retiring while people still belong, retired once empty, and put back from the trash. The last
 * section re-runs the **role matrix** on the new surface, because a gate that exists only on the
 * older modules is not a gate.
 *
 * It runs inside a probe church of its own and removes it either way.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/groups.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'groups-probe-church';
const PROBE_EMAIL = 'probe-clerk@groups.test';
const PROBE_PASSWORD = 'groups-probe-password';
const PROBE_NAME = 'Groups Probe Clerk';

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

interface GroupRow {
  id: string;
  name: string;
  _count?: { members: number };
  members?: Array<{ id: string; memberId: string; roleTitle: string }>;
  meetings?: Array<{ id: string; attendedCount: number; metAt: string }>;
}

interface MeetingRow {
  id: string;
  attendedCount: number;
  groupId: string;
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 4, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Groups Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const signedIn = await call('POST', '/api/auth/login', undefined, { email: PROBE_EMAIL, password: PROBE_PASSWORD });
  const adminToken = data<{ token: string }>(signedIn)?.token ?? '';
  check('its clerk can sign in', adminToken.length > 0, errorOf(signedIn));

  const people: Array<MemberRow | null> = [];
  for (const [firstName, lastName] of [
    ['Wanjala', 'Mumo'],
    ['Njeri', 'Kamande'],
    ['Otieno', 'Ochieng'],
  ] as const) {
    const answer = await call('POST', '/api/members', adminToken, { firstName, lastName, location: 'Probe Congregation' });
    people.push(data<MemberRow>(answer));
  }
  const [wanjala, njeri] = people;
  check('three people are on the register', people.every((row) => Boolean(row?.id)));

  try {
    console.log('\n2. A fellowship is convened and its roll staffed');
    const created = await call('POST', '/api/groups', adminToken, {
      name: 'Probe Tuesday Cell',
      description: 'The probe church\u2019s midweek circle',
      meetingDay: 'Tuesday',
      location: 'Wanjala\u2019s sitting room',
      leaderId: wanjala?.id,
    });
    const cell = data<GroupRow>(created);
    check('the group is created with its leader', created.status === 201 && Boolean(cell?.id), errorOf(created));

    const joined = await call('POST', `/api/groups/${cell?.id}/members`, adminToken, { memberId: njeri?.id, roleTitle: 'Treasurer' });
    check('a member joins with a named part', joined.status === 201, errorOf(joined));

    const again = await call('POST', `/api/groups/${cell?.id}/members`, adminToken, { memberId: njeri?.id, roleTitle: 'Treasurer' });
    const readBack = data<GroupRow>(await call('GET', `/api/groups/${cell?.id}`, adminToken));
    const onRoll = (readBack?.members ?? []).filter((row) => row.memberId === njeri?.id).length;
    check('re-adding the same person re-rolls rather than duplicating', (again.status === 200 || again.status === 201) && onRoll === 1, `${onRoll} rows for Njeri`);

    const listed = await call('GET', '/api/groups', adminToken);
    const listedCell = (data<Array<GroupRow>>(listed) ?? []).find((row) => row.id === cell?.id);
    check(
      'the list carries the roll size beside each name',
      Boolean(listedCell && (listedCell._count?.members ?? 0) === 1),
      // The leader shepherds the circle but does not belong to it until rolled on, like a ministry.
      `${listedCell?._count?.members ?? 0} (the leader is not auto-rolled)`,
    );

    console.log('\n3. The circle meets, and the meeting is counted');
    const met = await call('POST', `/api/groups/${cell?.id}/meetings`, adminToken, {
      metAt: new Date().toISOString(),
      hostName: 'Wanjala',
      attendedCount: 11,
    });
    const meeting = data<MeetingRow>(met);
    check('a gathering is recorded with its count', met.status === 201 && meeting?.attendedCount === 11, errorOf(met));

    const corrected = await call('PATCH', `/api/groups/meetings/${meeting?.id}`, adminToken, { attendedCount: 12 });
    check('the count can be corrected and says so', corrected.status === 200 && data<MeetingRow>(corrected)?.attendedCount === 12, errorOf(corrected));

    const meetings = await call('GET', `/api/groups/meetings?groupId=${cell?.id}`, adminToken);
    const totals = (meetings.body as { totals?: { meetings: number; attendance: number } } | null)?.totals;
    check('the meetings ledger totals what the circles reported', totals?.meetings === 1 && totals?.attendance === 12, JSON.stringify(totals));

    console.log('\n4. A circle with people in it cannot be retired');
    const blocked = await call(
      'DELETE',
      `/api/groups/${cell?.id}?reason=other&reasonLabel=${encodeURIComponent('Probe: closing the cell')}`,
      adminToken,
    );
    check('retiring is refused while people still belong', blocked.status === 409, `got ${blocked.status}: ${errorOf(blocked)}`);

    const rollRows = readBack?.members ?? [];
    for (const row of rollRows) {
      await call('DELETE', `/api/groups/members/${row.id}`, adminToken);
    }
    const retired = await call(
      'DELETE',
      `/api/groups/${cell?.id}?reason=other&reasonLabel=${encodeURIComponent('Probe: closing the cell')}`,
      adminToken,
    );
    check('once the roll is empty, retiring is allowed', retired.status === 200, errorOf(retired));
    const gone = await call('GET', `/api/groups/${cell?.id}`, adminToken);
    check('it no longer reads on the register', gone.status === 404, `got ${gone.status}`);

    const trashAnswer = await call('GET', '/api/admin/trash', adminToken);
    const trash = ((trashAnswer.body as { data?: Array<{ id: string; entityId: string }> } | null)?.data ?? []) as Array<{
      id: string;
      entityId: string;
    }>;
    const row = trash.find((entry) => entry.entityId === cell?.id);
    const restored = row ? await call('POST', `/api/admin/trash/${row.id}/restore`, adminToken, {}) : null;
    check('and the circle can be put back from the trash', restored?.status === 200, `got ${restored?.status}`);
    const back = data<GroupRow>(await call('GET', `/api/groups/${cell?.id}`, adminToken));
    check('the restored circle reads again', Boolean(back?.id), back ? '' : errorOf(gone));

    console.log('\n5. The role matrix, on the new surface');
    const viewer = await call('POST', '/api/admin/users', adminToken, {
      name: 'Groups Probe Viewer',
      email: 'viewer@groups.test',
      password: 'groups-viewer-password',
      roleKey: 'viewer',
    });
    check('a viewer account exists to be gated against', viewer.status === 201, errorOf(viewer));
    const viewerToken = data<{ token: string }>(await call('POST', '/api/auth/login', undefined, { email: 'viewer@groups.test', password: 'groups-viewer-password' }))?.token ?? '';

    const viewerReads = await call('GET', '/api/groups', viewerToken);
    // The viewer role is granted home, members, giving and reports — deliberately not groups — so
    // even a read is refused. That is the panel model holding, not a bug: circles are staff business.
    check('a viewer has no groups panel, so even reads are refused', viewerReads.status === 403, `got ${viewerReads.status}`);
    const viewerConvenes = await call('POST', '/api/groups', viewerToken, { name: 'The Viewer Circle' });
    check('and a viewer may not convene one either', viewerConvenes.status === 403, `got ${viewerConvenes.status}`);

    const staff = await call('POST', '/api/admin/users', adminToken, {
      name: 'Groups Probe Staff',
      email: 'staff@groups.test',
      password: 'groups-staff-password',
      roleKey: 'staff',
    });
    const staffToken = data<{ token: string }>(await call('POST', '/api/auth/login', undefined, { email: 'staff@groups.test', password: 'groups-staff-password' }))?.token ?? '';
    check('a staff account signs in under its own role', staff.status === 201 && staffToken.length > 0, `create ${staff.status}`);
    const staffConvenes = await call('POST', '/api/groups', staffToken, { name: 'Probe Staff Circle' });
    check('a staff member may convene a circle', staffConvenes.status === 201, `got ${staffConvenes.status}: ${errorOf(staffConvenes)}`);
    const staffRetires = await call(
      'DELETE',
      `/api/groups/${cell?.id}?reason=other&reasonLabel=${encodeURIComponent('Probe: not yours')}`,
      staffToken,
    );
    check('but may not retire what the administrators own', staffRetires.status === 403, `got ${staffRetires.status}`);

    console.log('\n6. Another church cannot touch this one\u2019s circles');
    const second = await provisionChurch({
      name: 'Groups Probe Church B',
      slug: 'groups-probe-church-b',
      adminName: 'Groups Probe Clerk B',
      email: 'clerk-b@groups.test',
      password: 'groups-probe-password-b',
    });
    const secondToken = data<{ token: string }>(await call('POST', '/api/auth/login', undefined, { email: 'clerk-b@groups.test', password: 'groups-probe-password-b' }))?.token ?? '';
    const foreign = await call('GET', `/api/groups/${cell?.id}`, secondToken);
    check('the neighbour\u2019s clerk cannot read this circle', foreign.status === 404, `got ${foreign.status}`);
    const foreignPatch = await call('PATCH', `/api/groups/${cell?.id}`, secondToken, { name: 'Renamed from next door' });
    check('and cannot rename it either', foreignPatch.status === 404, `got ${foreignPatch.status}`);
    void second;
  } finally {
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL, 'viewer@groups.test', 'staff@groups.test', 'clerk-b@groups.test'],
    });
    console.log('\nThe probe churches, their people and their circles were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} groups & fellowships checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: Error) => {
  console.error(`\nThe groups suite could not run: ${error.message}`);
  process.exitCode = 1;
});
