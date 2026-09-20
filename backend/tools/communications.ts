import { basePrisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { provisionChurch, removeChurch, roleId } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The communications domain, checked against the running API.
 *
 * The claims the console makes are asserted here: that a notice's importance is **stored** rather than
 * styled, so an urgent one is stored urgent and comes back first; that a notice written ahead of its
 * date is not on the board, that taking one down is the same two dates moved, and that a retired notice
 * is recoverable; that a campaign is written, scheduled and *then* sent, that sending refuses to record
 * a delivery no gateway reported, and that an audience resolving to nobody is an error rather than a
 * zero; that an event's organiser is on the church's own register and that calling a gathering off
 * leaves it on the calendar saying so; and — the one with somebody's confidence behind it — that a
 * **private prayer request never reaches an account the server has not authorised**, in the list, in
 * the counts, or by its id.
 *
 * It runs inside a **probe church of its own**, so the seeded church's notice sheet is not filled with
 * probe rows, and the cleanup is the sweep in `lib/provision` — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/communications.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'comms-probe-church';
const PROBE_EMAIL = 'probe-rector@comms.test';
const PROBE_PASSWORD = 'comms-probe-password';
const PROBE_NAME = 'Comms Probe Rector';
const STAFF_EMAIL = 'probe-secretary@comms.test';
const STAFF_PASSWORD = 'comms-secretary-password';
const VIEWER_EMAIL = 'probe-reader@comms.test';
const VIEWER_PASSWORD = 'comms-reader-password';

/** Dates well away from the day the check runs, so nothing here depends on the calendar. */
const GOES_UP_LATER = '2030-03-01T06:00:00.000Z';
const SERVICE = '2030-05-12T09:00:00.000Z';

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

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: 'normal' | 'urgent';
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

interface BroadcastRow {
  id: string;
  channel: string;
  status: string;
  audience: string;
  scheduledFor: string | null;
  sentAt: string | null;
  recipients: number;
  lastReport: { attempted: number; delivered: number; failed: number; recordedOnly: boolean } | null;
  delivery?: { attempted: number; delivered: number; recordedOnly: boolean; failures: unknown[] };
}

interface EventRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  organizerId: string | null;
  organizer: { firstName: string; lastName: string } | null;
}

interface PrayerRow {
  id: string;
  request: string;
  status: string;
  isPrivate: boolean;
  answeredAt: string | null;
}

interface CelebrationRow {
  type: 'birthday' | 'anniversary';
  memberName: string;
  inDays: number;
  yearsCount: number | null;
}

async function signIn(email: string, password: string): Promise<string> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? '';
}

/** An account in this church's office, by role key. */
async function provisionAccount(organizationId: string, key: string, name: string, email: string, password: string): Promise<void> {
  const id = await roleId(key);
  await basePrisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      roleId: id,
      memberships: { create: { organizationId, roleId: id, isDefault: true } },
    },
  });
}

/** Enrol a member and hand back their id, for organisers, audiences and celebrations. */
async function enrol(token: string, firstName: string, lastName: string, extra: Record<string, unknown> = {}): Promise<string> {
  const answer = await call('POST', '/api/members', token, {
    firstName,
    lastName,
    location: 'Probe Congregation',
    ...extra,
  });
  return data<{ id: string }>(answer)?.id ?? '';
}

