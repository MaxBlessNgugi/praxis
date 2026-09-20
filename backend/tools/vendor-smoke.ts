/**
 * The operator's side of Praxis, and the outbound gateways, exercised against a running API.
 *
 * Four things live here that nothing else checks, and each one is a claim a person could reasonably
 * disbelieve: that suspending a church actually refuses its sign-in *and says why*; that an operator
 * cannot switch off the church their own account sits in; that a support session is scoped to the
 * church it names, is refused the vendor screens while it is open, is written into that church's own
 * audit log, and cannot be replayed once closed; and that a send with no provider configured is
 * refused with the exact setting to change rather than recorded as delivered.
 *
 * It provisions a throwaway church through the public signup endpoint and removes every trace of it
 * afterwards, on a failure as much as on a pass. The seeded church is only ever read — the one write
 * it attempts against itself is the suspension above, which must be refused.
 *
 * Run it against a live API:  npm run check:vendor     (API_URL to point somewhere other than :4000)
 */
import { basePrisma } from '../src/lib/prisma';

const API = process.env.API_URL ?? 'http://127.0.0.1:4000';
const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PLATFORM_PASSWORD = process.env.PLATFORM_PASSWORD ?? 'praxis-demo-2025';

const results: string[] = [];
let failed = 0;

function check(label: string, ok: boolean, detail = ''): void {
  if (!ok) failed += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

interface Answer {
  status: number;
  body: unknown;
}

async function call(method: string, path: string, token?: string, body?: unknown): Promise<Answer> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

/** The payload of a `{ data: … }` answer, read as the shape the check above it expects. */
function data<T>(answer: Answer): T | undefined {
  const body = answer.body as { data?: T } | null;
  return body?.data;
}

/** The sentence a refusal carries, for a failure message. */
function errorOf(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

/** Remove every trace of the probe church: its rows first, then the church itself. */
async function removeProbeChurch(organizationId: string, houseOrganizationId: string): Promise<void> {
  const tenantTables = await basePrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.columns WHERE column_name = 'organizationId'`,
  );
  for (const { table_name: table } of tenantTables) {
    await basePrisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "organizationId" = $1`, organizationId);
  }
  await basePrisma.user.deleteMany({ where: { email: { endsWith: '@vendor-smoke.test' } } });
  await basePrisma.organization.delete({ where: { id: organizationId } });
  // The run also writes into the *seeded* church's log: the refusal above, and the visit. Those rows
  // name the probe, so they go with it — a check that only passes on a database nobody has touched is
  // worth very little, and the seeded log is the one a person reads.
  await basePrisma.auditLog.deleteMany({
    where: { organizationId: houseOrganizationId, summary: { contains: 'Vendor smoke' } },
  });
}

