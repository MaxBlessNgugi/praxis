import { createHash } from 'node:crypto';
import { basePrisma } from '../src/lib/prisma';
import { env } from '../src/config/env';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The authentication lifecycle, driven end to end against the running service.
 *
 * Everything here is a claim the API makes about an account and nobody checks by using it: that a
 * password change ends the *other* sessions and keeps this one, that a reset link is single-use and
 * expires, that the token a reset link carries is stored only as a hash, and that a forgotten
 * password can be recovered without an administrator typing one in for somebody.
 *
 * It works on a **throwaway account** it creates and retires, never on the seeded administrator —
 * a check that changes the church's own password is a check nobody runs twice.
 *
 * **It signs in six times on purpose** and no more: `/api/auth/login` is rate-limited per address at
 * ten a minute, and the security suite deliberately exhausts that ceiling, so this one stays well
 * under it and leaves the lockout tests where they belong. It still asks for room first, because the
 * suites before it in CI are spending the same allowance.
 *
 *   npx tsx tools/auth-lifecycle.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const ADMIN_PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';

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

interface Answer {
  status: number;
  body: unknown;
}

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<Answer> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
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

function codeOf(answer: Answer): string {
  const body = answer.body as { code?: string } | null;
  return body?.code ?? '';
}

/** The reset token out of the link the API built, which is the only way to be sure it is in there. */
function tokenFromLink(link: string): string | null {
  try {
    return new URL(link).searchParams.get('reset');
  } catch {
    return null;
  }
}

function payloadOf(token: string): Record<string, unknown> {
  const [, encoded] = token.split('.');
  return JSON.parse(Buffer.from(encoded ?? '', 'base64url').toString('utf8')) as Record<string, unknown>;
}

