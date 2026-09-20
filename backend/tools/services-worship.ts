import { basePrisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { provisionChurch, removeChurch, roleId } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The services and worship domain, checked against the running API.
 *
 * Every claim the four screens in that tab make is asserted here: that a service is scheduled with its
 * kind and refused when the room is already taken at that hour; that the order of service is stored in
 * the order it was sent, and that moving an item moves it; that a volunteer is refused a second duty
 * in the same role at the same service; that only the holder may ask for cover, that only an
 * administrator may decide, and that approving moves the duty; that a census is revised rather than
 * counted twice while a named visitor survives the revision; that a report can be signed off, is then
 * read-only to staff and revisable by an administrator; and that another church can reach none of it.
 *
 * It runs inside a **probe church of its own**, so the seeded church's calendar is not filled with
 * probe services and the cleanup is the sweep in `lib/provision` — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/services-worship.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'worship-probe-church';
const PROBE_EMAIL = 'probe-warden@worship.test';
const PROBE_PASSWORD = 'worship-probe-password';
const PROBE_NAME = 'Worship Probe Warden';
const VOLUNTEER_EMAIL = 'probe-volunteer@worship.test';
const COVER_EMAIL = 'probe-cover@worship.test';
const VOLUNTEER_PASSWORD = 'probe-volunteer-password';

/** A Sunday a good way out, so nothing here depends on the day the check runs. */
const SUNDAY = '2026-11-01';
const LATER = '2026-11-15';

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

/** The swap list is a bare `{ data }` with no page under it: the open requests are the whole answer. */
function bareList<T>(answer: Answer): T[] {
  return (answer.body as { data?: T[] } | null)?.data ?? [];
}

interface LiturgyRow {
  id: string;
  position: number;
  title: string;
  kind: string;
  durationMinutes: number | null;
  responsible: string | null;
  ministryId: string | null;
  notes: string | null;
}

interface ServiceRow {
  id: string;
  title: string;
  kind: string;
  heldAt: string;
  startTime: string | null;
  venue: string;
  isTemplate: boolean;
  officiantId: string | null;
  liturgy?: LiturgyRow[];
  _count?: { liturgy: number; attendance: number; roster: number };
}

interface DutyRow {
  id: string;
  memberId: string;
  roleTitle: string;
  status: string;
  holder?: { firstName: string; lastName: string } | null;
}

interface SwapRow {
  id: string;
  dutyId: string;
  status: string;
  replacementId: string | null;
  decidedById: string | null;
  reason: string | null;
}

interface CensusSummary {
  serviceId: string;
  attendanceRows: number;
  totalCounted: number;
  namedMembers: number;
  namedVisitors: number;
  byKind: Record<string, number>;
}

interface ReportRow {
  id: string;
  summary: string;
  adultsCount: number | null;
  childrenCount: number | null;
  visitorsCount: number | null;
  offeringsTotal: number | null;
  finalizedAt: string | null;
}

async function signIn(email: string, password: string): Promise<string> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? '';
}

/**
 * A login for somebody on the register.
 *
 * `requestSwap` refuses anybody but the duty's holder, and the server can only know who is asking when
 * the account is linked to a member record — so the two probe volunteers are linked, which is also how
 * a real church gives a volunteer a login. `User.memberId` is what makes that possible.
 */