async function main(): Promise<void> {
  const signIn = await call('POST', '/api/auth/login', undefined, {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD,
  });
  check('a platform administrator signs in', signIn.status === 200, `status ${signIn.status}`);
  const token = data<{ token: string }>(signIn)?.token;
  const houseId = data<{ organization?: { id: string } }>(signIn)?.organization?.id;
  check('and is reported as platform staff', data<{ user?: { isPlatformAdmin?: boolean } }>(signIn)?.user?.isPlatformAdmin === true);
  if (!token || !houseId) {
    console.log(results.join('\n'));
    process.exitCode = 1;
    return;
  }

  const stamp = Date.now();
  const signup = await call('POST', '/api/auth/signup', undefined, {
    churchName: `Vendor smoke ${stamp}`,
    adminName: 'Vendor Smoke',
    email: `admin-${stamp}@vendor-smoke.test`,
    password: 'vendor-smoke-password',
    phone: '+254 700 000 000',
    country: 'Kenya',
  });
  const probeId = data<{ organization?: { id: string } }>(signup)?.organization?.id;
  const probeToken = data<{ token: string }>(signup)?.token;
  if (!probeId || !probeToken) {
    check('a throwaway church can sign itself up', false, `status ${signup.status}: ${errorOf(signup)}`);
    console.log(results.join('\n'));
    process.exitCode = 1;
    return;
  }
  check('a throwaway church can sign itself up', signup.status === 201);

  try {
    console.log('\n1. The churches on the platform');
    const list = await call('GET', '/api/vendor/organizations', token);
    check('the vendor list answers', list.status === 200 && Array.isArray(data<unknown[]>(list)), `status ${list.status}`);
    check(
      'and includes the church that just signed up',
      data<Array<{ id: string }>>(list)?.some((row) => row.id === probeId) === true,
    );

    const stats = await call('GET', `/api/vendor/organizations/${probeId}/stats`, token);
    check(
      'an operator can read a church’s usage',
      stats.status === 200 && data<{ members: number }>(stats)?.members === 0,
      `status ${stats.status}, members ${data<{ members: number }>(stats)?.members}`,
    );

    console.log('\n2. Suspension is reversible, explained, and cannot trap the operator');
    const ownChurch = await call('POST', `/api/vendor/organizations/${houseId}/suspension`, token, {
      suspended: true,
      reason: 'Vendor smoke: this must be refused.',
    });
    check(
      'switching off your own church is refused, with the reason',
      ownChurch.status === 409 && errorOf(ownChurch).includes('your own account'),
      `status ${ownChurch.status}`,
    );

    const suspended = await call('POST', `/api/vendor/organizations/${probeId}/suspension`, token, {
      suspended: true,
      reason: 'Vendor smoke: checking the switch.',
    });
    check('a church can be switched off', suspended.status === 200 && data<{ isActive: boolean }>(suspended)?.isActive === false);

    const again = await call('POST', `/api/vendor/organizations/${probeId}/suspension`, token, {
      suspended: true,
      reason: 'Vendor smoke: second press.',
    });
    check('a second press is refused rather than silently repeated', again.status === 409, `status ${again.status}`);

    const noReason = await call('POST', `/api/vendor/organizations/${probeId}/suspension`, token, { suspended: false });
    check('and so is a switch with no reason on file', noReason.status === 400, `status ${noReason.status}`);

    const refused = await call('POST', '/api/auth/login', undefined, {
      email: `admin-${stamp}@vendor-smoke.test`,
      password: 'vendor-smoke-password',
    });
    check(
      'a suspended church cannot sign in, and is told it is suspended',
      refused.status === 403 && errorOf(refused).includes('suspended'),
      `${refused.status}: ${errorOf(refused)}`,
    );

    const restored = await call('POST', `/api/vendor/organizations/${probeId}/suspension`, token, {
      suspended: false,
      reason: 'Vendor smoke: switching back on.',
    });
    check('switching it back on works', restored.status === 200 && data<{ isActive: boolean }>(restored)?.isActive === true);

    const backIn = await call('POST', '/api/auth/login', undefined, {
      email: `admin-${stamp}@vendor-smoke.test`,
      password: 'vendor-smoke-password',
    });
    check('and the church can sign in again', backIn.status === 200, `status ${backIn.status}`);

    console.log('\n3. A support session is scoped, visible, audited, and one-way');
    const session = await call('POST', `/api/vendor/organizations/${probeId}/support-sessions`, token, {
      reason: 'Vendor smoke: confirming a visit is scoped and audited.',
    });
    const supportToken = data<{ token: string }>(session)?.token;
    check('a support session opens', session.status === 200 && Boolean(supportToken), `status ${session.status}`);
    if (!supportToken) throw new Error('no support token to test with');

    const inside = await call('GET', '/api/members?pageSize=1', supportToken);
    check('the visit can read the church it names', inside.status === 200, `status ${inside.status}`);

    const crossVendor = await call('GET', '/api/vendor/organizations', supportToken);
    check('but not the vendor screens', crossVendor.status === 403, `status ${crossVendor.status}`);

    const me = await call('GET', '/api/auth/me', supportToken);
    check(
      'and /me answers for the visited church, not the operator’s own',
      me.status === 200 && data<{ organization?: { id: string; name?: string } }>(me)?.organization?.id === probeId,
      `${data<{ organization?: { name?: string } }>(me)?.organization?.name}`,
    );

    const history = await call('GET', '/api/admin/audit?pageSize=5', probeToken);
    check(
      'the church’s own audit log names the visit',
      history.status === 200 && JSON.stringify(data<unknown[]>(history) ?? []).includes('support session'),
      `status ${history.status}`,
    );

    const ended = await call('POST', '/api/vendor/support-sessions/end', supportToken, {
      reason: 'Vendor smoke finished.',
    });
    check('the visit closes from inside', ended.status === 200 && data<{ ended: boolean }>(ended)?.ended === true, `status ${ended.status}`);

    const replayed = await call('GET', '/api/vendor/organizations', supportToken);
    check('and cannot be replayed for vendor actions', replayed.status === 403, `status ${replayed.status}`);

    console.log('\n4. Sending, and refusing to lie about it');
    const notice = await call('POST', '/api/communications/broadcasts', probeToken, {
      channel: 'notice_sheet',
      body: 'Vendor smoke notice sheet.',
      audience: 'Members & Baptized Believers',
    });
    check('a broadcast can be composed', notice.status === 201, `status ${notice.status}: ${errorOf(notice)}`);

    const sent = await call('POST', `/api/communications/broadcasts/${data<{ id: string }>(notice)?.id}/send`, probeToken, {
      recipients: 12,
    });
    check(
      'a notice sheet keeps the office’s own count',
      sent.status === 200 && data<{ recipients: number }>(sent)?.recipients === 12,
      `status ${sent.status}, recipients ${data<{ recipients: number }>(sent)?.recipients}`,
    );
    check('and stores a delivery report beside the campaign', Boolean(data<{ lastReport?: unknown }>(sent)?.lastReport));

    const draft = await call('POST', '/api/communications/broadcasts', probeToken, {
      channel: 'email',
      subject: 'Vendor smoke',
      body: 'Vendor smoke email — refused while no provider is configured.',
      audience: 'Members & Baptized Believers',
    });
    const emailSend = await call('POST', `/api/communications/broadcasts/${data<{ id: string }>(draft)?.id}/send`, probeToken, {});
    check(
      'an email send with no provider is refused, naming the setting',
      emailSend.status === 503 && errorOf(emailSend).includes('EMAIL_DRIVER'),
      `${emailSend.status}: ${errorOf(emailSend)}`,
    );

    const channels = await call('GET', '/api/communications/channels', probeToken);
    check(
      'the console can read what each gateway will do',
      channels.status === 200 &&
        'email' in (data<Record<string, unknown>>(channels) ?? {}) &&
        'sms' in (data<Record<string, unknown>>(channels) ?? {}),
      JSON.stringify(data<Record<string, unknown>>(channels)),
    );
  } finally {
    await removeProbeChurch(probeId, houseId);
    console.log('\nThe throwaway church and its rows were removed.');
  }

  console.log(`\n${results.join('\n')}`);
  console.log(`\n${results.length - failed}/${results.length} vendor checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nVendor smoke could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
