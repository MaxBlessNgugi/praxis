import { basePrisma } from '../src/lib/prisma';
import { removeChurch } from './lib/provision';

/**
 * The whole path a new church walks, from the front door to its first Sunday.
 *
 * `smoke.mjs` covers the office's daily loop inside a church that already exists. This covers what
 * happens *before* that: a church nobody has heard of signs itself up, is given a trial and an
 * organisation, finishes the welcome wizard, and then does the four things a first week actually
 * consists of — enrol somebody, record money, plan a service, and put a notice on the board.
 *
 * It is deliberately one run rather than four checks, because the failures worth catching here are
 * the joins between the steps: a signup that mints a church the console cannot act for, a wizard that
 * does not mark the church as onboarded, a trial that is not visible to its own administrator. Each
 * step is verified on the way through, so a break points at the step rather than at "signup failed".
 *
 * The church it creates is removed at the end, whether the checks passed or not.
 *
 *   API_URL=http://127.0.0.1:4001 npx tsx tools/launch-check.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

/** Unique per run: signup refuses an address that already exists, and this must not be the thing
 *  that fails when it is run twice in a row. */
const STAMP = Date.now();
const ADMIN_EMAIL = `launch-check+${STAMP}@praxis.test`;
const ADMIN_PASSWORD = 'a-long-launch-check-password';
const CHURCH_NAME = `Launch Check Church ${STAMP}`;
/** Unique to this run, so "is it in the other church's ledger" is a question with an answer. */
const GIVER = `Launch Check Giver ${STAMP}`;

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

/** The payload of a `{ data: … }` answer. */
function data<T>(answer: Answer): T | null {
  const body = answer.body as { data?: T } | null;
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : null;
}