async function provisionVolunteer(input: {
  organizationId: string;
  memberId: string;
  name: string;
  email: string;
}): Promise<void> {
  const staffRoleId = await roleId('staff');
  await basePrisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(VOLUNTEER_PASSWORD),
      roleId: staffRoleId,
      memberId: input.memberId,
      memberships: { create: { organizationId: input.organizationId, roleId: staffRoleId, isDefault: true } },
    },
  });
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 5, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Worship Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const token = await signIn(PROBE_EMAIL, PROBE_PASSWORD);
  check('its warden can sign in', token.length > 0);

  // The seeded church signs in too, so the last sections can prove the probe's calendar never touched
  // it and that it cannot reach the probe's rows.
  const houseToken = await signIn(
    process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
    process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
  );
  check('the seeded church can sign in', houseToken.length > 0);
  const houseOrgId =
    data<{ organization: { id: string } }>(await call('GET', '/api/auth/me', houseToken))?.organization.id ?? '';
  const houseBefore = listOf<ServiceRow>(await call('GET', '/api/services?pageSize=50', houseToken))?.total ?? -1;

  // Two volunteers, each with a register record: one to hold a duty, one to be named as cover.
  const holder = data<{ id: string; firstName: string }>(
    await call('POST', '/api/members', token, { firstName: 'Mercy', lastName: 'Nyambura', location: 'Probe Congregation' }),
  );
  const cover = data<{ id: string; firstName: string }>(
    await call('POST', '/api/members', token, { firstName: 'Peter', lastName: 'Ochieng', location: 'Probe Congregation' }),
  );
  check('two volunteers are enrolled', Boolean(holder?.id) && Boolean(cover?.id));

  await provisionVolunteer({ organizationId: probe.organizationId, memberId: holder!.id, name: 'Mercy Nyambura', email: VOLUNTEER_EMAIL });
  await provisionVolunteer({ organizationId: probe.organizationId, memberId: cover!.id, name: 'Peter Ochieng', email: COVER_EMAIL });
  const holderToken = await signIn(VOLUNTEER_EMAIL, VOLUNTEER_PASSWORD);
  const coverToken = await signIn(COVER_EMAIL, VOLUNTEER_PASSWORD);
  check('and each can sign in as themselves', holderToken.length > 0 && coverToken.length > 0);

  try {
    console.log('\n2. A service is scheduled, and a taken room is refused');
    const scheduled = await call('POST', '/api/services', token, {
      title: 'Probe Lord’s Day Worship',
      kind: 'midweek',
      heldAt: SUNDAY,
      startTime: '6:30 PM',
      venue: 'Probe Sanctuary',
      theme: 'The Vine and the Branches',
      officiantId: holder?.id,
    });
    const service = data<ServiceRow>(scheduled);
    check('scheduling succeeds', scheduled.status === 201, errorOf(scheduled));
    check('the kind of gathering is stored', service?.kind === 'midweek', service?.kind ?? 'none');
    check('the time of day is kept as it was written', service?.startTime === '6:30 PM', service?.startTime ?? 'none');
    check('the officiant is on the register', service?.officiantId === holder?.id);

    const refusedTime = await call('POST', '/api/services', token, {
      title: 'Probe Typo Service',
      heldAt: SUNDAY,
      startTime: 'half past six',
      venue: 'Probe Sanctuary',
    });
    check('a time nobody can read is refused', refusedTime.status === 400, `got ${refusedTime.status}`);

    const clash = await call('POST', '/api/services', token, {
      title: 'Probe Double Booking',
      heldAt: SUNDAY,
      startTime: '6:30 PM',
      venue: 'probe sanctuary',
    });
    check('the same room at the same hour is refused', clash.status === 409, `got ${clash.status}`);
    check('and the refusal names the service already there', errorOf(clash).includes('Probe Lord’s Day'), errorOf(clash));

    const otherDay = await call('POST', '/api/services', token, {
      title: 'Probe Evening Service',
      heldAt: LATER,
      startTime: '6:30 PM',
      venue: 'Probe Sanctuary',
    });
    check('the same hour on another day is fine', otherDay.status === 201, errorOf(otherDay));
    const spare = data<ServiceRow>(otherDay);

    const calendar = listOf<ServiceRow>(await call('GET', '/api/services?pageSize=50', token));
    check('the calendar lists it', (calendar?.data ?? []).some((row) => row.id === service?.id));
    check('and lists nothing belonging to the other church', (calendar?.data ?? []).every((row) => row.title.startsWith('Probe')));

    const readBack = data<ServiceRow>(await call('GET', `/api/services/${service?.id}`, token));
    check('reading it back keeps the officiant it was scheduled with', readBack?.officiantId === holder?.id, readBack?.officiantId ?? 'none');
    check('and starts with an empty order of service', readBack?.liturgy?.length === 0, String(readBack?.liturgy?.length));

    console.log('\n3. The order of service is stored in the order it was sent');
    const order = [
      { title: 'Call to Worship', kind: 'call_to_worship', durationMinutes: 10, responsible: 'Mercy Nyambura' },
      { title: 'Praise & Worship', kind: 'praise_worship', durationMinutes: 40, responsible: 'Peter Ochieng' },
      { title: 'Sermon', kind: 'sermon', durationMinutes: 35, responsible: 'Worship Probe Warden' },
      { title: 'Dismissal', kind: 'dismissal', durationMinutes: 5 },
    ];
    const written = await call('PUT', `/api/services/${service?.id}/liturgy`, token, { items: order });
    const liturgy = data<LiturgyRow[]>(written);
    check('the order is written', written.status === 200, errorOf(written));
    check(
      'and comes back in the order it was sent',
      (liturgy ?? []).map((row) => row.title).join(' → ') === order.map((row) => row.title).join(' → '),
      (liturgy ?? []).map((row) => row.title).join(' → '),
    );
    check('with positions that are the running order', (liturgy ?? []).every((row, index) => row.position === index + 1));
    check('and every element keeps its kind and its minutes', liturgy?.[1]?.kind === 'praise_worship' && liturgy[1]?.durationMinutes === 40);

    const reversed = [...order].reverse();
    const moved = data<LiturgyRow[]>(
      await call('PUT', `/api/services/${service?.id}/liturgy`, token, { items: reversed }),
    );
    check(
      'sending them the other way round moves them',
      (moved ?? []).map((row) => row.title).join(' → ') === reversed.map((row) => row.title).join(' → '),
      (moved ?? []).map((row) => row.title).join(' → '),
    );
    const back = data<LiturgyRow[]>(
      await call('PUT', `/api/services/${service?.id}/liturgy`, token, { items: order.slice(0, 3) }),
    );
    check('and taking one out leaves three', back?.length === 3, String(back?.length));
    check('a blank element is refused', (await call('PUT', `/api/services/${service?.id}/liturgy`, token, { items: [{ title: '' }] })).status === 400);

    console.log('\n4. The roster refuses the same person twice in the same role');
    const duty = data<DutyRow>(
      await call('POST', `/api/services/${service?.id}/roster`, token, {
        memberId: holder?.id,
        roleTitle: 'Welcome & Ushering Lead',
        status: 'scheduled',
      }),
    );
    check('a volunteer is rostered', Boolean(duty?.id) && duty?.status === 'scheduled');

    const twice = await call('POST', `/api/services/${service?.id}/roster`, token, {
      memberId: holder?.id,
      roleTitle: 'welcome & ushering lead',
    });
    check('the same volunteer in the same role is refused', twice.status === 409, `got ${twice.status}`);
    check('and the refusal names them', errorOf(twice).includes('Mercy Nyambura'), errorOf(twice));

    const secondRole = data<DutyRow>(
      await call('POST', `/api/services/${service?.id}/roster`, token, {
        memberId: holder?.id,
        roleTitle: 'Service Leader',
      }),
    );
    check('a second, different duty is allowed', Boolean(secondRole?.id));

    const otherPerson = await call('POST', `/api/services/${service?.id}/roster`, token, {
      memberId: cover?.id,
      roleTitle: 'Welcome & Ushering Lead',
    });
    check('and somebody else in that role is allowed', otherPerson.status === 201, errorOf(otherPerson));

    const roster = listOf<DutyRow>(await call('GET', `/api/services/roster?serviceId=${service?.id}`, token));
    check('the roster lists the service’s duties', roster?.total === 3, `got ${roster?.total}`);
    check('with the holder named rather than only their id', Boolean(roster?.data[0]?.holder?.firstName));

    console.log('\n5. A swap: the holder asks, an administrator decides, the duty moves');
    const notMine = await call('POST', `/api/services/roster/duty/${duty?.id}/swap`, coverToken, {
      reason: 'I would like that slot',
    });
    check('somebody who does not hold the duty cannot ask for its cover', notMine.status === 403, `got ${notMine.status}`);

    const unlinked = await call('POST', `/api/services/roster/duty/${duty?.id}/swap`, token, { reason: 'On their behalf' });
    check('nor can an office login ask on a volunteer’s behalf', unlinked.status === 409, `got ${unlinked.status}`);

    // Peter already holds the ushering lead, which is the role Mercy is asking to be covered in, so
    // approving this one would put the same person in the same role twice — the roster's own rule, and
    // the answer has to name him rather than name a database column.
    const asked = await call('POST', `/api/services/roster/duty/${duty?.id}/swap`, holderToken, {
      replacementId: cover?.id,
      reason: 'Travelling that weekend',
    });
    const swap = data<SwapRow>(asked);
    check('the holder can ask', asked.status === 201, errorOf(asked));
    check('and the request opens as requested', swap?.status === 'requested', swap?.status ?? 'none');

    const again = await call('POST', `/api/services/roster/duty/${duty?.id}/swap`, holderToken, { reason: 'Again' });
    check('a second open request on one duty is refused', again.status === 409, `got ${again.status}`);

    const staffDecision = await call('POST', `/api/services/swaps/${swap?.id}/decision`, coverToken, { decision: 'approved' });
    check('a volunteer cannot decide it', staffDecision.status === 403, `got ${staffDecision.status}`);

    const blocked = await call('POST', `/api/services/swaps/${swap?.id}/decision`, token, { decision: 'approved' });
    check('approving cover onto somebody who already holds that role is refused', blocked.status === 409, `got ${blocked.status}`);
    check('and the refusal names them', errorOf(blocked).includes('Peter Ochieng'), errorOf(blocked));
    const stillHers = listOf<DutyRow>(await call('GET', `/api/services/roster?serviceId=${service?.id}`, token))?.data.find(
      (row) => row.id === duty?.id,
    );
    check('the duty did not move', stillHers?.memberId === holder?.id, stillHers?.memberId ?? 'none');
    const declined = await call('POST', `/api/services/swaps/${swap?.id}/decision`, token, { decision: 'declined' });
    check('and the request is still open to be decided another way', declined.status === 200, `got ${declined.status}: ${errorOf(declined)}`);

    // The other duty Mercy holds is in a role Peter is free to take, so that swap goes through.
    const freeCover = data<SwapRow>(
      await call('POST', `/api/services/roster/duty/${secondRole?.id}/swap`, holderToken, {
        replacementId: cover?.id,
        reason: 'Away that weekend',
      }),
    );
    check('a swap onto a role the replacement does not hold can be asked for', Boolean(freeCover?.id));
    const decided = await call('POST', `/api/services/swaps/${freeCover?.id}/decision`, token, { decision: 'approved' });
    check('and an administrator can approve it', decided.status === 200, errorOf(decided));
    check(
      'the decision records who made it',
      typeof data<SwapRow>(decided)?.decidedById === 'string' && (data<SwapRow>(decided)?.decidedById ?? '').length > 0,
    );

    const movedDuty = listOf<DutyRow>(await call('GET', `/api/services/roster?serviceId=${service?.id}`, token))?.data.find(
      (row) => row.id === secondRole?.id,
    );
    check('the duty changed hands', movedDuty?.memberId === cover?.id, movedDuty?.memberId ?? 'none');
    check('and is scheduled again rather than left replaced', movedDuty?.status === 'scheduled', movedDuty?.status ?? 'none');

    const reDecided = await call('POST', `/api/services/swaps/${freeCover?.id}/decision`, token, { decision: 'declined' });
    check('deciding the same request twice is refused', reDecided.status === 409, `got ${reDecided.status}`);

    const approved = bareList<SwapRow>(await call('GET', '/api/services/swaps?status=approved', token));
    check('the swap list shows it as approved', approved.some((row) => row.id === freeCover?.id), `${approved.length} approved`);
    check(
      'and no longer among the open requests',
      bareList<SwapRow>(await call('GET', '/api/services/swaps?status=requested', token)).every((row) => row.id !== freeCover?.id),
    );

    console.log('\n6. A census is revised, not counted twice');
    const first = await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [
        { kind: 'service', count: 400, notes: 'Adults and youth' },
        { kind: 'service', count: 55, notes: 'Children' },
      ],
    });
    check('a census is recorded', first.status === 201, errorOf(first));
    const counted = data<CensusSummary>(await call('GET', `/api/services/${service?.id}/attendance`, token));
    check('and the summary adds it up', counted?.totalCounted === 455, String(counted?.totalCounted));
    check('across the rows it was written as', counted?.attendanceRows === 2, String(counted?.attendanceRows));

    await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [
        { kind: 'service', count: 402, notes: 'Adults and youth' },
        { kind: 'service', count: 58, notes: 'Children' },
      ],
    });
    const revised = data<CensusSummary>(await call('GET', `/api/services/${service?.id}/attendance`, token));
    check('recording it again revises the figure rather than doubling it', revised?.totalCounted === 460, String(revised?.totalCounted));
    check('and leaves two rows, not four', revised?.attendanceRows === 2, String(revised?.attendanceRows));

    const visitor = await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [{ kind: 'service', count: 1, visitorName: 'Achieng Otieno', notes: 'First visit' }],
    });
    check('a first-time visitor is recorded by name', visitor.status === 201, errorOf(visitor));
    const withVisitor = data<CensusSummary>(await call('GET', `/api/services/${service?.id}/attendance`, token));
    check('and counted as a visitor rather than as a crowd', withVisitor?.namedVisitors === 1 && withVisitor?.totalCounted === 461, String(withVisitor?.totalCounted));

    await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [
        { kind: 'service', count: 401, notes: 'Adults and youth' },
        { kind: 'service', count: 57, notes: 'Children' },
      ],
    });
    const afterRevision = data<CensusSummary>(await call('GET', `/api/services/${service?.id}/attendance`, token));
    check('revising the census leaves the named visitor alone', afterRevision?.namedVisitors === 1, String(afterRevision?.namedVisitors));
    check('with the total counting them once', afterRevision?.totalCounted === 459, String(afterRevision?.totalCounted));

    const named = await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [{ kind: 'service', count: 1, memberId: holder?.id, notes: 'Present' }],
    });
    check('a member is marked present', named.status === 201, errorOf(named));
    const namedTwice = await call('POST', `/api/services/${service?.id}/attendance`, token, {
      rows: [{ kind: 'service', count: 1, memberId: holder?.id }],
    });
    check('and cannot be counted at the same service twice', namedTwice.status === 409, `got ${namedTwice.status}`);

    console.log('\n7. The report can be signed off, and is then read-only to staff');
    const filed = await call('PUT', `/api/services/${service?.id}/report`, coverToken, {
      summary: 'A quiet midweek service with the choir leading and three first-time visitors received.',
      adultsCount: 401,
      childrenCount: 57,
      visitorsCount: 1,
      offeringsTotal: 12450.5,
    });
    check('staff can write the report', filed.status === 200, errorOf(filed));
    check('and the money is kept exactly as keyed', data<ReportRow>(filed)?.offeringsTotal === 12450.5, String(data<ReportRow>(filed)?.offeringsTotal));
    check('it is not signed off yet', data<ReportRow>(filed)?.finalizedAt === null);

    check('staff cannot sign it off', (await call('POST', `/api/services/${service?.id}/report/finalize`, coverToken)).status === 403);

    const signed = await call('POST', `/api/services/${service?.id}/report/finalize`, token);
    check('an administrator can sign it off', signed.status === 200, errorOf(signed));
    const signedAt = data<ReportRow>(signed)?.finalizedAt ?? null;
    check('and the signature is dated', Boolean(signedAt));

    const revisedByStaff = await call('PUT', `/api/services/${service?.id}/report`, coverToken, {
      summary: 'Rewriting what the office filed, quietly.',
    });
    check('staff cannot revise a signed-off report', revisedByStaff.status === 409, `got ${revisedByStaff.status}`);
    check('and the refusal says why', errorOf(revisedByStaff).includes('signed off'), errorOf(revisedByStaff));

    const revisedByAdmin = await call('PUT', `/api/services/${service?.id}/report`, token, {
      summary: 'A quiet midweek service with the choir leading, and the offering figure corrected to the banked total.',
      offeringsTotal: 12450.5,
    });
    check('an administrator can revise it', revisedByAdmin.status === 200, errorOf(revisedByAdmin));
    check('and revising it does not unsign the service', data<ReportRow>(revisedByAdmin)?.finalizedAt === signedAt);

    const reSigned = await call('POST', `/api/services/${service?.id}/report/finalize`, token);
    check('signing off again keeps the original date', data<ReportRow>(reSigned)?.finalizedAt === signedAt, data<ReportRow>(reSigned)?.finalizedAt ?? 'none');
    check(
      'and revising a signed-off report is itself in the record',
      data<{ audit: Array<{ summary: string }> }>(
        await call('GET', `/api/admin/audit/ServiceReport/${data<ReportRow>(reSigned)?.id}`, token),
      )?.audit.some((line) => line.summary.includes('revising a signed-off report')) ?? false,
    );

    const unsigned = await call('POST', `/api/services/${spare?.id}/report/finalize`, token);
    check('a service with no report cannot be signed off', unsigned.status === 409, `got ${unsigned.status}`);

    console.log('\n8. A service is retired to the Trash, and comes back');
    check('staff cannot retire a service', (await call('DELETE', `/api/services/${spare?.id}?reason=duplicate&reasonLabel=Booked%20twice`, coverToken)).status === 403);

    const retired = await call(
      'DELETE',
      `/api/services/${spare?.id}?reason=duplicate&reasonLabel=${encodeURIComponent('Entered twice for the same evening')}`,
      token,
    );
    check('an administrator can retire it', retired.status < 300, errorOf(retired));
    check(
      'it leaves the calendar',
      (listOf<ServiceRow>(await call('GET', '/api/services?pageSize=50', token))?.data ?? []).every((row) => row.id !== spare?.id),
    );

    const trash = listOf<{ id: string; entityId: string; reasonLabel: string; entityName: string }>(
      await call('GET', '/api/admin/trash?pageSize=100', token),
    );
    const inTrash = (trash?.data ?? []).find((row) => row.entityId === spare?.id);
    check('it is in the Trash', Boolean(inTrash));
    check('with the reason its clerk gave kept beside it', (inTrash?.reasonLabel ?? '').includes('Entered twice'), inTrash?.reasonLabel ?? 'none');

    if (inTrash) {
      check('it can be put back', (await call('POST', `/api/admin/trash/${inTrash.id}/restore`, token, {})).status < 300);
      check(
        'and returns to the calendar',
        (listOf<ServiceRow>(await call('GET', '/api/services?pageSize=50', token))?.data ?? []).some((row) => row.id === spare?.id),
      );
    }

    console.log('\n9. The record keeps its own history');
    const history = data<{ audit: Array<{ action: string; summary: string }> }>(
      await call('GET', `/api/admin/audit/Service/${service?.id}`, token),
    );
    const summaries = (history?.audit ?? []).map((line) => line.summary);
    check('the service has a history', summaries.length > 0, `${summaries.length} lines`);
    check('the scheduling is in it', summaries.some((line) => line.includes('Probe Lord’s Day')), summaries.join(' | '));
    check('the order of service is in it', summaries.some((line) => line.includes('order of service')), summaries.join(' | '));
    check('staff cannot read the audit trail', (await call('GET', '/api/admin/audit', coverToken)).status === 403);

    console.log('\n10. Another church can reach none of it');
    check('reading the service by id is refused', (await call('GET', `/api/services/${service?.id}`, houseToken)).status === 404);
    check(
      'changing it is refused',
      (await call('PATCH', `/api/services/${service?.id}`, houseToken, { title: 'Taken over' })).status === 404,
    );
    check(
      'retiring it is refused',
      (await call('DELETE', `/api/services/${service?.id}?reason=other&reasonLabel=Not%20mine`, houseToken)).status === 404,
    );
    check('its census is refused', (await call('GET', `/api/services/${service?.id}/attendance`, houseToken)).status === 404);
    check('its report is refused', (await call('GET', `/api/services/${service?.id}/report`, houseToken)).status === 404);
    check('its history is refused', (await call('GET', `/api/admin/audit/Service/${service?.id}`, houseToken)).status === 404);
    check(
      'its roster comes back empty rather than filtered',
      (listOf<DutyRow>(await call('GET', `/api/services/roster?serviceId=${service?.id}`, houseToken))?.total ?? -1) === 0,
    );
    const houseAfter = listOf<ServiceRow>(await call('GET', '/api/services?pageSize=50', houseToken))?.total ?? -2;
    check('and the probe’s calendar never entered the other church’s list', houseAfter === houseBefore, `${houseBefore} → ${houseAfter}`);
    check(
      'nor did the probe’s duty appear in its roster',
      (listOf<DutyRow>(await call('GET', '/api/services/roster', houseToken))?.data ?? []).every((row) => row.id !== duty?.id),
    );
  } finally {
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL, VOLUNTEER_EMAIL, COVER_EMAIL],
      // The refusals in the last sections were written into the *seeded* church's log and name the probe.
      residualAudit: {
        organizationId: houseOrgId,
        mentions: [PROBE_NAME, PROBE_EMAIL, 'Probe Lord’s Day Worship', 'Probe Sanctuary'],
      },
    });
    console.log('\nThe probe church, its calendar and its rows were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} services & worship checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nServices & worship check could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