async function main(): Promise<void> {
// Six sign-ins below, on an address that the other suites in the same CI job share.
await waitForSignInBudget(API, 6);

const stamp = Date.now();
const PROBE_EMAIL = `auth.probe.${stamp}@destinysanctuary.co.ke`;
const FIRST_PASSWORD = 'probe-first-password';
const SECOND_PASSWORD = 'probe-second-password';
const THIRD_PASSWORD = 'probe-third-password';

let probeUserId: string | null = null;
let firstToken: string | null = null;

try {
  console.log('\nauthentication lifecycle\n');

  // ---------------------------------------------------------------------------------------------
  const admin = await call('POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const adminToken = data<{ token: string }>(admin)?.token ?? null;
  check('the church administrator can sign in', admin.status === 200 && !!adminToken, `got ${admin.status}`);

  const created = await call('POST', '/api/admin/users', {
    token: adminToken ?? undefined,
    body: { name: 'Auth Probe', email: PROBE_EMAIL, password: FIRST_PASSWORD, roleKey: 'staff' },
  });
  probeUserId = data<{ id: string }>(created)?.id ?? null;
  check('a throwaway account can be created', created.status === 201 && !!probeUserId, `got ${created.status}`);

  // ---------------------------------------------------------------------------------------------
  // Signing in, and ending the other sessions
  // ---------------------------------------------------------------------------------------------
  const probe = await call('POST', '/api/auth/login', { body: { email: PROBE_EMAIL, password: FIRST_PASSWORD } });
  firstToken = data<{ token: string }>(probe)?.token ?? null;
  check('the new account can sign in', probe.status === 200 && !!firstToken, `got ${probe.status}`);

  const readWithFirst = await call('GET', '/api/members?pageSize=1', { token: firstToken ?? undefined });
  check('and its token reaches the register', readWithFirst.status === 200, `got ${readWithFirst.status}`);

  const wrongCurrent = await call('POST', '/api/auth/password', {
    token: firstToken ?? undefined,
    body: { currentPassword: 'not-the-current-one', newPassword: SECOND_PASSWORD },
  });
  check(
    'changing a password needs the current one',
    wrongCurrent.status === 400 && codeOf(wrongCurrent) === 'wrong_password',
    `got ${wrongCurrent.status} ${codeOf(wrongCurrent)}`,
  );

  const changed = await call('POST', '/api/auth/password', {
    token: firstToken ?? undefined,
    body: { currentPassword: FIRST_PASSWORD, newPassword: SECOND_PASSWORD },
  });
  const secondToken = data<{ token: string }>(changed)?.token ?? null;
  check('a password can be changed', changed.status === 200 && !!secondToken, `got ${changed.status}`);

  const reusedFirst = await call('GET', '/api/members?pageSize=1', { token: firstToken ?? undefined });
  check(
    'the old token stops working (the change ended that session)',
    reusedFirst.status === 401 && codeOf(reusedFirst) === 'session_ended',
    `got ${reusedFirst.status} ${codeOf(reusedFirst)}`,
  );

  const readWithSecond = await call('GET', '/api/members?pageSize=1', { token: secondToken ?? undefined });
  check('the token handed back by the change works', readWithSecond.status === 200, `got ${readWithSecond.status}`);

  // ---------------------------------------------------------------------------------------------
  // Forgetting it: the reset link
  // ---------------------------------------------------------------------------------------------
  const requested = await call('POST', '/api/auth/password-reset/request', { body: { email: PROBE_EMAIL } });
  const request = data<{
    canSendEmail: boolean;
    expiresInMinutes: number;
    devLink?: string;
  }>(requested);
  check('a reset can be asked for', requested.status === 202, `got ${requested.status}`);

  const devLink = request?.devLink ?? '';
  const resetToken = devLink ? tokenFromLink(devLink) : null;
  const inDevelopment = env.NODE_ENV !== 'production';
  check(
    inDevelopment
      ? 'the link is handed back when no provider is configured (development)'
      : 'no link is ever handed back in production',
    inDevelopment ? !!resetToken : !request?.devLink,
    `devLink: ${devLink || '(none)'}`,
  );

  if (resetToken && probeUserId) {
    const stored = await basePrisma.passwordResetToken.findMany({ where: { userId: probeUserId } });
    const hashesMatch = stored.every(
      (row) => row.tokenHash === createHash('sha256').update(resetToken).digest('hex'),
    );
    check(
      'the emailed token is stored as a SHA-256 hash, never as itself',
      stored.length === 1 && hashesMatch && !stored.some((row) => row.tokenHash === resetToken),
      `${stored.length} row(s)`,
    );

    const weak = await call('POST', '/api/auth/password-reset/confirm', {
      body: { token: resetToken, password: 'password123' },
    });
    check('the reset refuses a password anybody would guess', weak.status === 400, `got ${weak.status}`);

    const stillUnused = await basePrisma.passwordResetToken.findFirst({ where: { userId: probeUserId } });
    check('a refused attempt does not spend the link', !stillUnused?.usedAt);

    const spent = await call('POST', '/api/auth/password-reset/confirm', {
      body: { token: resetToken, password: THIRD_PASSWORD },
    });
    check('the link can be spent', spent.status === 204, `got ${spent.status}`);

    const afterReset = await call('GET', '/api/members?pageSize=1', { token: secondToken ?? undefined });
    check(
      'a reset ends the sessions that existed before it',
      afterReset.status === 401 && codeOf(afterReset) === 'session_ended',
      `got ${afterReset.status} ${codeOf(afterReset)}`,
    );

    const spentAgain = await call('POST', '/api/auth/password-reset/confirm', {
      body: { token: resetToken, password: THIRD_PASSWORD },
    });
    check('and cannot be spent twice', spentAgain.status === 400, `got ${spentAgain.status}`);

    const withOld = await call('POST', '/api/auth/login', { body: { email: PROBE_EMAIL, password: SECOND_PASSWORD } });
    check('the password that was replaced no longer signs in', withOld.status === 401, `got ${withOld.status}`);

    const withNew = await call('POST', '/api/auth/login', { body: { email: PROBE_EMAIL, password: THIRD_PASSWORD } });
    const thirdToken = data<{ token: string }>(withNew)?.token ?? null;
    check('the password that replaced it does', withNew.status === 200 && !!thirdToken, `got ${withNew.status}`);

    if (thirdToken) {
      const payload = payloadOf(thirdToken);
      const claims = Object.keys(payload).sort().join(',');
      check(
        'the token carries an identity and a session generation, and no credential material',
        claims === 'exp,iat,org,sub,ver',
        claims,
      );
      const account = probeUserId
        ? await basePrisma.user.findUnique({ where: { id: probeUserId }, select: { tokenVersion: true } })
        : null;
      check(
        'the generation it carries is the account’s current one',
        payload.ver === account?.tokenVersion,
        `token ${String(payload.ver)} vs account ${String(account?.tokenVersion)}`,
      );

      const me = await call('GET', '/api/auth/me', { token: thirdToken });
      const meText = JSON.stringify(me.body);
      check('and no response ever carries a password hash', !meText.includes('passwordHash') && !meText.includes('$2'));
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Being invited: an account that exists but cannot sign in until its owner chooses a password
  // ---------------------------------------------------------------------------------------------
  if (adminToken) {
    const invitedEmail = `invited.probe.${stamp}@destinysanctuary.co.ke`;
    const invite = await call('POST', '/api/admin/users/invite', {
      token: adminToken,
      body: { name: 'Invited Probe', email: invitedEmail, roleKey: 'viewer' },
    });
    const invitedRow = data<{ user: { id: string }; canSendEmail: boolean; devLink?: string }>(invite);
    check('an account can be invited without anybody inventing a password for it', invite.status === 201 && !!invitedRow?.user.id, `got ${invite.status}`);
    check('the invite answers whether the link could be emailed', typeof invitedRow?.canSendEmail === 'boolean');

    const invitedBefore = await call('POST', '/api/auth/login', { body: { email: invitedEmail, password: 'guess-anything' } });
    check('the invited account cannot sign in before its link is spent', invitedBefore.status === 401, `got ${invitedBefore.status}`);

    const inviteLinkToken = invitedRow?.devLink ? tokenFromLink(invitedRow.devLink) : null;
    check(
      inDevelopment ? 'the activation link is handed back in development' : 'no activation link is handed back in production',
      inDevelopment ? !!inviteLinkToken : !invitedRow?.devLink,
    );

    if (inviteLinkToken) {
      const activate = await call('POST', '/api/auth/password-reset/confirm', {
        body: { token: inviteLinkToken, password: 'invited-chose-this-7' },
      });
      check('the owner activates the account by choosing their own password', activate.status === 204, `got ${activate.status}`);
      const replay = await call('POST', '/api/auth/password-reset/confirm', {
        body: { token: inviteLinkToken, password: 'invited-chose-this-7' },
      });
      check('and the activation link cannot be spent twice', replay.status === 400, `got ${replay.status}`);

      const invitedIn = await call('POST', '/api/auth/login', { body: { email: invitedEmail, password: 'invited-chose-this-7' } });
      const invitedToken = data<{ token: string }>(invitedIn)?.token ?? null;
      check('the activated account signs in with the password its owner chose', invitedIn.status === 200 && !!invitedToken, `got ${invitedIn.status}`);

      const rename = await call('PATCH', '/api/auth/me', { token: invitedToken ?? undefined, body: { name: 'Invited Probe Renamed' } });
      check('an account can rename itself', rename.status === 200, `got ${rename.status}`);
      const shortName = await call('PATCH', '/api/auth/me', { token: invitedToken ?? undefined, body: { name: 'X' } });
      check('but the server still validates what it accepts', shortName.status === 400, `got ${shortName.status}`);

      const invitedInvites = await call('POST', '/api/admin/users/invite', {
        token: invitedToken ?? undefined,
        body: { name: 'Escalation Attempt', email: `escalation.${stamp}@destinysanctuary.co.ke`, roleKey: 'super_admin' },
      });
      check('a viewer cannot invite anybody, whatever the console shows', invitedInvites.status === 403, `got ${invitedInvites.status}`);

      // The invitation's leavings, whether or not the checks above passed.
      await basePrisma.passwordResetToken.deleteMany({ where: { user: { email: invitedEmail } } }).catch(() => {});
      await basePrisma.user.deleteMany({ where: { email: invitedEmail } }).catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The things a stranger can try
  // ---------------------------------------------------------------------------------------------
  const unknown = await call('POST', '/api/auth/password-reset/request', { body: { email: `nobody.${stamp}@example.com` } });
  const stranger = data<{ canSendEmail: boolean; devLink?: string }>(unknown);
  check(
    'an address with no account is answered the same way, without a link',
    unknown.status === 202 && !stranger?.devLink,
    `got ${unknown.status}`,
  );
  // The whole answer, not just its status: a field that differed for a registered address would turn
  // this endpoint into a way to find out who has an account here. `devLink` is the one thing that may
  // differ, and only because a development server has no provider to send it with.
  check(
    'and nothing in it differs from the answer an account gets',
    JSON.stringify({ ...stranger, devLink: null }) === JSON.stringify({ ...request, devLink: null }),
    `${JSON.stringify(stranger)} vs ${JSON.stringify(request)}`,
  );

  const unauthenticated = await call('POST', '/api/auth/password', {
    body: { currentPassword: FIRST_PASSWORD, newPassword: SECOND_PASSWORD },
  });
  check('changing a password without a session is refused', unauthenticated.status === 401, `got ${unauthenticated.status}`);

  // An expired link, written straight into the table: the one case a run cannot produce by waiting.
  if (probeUserId) {
    const expired = 'probe-expired-token-probe-expired-token-probe';
    await basePrisma.passwordResetToken.create({
      data: {
        userId: probeUserId,
        tokenHash: createHash('sha256').update(expired).digest('hex'),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expiredUse = await call('POST', '/api/auth/password-reset/confirm', {
      body: { token: expired, password: 'probe-fourth-password' },
    });
    check('an expired link is refused', expiredUse.status === 400, `got ${expiredUse.status}`);
  }
} finally {
  // Cleanup runs whether or not anything above passed: the probe account and its reset rows are a
  // run's leavings, and the seeded church is what somebody demonstrates from.
  if (probeUserId) {
    await basePrisma.passwordResetToken.deleteMany({ where: { userId: probeUserId } }).catch(() => {});
    await basePrisma.user.delete({ where: { id: probeUserId } }).catch(() => {});
  }
  await basePrisma.$disconnect();
}

}

main()
  .catch((error) => {
    console.error('\nThe authentication check could not finish:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log(`\n${checks - failed}/${checks} authentication checks passed`);
    if (failed) {
      console.log(`failed: ${failed}`);
      process.exitCode = 1;
    }
  });