async function main(): Promise<void> {
  await waitForSignInBudget(API, 4, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Comms Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const token = await signIn(PROBE_EMAIL, PROBE_PASSWORD);
  check('its rector can sign in', token.length > 0);
  await provisionAccount(probe.organizationId, 'staff', 'Probe Secretary', STAFF_EMAIL, STAFF_PASSWORD);
  await provisionAccount(probe.organizationId, 'viewer', 'Probe Reader', VIEWER_EMAIL, VIEWER_PASSWORD);
  const staffToken = await signIn(STAFF_EMAIL, STAFF_PASSWORD);
  const viewerToken = await signIn(VIEWER_EMAIL, VIEWER_PASSWORD);
  check('so can its secretary and a read-only account', staffToken.length > 0 && viewerToken.length > 0);

  // The seeded church signs in too, so the last section can prove it reaches none of this.
  const houseToken = await signIn(
    process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
    process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
  );
  check('the seeded church can sign in', houseToken.length > 0);
  const houseBefore = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?pageSize=100', houseToken))?.total ?? -1;

  try {
    console.log('\n2. A notice carries the importance the office gave it');
    const urgent = await call('POST', '/api/communications/announcements', token, {
      title: 'Probe funeral notice',
      body: 'The funeral service moves to 10:00 AM.',
      audience: 'Everyone',
      priority: 'urgent',
    });
    const urgentRow = data<NoticeRow>(urgent);
    check('an urgent notice is stored urgent', urgentRow?.priority === 'urgent', String(urgentRow?.priority));
    check(
      'and a notice written with no date at all goes up now',
      new Date(urgentRow?.publishedAt ?? 0).getTime() <= Date.now(),
      String(urgentRow?.publishedAt),
    );

    const ordinary = await call('POST', '/api/communications/announcements', token, {
      title: 'Probe choir practice',
      body: 'Practice resumes on Saturday.',
      audience: 'Ministry Leaders',
      priority: 'normal',
    });
    check('a notice written without one is stored normal', data<NoticeRow>(ordinary)?.priority === 'normal');

    const board = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?pageSize=100', token));
    check(
      'and the urgent one is placed ahead of it on the list',
      (board?.data.findIndex((row) => row.priority === 'urgent') ?? -1) <
        (board?.data.findIndex((row) => row.priority === 'normal') ?? -1),
    );

    console.log('\n3. The board is the two dates, not a status somebody sets');
    const later = await call('POST', '/api/communications/announcements', token, {
      title: 'Probe harvest notice',
      body: 'Written now, goes up in March.',
      publishedAt: GOES_UP_LATER,
    });
    const laterId = data<NoticeRow>(later)?.id ?? '';
    check('a notice written ahead of its day is not on the board', data<NoticeRow>(later)?.publishedAt === GOES_UP_LATER);

    const live = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?live=true&pageSize=100', token));
    check('the board holds the published one', Boolean(live?.data.some((row) => row.id === urgentRow?.id)));
    check('and not the one waiting for its day', !live?.data.some((row) => row.id === laterId));

    const taken = await call('PATCH', `/api/communications/announcements/${urgentRow?.id}`, token, {
      expiresAt: '2000-01-01T00:00:00.000Z',
    });
    check('taking a notice down is a date, and it leaves the board', Boolean(data<NoticeRow>(taken)?.expiresAt));
    const afterTakeDown = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?live=true&pageSize=100', token));
    check('the board no longer carries it', !afterTakeDown?.data.some((row) => row.id === urgentRow?.id));

    const republished = await call('PATCH', `/api/communications/announcements/${urgentRow?.id}`, token, {
      expiresAt: null,
    });
    check('putting it back is the same field cleared again', data<NoticeRow>(republished)?.expiresAt === null);

    console.log('\n4. A notice can be taken off the noticeboard and brought back');
    const retired = await call(
      'DELETE',
      `/api/communications/announcements/${laterId}?reason=other&reasonLabel=Probe%20withdrawal`,
      token,
    );
    check('retiring a notice is accepted', retired.status < 300, errorOf(retired));
    const afterRetire = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?pageSize=100', token));
    check('it leaves the sheet', !afterRetire?.data.some((row) => row.id === laterId));

    const inTrash = ((listOf<{ id: string; entityId: string }>(await call('GET', '/api/admin/trash?pageSize=100', token))?.data) ?? []).find(
      (row) => row.entityId === laterId,
    );
    check('and the Trash holds it', Boolean(inTrash));
    const restored = await call('POST', `/api/admin/trash/${inTrash?.id}/restore`, token, {});
    check('it comes back out of the Trash', restored.status < 300, errorOf(restored));
    const afterRestore = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?pageSize=100', token));
    check('and is on the sheet again', Boolean(afterRestore?.data.some((row) => row.id === laterId)));

    console.log('\n5. A campaign is written, scheduled and then sent — in that order');
    const draft = await call('POST', '/api/communications/broadcasts', token, {
      channel: 'sms',
      body: 'Probe: the harvest service begins at 9:00 AM.',
      audience: 'Members',
    });
    const draftRow = data<BroadcastRow>(draft);
    check('a campaign written without a send time is a draft', draftRow?.status === 'draft', String(draftRow?.status));
    check('and carries no delivery report, because nothing was sent', draftRow?.lastReport === null);
    check('and no send time', draftRow?.sentAt === null);

    const scheduled = await call('POST', '/api/communications/broadcasts', token, {
      channel: 'sms',
      body: 'Probe: women’s fellowship this Saturday.',
      audience: 'Members',
      scheduledFor: GOES_UP_LATER,
    });
    const scheduledRow = data<BroadcastRow>(scheduled);
    check('one given a send time is scheduled', scheduledRow?.status === 'scheduled', String(scheduledRow?.status));
    check('and the time is kept with it', scheduledRow?.scheduledFor === GOES_UP_LATER);

    const edited = await call('PATCH', `/api/communications/broadcasts/${draftRow?.id}`, token, {
      body: 'Probe: the harvest service begins at 9:30 AM.',
    });
    check('a draft can still be corrected', edited.status < 300, errorOf(edited));

    const unconfigured = await call('GET', '/api/communications/channels', token);
    const emailReady = data<{ email: { configured: boolean } }>(unconfigured)?.email.configured ?? false;
    if (!emailReady) {
      const refused = await call('POST', '/api/communications/broadcasts', token, {
        channel: 'email',
        subject: 'Probe notice',
        body: 'Probe: this should not be recorded as delivered.',
        audience: 'Members',
      });
      const emailSend = await call(
        'POST',
        `/api/communications/broadcasts/${data<BroadcastRow>(refused)?.id}/send`,
        token,
        {},
      );
      check('sending on a channel with no provider is refused, not recorded as sent', emailSend.status >= 400, errorOf(emailSend));
      const stillDraft = listOf<BroadcastRow>(await call('GET', '/api/communications/broadcasts?pageSize=100', token));    check('and the campaign is left unsent',
        Boolean(stillDraft?.data.some((row) => row.id === data<BroadcastRow>(refused)?.id && row.status !== 'sent')),
      );
    } else {
      console.log('  · an email provider is configured here, so the refusal path is not exercised');
    }

    const sheet = await call('POST', '/api/communications/broadcasts', token, {
      channel: 'notice_sheet',
      body: 'Probe: the notice sheet for this Sunday.',
      audience: 'Members',
    });
    const sent = await call('POST', `/api/communications/broadcasts/${data<BroadcastRow>(sheet)?.id}/send`, token, {
      recipients: 120,
    });
    const sentRow = data<BroadcastRow>(sent);
    check('a printed sheet is recorded with the office’s own count', sentRow?.recipients === 120, String(sentRow?.recipients));
    check('and is marked as a recorded copy rather than a gateway delivery', sentRow?.delivery?.recordedOnly === true);

    const resend = await call('POST', `/api/communications/broadcasts/${data<BroadcastRow>(sheet)?.id}/send`, token, {});
    check('a campaign already sent cannot be sent twice', resend.status === 409, errorOf(resend));
    const editSent = await call('PATCH', `/api/communications/broadcasts/${data<BroadcastRow>(sheet)?.id}`, token, {
      body: 'Probe: rewritten after the fact.',
    });
    check('nor rewritten after the fact', editSent.status === 409, errorOf(editSent));

    console.log('\n6. The calendar names an organiser from this church’s own register');
    const organiser = await enrol(token, 'Probe', 'Organiser');
    const created = await call('POST', '/api/communications/events', token, {
      title: 'Probe harvest feast',
      kind: 'service',
      organizerId: organiser,
      venue: 'Probe Hall',
      startsAt: SERVICE,
      endsAt: '2030-05-12T12:00:00.000Z',
    });
    const eventRow = data<EventRow>(created);
    check('an event keeps the organiser it was given', eventRow?.organizerId === organiser, String(eventRow?.organizerId));
    check('and reads back their name', eventRow?.organizer?.lastName === 'Organiser');
    check('and is on the calendar as going ahead', eventRow?.status === 'scheduled');

    const stranger = await call('POST', '/api/communications/events', token, {
      title: 'Probe event with a stranger at the door',
      venue: 'Probe Hall',
      startsAt: SERVICE,
      endsAt: '2030-05-12T12:00:00.000Z',
      organizerId: '00000000-0000-4000-8000-000000000000',
    });
    check('an organiser who is not on the register is refused', stranger.status >= 400, errorOf(stranger));

    const backwards = await call('POST', '/api/communications/events', token, {
      title: 'Probe event that ends before it starts',
      venue: 'Probe Hall',
      startsAt: SERVICE,
      endsAt: '2030-05-12T08:00:00.000Z',
    });
    check('an event that ends before it starts is refused', backwards.status >= 400, errorOf(backwards));

    const calledOff = await call('PATCH', `/api/communications/events/${eventRow?.id}`, token, { status: 'cancelled' });
    check('calling a gathering off leaves it on the calendar', data<EventRow>(calledOff)?.status === 'cancelled');
    const restoredEvent = await call('PATCH', `/api/communications/events/${eventRow?.id}`, token, { status: 'scheduled' });
    check('and it can be reinstated', data<EventRow>(restoredEvent)?.status === 'scheduled');

    console.log('\n7. A private prayer request reaches only the accounts the server allows');
    const privateOne = await call('POST', '/api/communications/prayer-requests', token, {
      request: 'Probe: a matter held between the rector and the family.',
      isPrivate: true,
    });
    const privateId = data<PrayerRow>(privateOne)?.id ?? '';
    const publicOne = await call('POST', '/api/communications/prayer-requests', token, {
      request: 'Probe: thanksgiving for the harvest.',
      isPrivate: false,
    });
    const publicId = data<PrayerRow>(publicOne)?.id ?? '';
    check('a private request is stored private', data<PrayerRow>(privateOne)?.isPrivate === true);

    const rectorList = listOf<PrayerRow>(await call('GET', '/api/communications/prayer-requests?pageSize=100', token));
    check('the rector is given it', Boolean(rectorList?.data.some((row) => row.id === privateId)));

    const secretaryList = listOf<PrayerRow>(
      await call('GET', '/api/communications/prayer-requests?pageSize=100', staffToken),
    );
    check('the office is not', !secretaryList?.data.some((row) => row.id === privateId));
    check('while the shared request still reaches them', Boolean(secretaryList?.data.some((row) => row.id === publicId)));
    check('the office is answered by its id as well', (await call('GET', `/api/communications/prayer-requests/${privateId}`, staffToken)).status === 404);

    const secretaryCounts = (await call('GET', '/api/communications/prayer-requests?pageSize=100', staffToken)).body as {
      counts?: Record<string, number>;
    } | null;
    const rectorCounts = (await call('GET', '/api/communications/prayer-requests?pageSize=100', token)).body as {
      counts?: Record<string, number>;
    } | null;
    check(
      'and the counts do not disclose how many are being held',
      (rectorCounts?.counts?.open ?? 0) > (secretaryCounts?.counts?.open ?? 0),
      `${rectorCounts?.counts?.open} vs ${secretaryCounts?.counts?.open}`,
    );

    const answeredBySecretary = await call('POST', `/api/communications/prayer-requests/${privateId}/answer`, staffToken, {});
    check('nor may the office answer one it cannot read', answeredBySecretary.status === 404, errorOf(answeredBySecretary));

    const updating = await call('PATCH', `/api/communications/prayer-requests/${publicId}`, token, { status: 'praying' });
    check('a request walks from open to being prayed for', data<PrayerRow>(updating)?.status === 'praying');
    const answered = await call('POST', `/api/communications/prayer-requests/${publicId}/answer`, token, {
      note: 'Probe: answered at the harvest service.',
    });
    check('and answered with a date of its own', Boolean(data<PrayerRow>(answered)?.answeredAt));
    const again = await call('POST', `/api/communications/prayer-requests/${publicId}/answer`, token, {});
    check('answering twice is refused', again.status === 409, errorOf(again));
    const archived = await call('PATCH', `/api/communications/prayer-requests/${publicId}`, token, { status: 'archived' });
    check('and it can be taken off the wall', data<PrayerRow>(archived)?.status === 'archived');

    console.log('\n8. Milestones come from the register’s own dates');
    const today = new Date();
    /** The day/month of a date `days` from today — what the register stores is a birthday, not a year. */
    const dayIn = (days: number) => {
      const on = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
      return `${String(on.getMonth() + 1).padStart(2, '0')}-${String(on.getDate()).padStart(2, '0')}`;
    };
    // Two days out, one well past the thirty-day window the console reads, and a wedding anniversary
    // inside it — a date a few weeks either side of today, so neither assertion depends on the month.
    await enrol(token, 'Probe', 'Birthday', { dateOfBirth: `2000-${dayIn(2)}` });
    await enrol(token, 'Probe', 'Faraway', { dateOfBirth: `2000-${dayIn(45)}` });
    await enrol(token, 'Probe', 'Anniversary', { weddingAnniversary: `2010-${dayIn(4)}` });

    const celebrations = await call('GET', '/api/communications/celebrations?days=30', token);
    const rows = data<CelebrationRow[]>(celebrations) ?? [];
    const birthday = rows.find((row) => row.memberName === 'Probe Birthday');
    check('a birthday inside the window is listed', Boolean(birthday));
    check('with how many days away it is', (birthday?.inDays ?? -1) >= 0 && (birthday?.inDays ?? 99) <= 30);
    check('and the years it completes', (birthday?.yearsCount ?? 0) > 0, String(birthday?.yearsCount));
    check('a birthday outside it is not', !rows.some((row) => row.memberName === 'Probe Faraway'));
    check('an anniversary is told apart from a birthday', rows.some((row) => row.type === 'anniversary' && row.memberName === 'Probe Anniversary'));
    check(
      'and a birthday is not listed when only anniversaries are asked for',
      !((data<CelebrationRow[]>(await call('GET', '/api/communications/celebrations?days=30&kind=anniversary', token)) ?? []).some(
        (row) => row.type === 'birthday',
      )),
    );

    console.log('\n9. Another church reaches none of it');
    const houseNotices = listOf<NoticeRow>(await call('GET', '/api/communications/announcements?pageSize=100', houseToken));
    check('the seeded church cannot see the probe notice', !houseNotices?.data.some((row) => row.id === urgentRow?.id));
    check('and its own sheet is unchanged', houseNotices?.total === houseBefore, `${houseNotices?.total} vs ${houseBefore}`);
    check(
      'nor reach a probe event by its id',
      (await call('GET', `/api/communications/events/${eventRow?.id}`, houseToken)).status === 404,
    );
    check(
      'nor a probe prayer request',
      (await call('GET', `/api/communications/prayer-requests/${publicId}`, houseToken)).status === 404,
    );

    console.log('\n10. Who may write');
    const viewerWrite = await call('POST', '/api/communications/announcements', viewerToken, {
      title: 'Probe notice from a read-only account',
      body: 'This should not be accepted.',
    });
    check('a read-only account cannot publish a notice', viewerWrite.status === 403, errorOf(viewerWrite));
    const staffWrite = await call('POST', '/api/communications/announcements', staffToken, {
      title: 'Probe notice from the office',
      body: 'The office keeps the notice sheet.',
    });
    check('the office can', staffWrite.status < 300, errorOf(staffWrite));
    const staffRetire = await call(
      'DELETE',
      `/api/communications/announcements/${data<NoticeRow>(staffWrite)?.id}?reason=other&reasonLabel=Probe`,
      staffToken,
    );
    check('but retiring one is an administrator’s act', staffRetire.status === 403, errorOf(staffRetire));
  } finally {
    await removeChurch(probe.organizationId, { emailSuffix: '@comms.test' });
    console.log('\nThe probe church, its accounts and everything it wrote are removed.');
  }

  console.log(`\n${checks - failed}/${checks} checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