function errorMessage(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

let checks = 0;
let failed = 0;

function check(what: string, passed: boolean, detail = ''): void {
  checks += 1;
  if (passed) {
    console.log(`  ok   ${what}`);
    return;
  }
  failed += 1;
  console.log(`  FAIL ${what}${detail ? ` — ${detail}` : ''}`);
}

async function main(): Promise<void> {
  console.log(`A new church, end to end → ${API}`);

  console.log('\n1. A church signs itself up');
  const signup = await call('POST', '/api/auth/signup', undefined, {
    churchName: CHURCH_NAME,
    adminName: 'Launch Check Administrator',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    phone: '+254712000111',
    country: 'Kenya',
  });
  check('the signup is accepted', signup.status < 300, errorMessage(signup));
  const session = data<{
    token: string;
    user: { id: string; name: string; roleKey: string };
    organization: { id: string; name: string };
    subscription: { status: string; plan: { name: string }; trialEndsAt: string | null; daysLeft: number | null };
  }>(signup);
  if (!session) throw new Error('signup returned no session — nothing after this can be checked');

  const organizationId = session.organization.id;
  try {
    check('it lands in a church of its own', session.organization.name === CHURCH_NAME, session.organization.name);
    check('as its own super administrator', session.user.roleKey === 'super_admin', session.user.roleKey);
    check('signed in without a second step', typeof session.token === 'string' && session.token.length > 20);
    check('on a trial, with a plan named', session.subscription?.status === 'trial' && Boolean(session.subscription.plan?.name), JSON.stringify(session.subscription));
    check(
      'and days left to see',
      typeof session.subscription?.daysLeft === 'number' && session.subscription.daysLeft >= 13,
      String(session.subscription?.daysLeft),
    );

    const token = session.token;

    console.log('\n2. It starts empty, and can say so');
    const emptyMembers = data<unknown[]>(await call('GET', '/api/members?pageSize=5', token));
    check('the register is empty rather than missing', Array.isArray(emptyMembers) && emptyMembers.length === 0, JSON.stringify(emptyMembers));
    const overview = data<{ cards: { membersTotal: number; giving: number } }>(await call('GET', '/api/reports/overview', token));
    check('Home has figures to show, all of them zero', overview?.cards.membersTotal === 0 && overview?.cards.giving === 0, JSON.stringify(overview?.cards));
    const notOnboarded = data<{ organization: { onboardedAt: string | null } }>(await call('GET', '/api/auth/me', token));
    check('and the console knows the wizard is still owed', notOnboarded?.organization.onboardedAt === null, JSON.stringify(notOnboarded?.organization));

    console.log('\n3. It finishes the welcome wizard');
    const onboarding = await call('POST', '/api/settings/onboarding', token, {
      name: CHURCH_NAME,
      location: 'Nakuru Main Church',
      phone: '+254712000111',
      email: ADMIN_EMAIL,
      tagline: 'A congregation finding its feet',
      serviceTimes: { 'Sunday Service': '9:00 AM – 11:30 AM' },
    });
    check('the profile is saved', onboarding.status < 300, errorMessage(onboarding));
    const afterWizard = data<{ organization: { onboardedAt: string | null }; organizationProfile?: unknown }>(
      await call('GET', '/api/auth/me', token),
    );
    check('and the church is marked as onboarded', typeof afterWizard?.organization.onboardedAt === 'string', JSON.stringify(afterWizard?.organization));

    console.log('\n4. It enrols its first members');
    const member = data<{ id: string; memberId: string; firstName: string }>(
      await call('POST', '/api/members', token, {
        firstName: 'Grace',
        lastName: 'Wanjiru',
        phone: '+254712000222',
        location: 'Nakuru Main Church',
      }),
    );
    check('a member can be enrolled', Boolean(member?.id), 'no member came back');
    check('with a register number issued', /^MBR-\d+$/.test(member?.memberId ?? ''), member?.memberId ?? 'none');
    if (!member) throw new Error('the first member did not come back');
    check('and the register now holds one', data<unknown[]>(await call('GET', '/api/members?pageSize=5', token))?.length === 1);

    console.log('\n5. It records its first giving');
    // The giver's name is unique to this run on purpose: it is what the cross-tenant check below
    // searches the seeded church's ledger for.
    const tithe = await call('POST', '/api/finance/tithes', token, {
      memberId: member.id,
      donorName: GIVER,
      amount: 2500,
      method: 'mpesa',
      category: 'General Tithe',
    });
    check('a tithe can be recorded', tithe.status < 300, errorMessage(tithe));
    const ledger = data<Array<{ sequence: number }>>(await call('GET', '/api/finance/audit?pageSize=5', token));
    check('and it lands in the chained ledger', Array.isArray(ledger) && ledger.some((entry) => entry.sequence >= 1), JSON.stringify(ledger));
    const giving = data<{ cards: { giving: number; membersTotal: number } }>(await call('GET', '/api/reports/overview', token));
    check('and Home moves with it', giving?.cards.giving === 2500 && giving?.cards.membersTotal === 1, JSON.stringify(giving?.cards));

    console.log('\n6. It plans its first service');
    const heldAt = new Date(Date.now() + 4 * 86_400_000).toISOString();
    const service = data<{ id: string; title: string }>(
      await call('POST', '/api/services', token, { title: 'Sunday Celebration', heldAt, venue: 'Nakuru Main Church' }),
    );
    check('a service can be planned', Boolean(service?.id), 'no service came back');
    if (service) {
      // Order is the array's own order; the item carries what is said and who says it.
      const liturgy = await call('PUT', `/api/services/${service.id}/liturgy`, token, {
        items: [
          { title: 'Call to Worship', kind: 'call_to_worship', durationMinutes: 10, responsible: 'Launch Check Administrator' },
          { title: 'Word Ministry', kind: 'sermon', durationMinutes: 45, responsible: 'Launch Check Administrator' },
        ],
      });
      check('with an order of service', liturgy.status < 300, errorMessage(liturgy));
    }

    console.log('\n7. It publishes its first announcement');
    const announcement = await call('POST', '/api/communications/announcements', token, {
      title: 'Welcome to our new church office system',
      body: 'The register, the giving ledger and the notice board are now in one place.',
      audience: 'Everyone',
    });
    check('an announcement can be published', announcement.status < 300, errorMessage(announcement));
    const listed = data<Array<{ title: string }>>(await call('GET', '/api/communications/announcements?pageSize=5', token));
    check('and it is on the board', listed?.some((row) => row.title.startsWith('Welcome to our new')) === true, JSON.stringify(listed));

    console.log('\n8. None of it is visible to the church next door');
    const houseToken = data<{ token: string }>(
      await call('POST', '/api/auth/login', undefined, {
        email: process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
        password: process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
      }),
    )?.token;
    if (!houseToken) {
      check('the seeded church can sign in to compare', false, 'sign-in failed');
    } else {
      check('the new church’s member is not readable from another church', (await call('GET', `/api/members/${member.id}`, houseToken)).status === 404);
      check('its announcements are not on the other church’s board', data<Array<{ title: string }>>(await call('GET', '/api/communications/announcements?pageSize=20', houseToken))?.every((row) => !row.title.startsWith('Welcome to our new')) === true);
      const othersLedger = data<Array<{ donorName: string }>>(
        await call('GET', `/api/finance/tithes?q=${encodeURIComponent(GIVER)}&pageSize=5`, houseToken),
      );
      check('its giving is not in the other church’s ledger', othersLedger?.length === 0, JSON.stringify(othersLedger));
      check('nor its service on the other church’s calendar', data<Array<{ title: string }>>(await call('GET', '/api/services?pageSize=20', houseToken))?.every((row) => row.title !== 'Sunday Celebration') === true);
      check('and the register it just filled is invisible there', data<Array<{ memberId: string }>>(await call('GET', '/api/members?pageSize=5', houseToken))?.every((row) => row.memberId !== member.memberId) === true);
    }

    console.log('\n9. Signing out');
    const logout = await call('POST', '/api/auth/logout', token);
    check('signing out is accepted', logout.status < 300, errorMessage(logout));
    check('and the next request without a token is refused', (await call('GET', '/api/auth/me')).status === 401);
    // Stated rather than left to be discovered: a token is not revoked by signing out, because there
    // is no denylist. The console deletes it, which is what protects the *machine*; a token already
    // copied off that machine stays valid until it expires. This check exists so the trade-off is
    // visible in the run rather than in a design document nobody reads.
    check(
      'and the token itself is not revoked (a 7-day token with no denylist — see README → Hardening)',
      (await call('GET', '/api/auth/me', token)).status < 300,
    );
  } finally {
    await removeChurch(organizationId, { adminEmails: [ADMIN_EMAIL] });
    console.log('\nThe church this check created, and everything it owned, was removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} launch checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nLaunch check could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
