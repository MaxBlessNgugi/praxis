import { basePrisma } from '../src/lib/prisma';
import { corsOrigins, env } from '../src/config/env';
import { removeChurch } from './lib/provision';

/**
 * The security posture, checked against the running service rather than described in a document.
 *
 * Every claim here is one somebody would otherwise take on trust: that an unauthenticated request is
 * refused, that the sign-in ceiling actually bites, that a browser on another origin cannot read a
 * response, that an upload's type is checked rather than believed, and that a weak password is refused
 * at signup. Each is cheap to check and expensive to discover missing in production.
 *
 * **Order is part of the design.** Sign-in is rate-limited per address at ten a minute, and the last
 * section deliberately exhausts that ceiling, so it runs last and the earlier sections share a single
 * token taken at the start. The account lockout it exercises is on a throwaway account of its own —
 * never the seeded administrator's, because a check that locks the church out of its own console is a
 * check nobody runs twice.
 *
 * The ceiling also means this suite cannot assume it is the first thing to sign in from its address.
 * In CI four other suites and two browser audits share it, so the lockout section would read the
 * address's 429 instead of the account's 423 — which is what happened, twice, before it learned to
 * wait. It asks the limiter how much budget is left and waits out the window when there is not enough.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/security-smoke.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';
const LISTED_ORIGIN = corsOrigins[0] ?? 'http://localhost:3000';
const UNLISTED_ORIGIN = 'https://not-a-church-in-this-deployment.example';

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
  headers: Headers;
  body: unknown;
}

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Answer> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
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
  return { status: response.status, headers: response.headers, body: parsed };
}

function data<T>(answer: Answer): T | null {
  const body = answer.body as { data?: T } | null;
  return body && typeof body === 'object' && 'data' in body ? (body.data as T) : null;
}

function errorOf(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

/** What a validation refusal says about the field it refused — the part a person actually reads. */
function fieldReason(answer: Answer): string {
  const body = answer.body as { fields?: Array<{ message?: string }> } | null;
  return body?.fields?.[0]?.message ?? '';
}

const signIn = (email: string, password: string) =>
  call('POST', '/api/auth/login', { body: { email, password } });

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until this address may sign in `needed` more times.
 *
 * Every response through the login route carries the limiter's own count — including the 429 — so the
 * wait is read rather than guessed. The probe costs one attempt, which is why the budget asked for is
 * on top of it. The loop is bounded: if four windows in a row do not free up room, something other
 * than a spent window is wrong and the section below will say so in its own failure messages.
 */
async function waitForLoginBudget(needed: number): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    const probe = await signIn(`budget-check+${Date.now()}@praxis.test`, 'wrong-password');
    const remaining = Number(probe.headers.get('ratelimit-remaining') ?? 0);
    if (probe.status !== 429 && remaining >= needed) return;

    const resetSeconds = Math.min(Number(probe.headers.get('ratelimit-reset') ?? 60) || 60, 70);
    console.log(`  .. ${remaining} sign-in attempt(s) left on this address; waiting ${resetSeconds}s for the window`);
    await sleep(resetSeconds * 1000 + 200);
  }
}

/** A user with the given role in the seeded church, alongside the session they sign in with. */
async function borrowAccount(email: string, roleKey: string, organizationId: string, passwordHash: string) {
  const role = await basePrisma.role.findFirst({ where: { key: roleKey } });
  return basePrisma.user.create({
    data: {
      name: `Security Smoke (${roleKey})`,
      email,
      passwordHash,
      roleId: role?.id ?? null,
      memberships: { create: { organizationId, roleId: role?.id ?? null, isDefault: true } },
    },
    select: { id: true },
  });
}

async function main(): Promise<void> {
  console.log(`Security posture → ${API}`);

  // Eight: this sign-in, the viewer's in section 7, and the five wrong passwords plus the one that
  // proves the lockout in section 8. Section 9 exhausts the ceiling on purpose and runs last.
  await waitForLoginBudget(8);

  // Taken once, before any of the deliberate failures below, so nothing later needs a fresh sign-in
  // until the limiter is itself the thing being tested.
  const session = data<{ token: string; organization: { id: string } }>(await signIn(EMAIL, PASSWORD));
  if (!session) throw new Error(`could not sign in as ${EMAIL} — is the seeded church there?`);
  const token = session.token;
  const seededHash = (
    await basePrisma.user.findFirstOrThrow({ where: { email: EMAIL }, select: { passwordHash: true } })
  ).passwordHash;

  console.log('\n1. Nothing is reachable without a token');
  for (const path of [
    '/api/members',
    '/api/finance/tithes',
    '/api/settings/profile',
    '/api/admin/users',
    '/api/vendor/organizations',
  ]) {
    const answer = await call('GET', path);
    check(`${path} is refused`, answer.status === 401, `got ${answer.status}`);
  }
  const refusal = await call('GET', '/api/members');
  check('and refused with a sentence, not a stack trace', /sign in|authorization|token/i.test(errorOf(refusal)), errorOf(refusal));
  check('and with a request id to quote in support', refusal.headers.get('x-request-id') !== null, 'no X-Request-Id');

  console.log('\n2. A forged or malformed token is refused rather than crashed on');
  check('a malformed token is a 401', (await call('GET', '/api/members', { token: 'not.a.jwt' })).status === 401);
  const wrongKey = await call('GET', '/api/members', {
    // A real HS256 token with the right shape and the wrong key.
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MH0.aaaa',
  });
  check('a token signed with the wrong key is a 401', wrongKey.status === 401, `got ${wrongKey.status}`);

  console.log('\n3. Security headers are on every response');
  const health = await call('GET', '/health');
  check('x-content-type-options is set', health.headers.get('x-content-type-options') === 'nosniff', String(health.headers.get('x-content-type-options')));
  const contentSecurityPolicy = health.headers.get('content-security-policy') ?? '';
  check(
    'framing is restricted one way or the other',
    health.headers.get('x-frame-options') !== null || contentSecurityPolicy.includes('frame-ancestors'),
    `${health.headers.get('x-frame-options')} / ${contentSecurityPolicy.slice(0, 40)}`,
  );
  check('the framework does not advertise itself', health.headers.get('x-powered-by') === null, String(health.headers.get('x-powered-by')));

  console.log('\n4. A browser on another origin cannot read this API');
  // CORS is not an API guard — a script on any site can still *send* these requests. What it controls
  // is whether the browser lets that script read the reply, which is why the header's presence or
  // absence is the whole assertion.
  const unlisted = await call('GET', '/health', { headers: { Origin: UNLISTED_ORIGIN } });
  check(
    'an origin this deployment never named is not echoed back',
    unlisted.headers.get('access-control-allow-origin') === null,
    String(unlisted.headers.get('access-control-allow-origin')),
  );
  const listed = await call('GET', '/health', { headers: { Origin: LISTED_ORIGIN } });
  check(
    `an origin it did name is (${LISTED_ORIGIN})`,
    listed.headers.get('access-control-allow-origin') === LISTED_ORIGIN,
    String(listed.headers.get('access-control-allow-origin')),
  );

  console.log('\n5. A weak password is refused at the door');
  // A real signup, because that is where the policy lives — and it is a signup that has to be taken
  // back out afterwards, which is why the only one that succeeds is the last.
  const stamp = Date.now();
  const attempt = (suffix: string, password: string) =>
    call('POST', '/api/auth/signup', {
      body: {
        churchName: `Password Policy Check ${stamp}`,
        adminName: 'Policy Check',
        email: `policy-check+${stamp}${suffix}@praxis.test`,
        phone: '+254712000333',
        country: 'Kenya',
        password,
      },
    });
  const common = await attempt('a', 'password123');
  check('a password everybody tries is refused', common.status === 400, `got ${common.status}`);
  check('and the reason reaches the form', /first ones anybody tries/.test(fieldReason(common)), fieldReason(common));
  const short = await attempt('b', 'short');
  check('a short one is refused too', short.status === 400 && /8 characters/.test(fieldReason(short)), fieldReason(short));
  const good = await attempt('c', 'aB3!aB3!aB3!aB3!');
  check('and an ordinary good one is accepted', good.status === 201, `${good.status} ${errorOf(good)}`);
  check('with a session, so the new church is inside its own console', Boolean(data<{ token: string }>(good)?.token));
  const signedUp = data<{ organization?: { id: string } }>(good);
  if (signedUp?.organization?.id) {
    await removeChurch(signedUp.organization.id, { adminEmails: [`policy-check+${stamp}c@praxis.test`] });
  }

  console.log('\n6. Uploads are checked, not believed');
  const upload = (body: Record<string, unknown>) => call('POST', '/api/files', { token, body });
  const disguised = await upload({
    purpose: 'logo',
    fileName: 'logo.png',
    mimeType: 'image/png',
    content: Buffer.from('<svg onload="alert(1)"></svg>').toString('base64'),
  });
  check('a script calling itself a PNG is refused', disguised.status === 415, `${disguised.status} ${errorOf(disguised)}`);
  const oversized = await upload({
    purpose: 'document',
    fileName: 'minutes.pdf',
    mimeType: 'application/pdf',
    content: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(env.UPLOAD_MAX_BYTES)]).toString('base64'),
  });
  check('an oversized upload is refused', oversized.status === 413, `${oversized.status} ${errorOf(oversized)}`);
  const beyondAnyLimit = await upload({
    purpose: 'document',
    fileName: 'minutes.pdf',
    mimeType: 'application/pdf',
    content: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(env.UPLOAD_MAX_BYTES * 3)]).toString('base64'),
  });
  check(
    'a body past every ceiling is a 413 rather than a 500',
    beyondAnyLimit.status === 413,
    `${beyondAnyLimit.status} ${errorOf(beyondAnyLimit)}`,
  );
  // Sent raw, because the helper above would never produce a body that cannot be parsed.
  const malformed = await fetch(`${API}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{"firstName": ',
  });
  check('and a malformed JSON body is a 400, not a 500', malformed.status === 400, String(malformed.status));
  const wrongPurpose = await upload({
    purpose: 'logo',
    fileName: 'minutes.pdf',
    mimeType: 'application/pdf',
    content: Buffer.from('%PDF-1.4\n').toString('base64'),
  });
  check('a PDF filed as a logo is refused', wrongPurpose.status === 415, `${wrongPurpose.status} ${errorOf(wrongPurpose)}`);

  console.log('\n7. A viewer may read and may not write');
  const viewerEmail = `viewer-check+${Date.now()}@praxis.test`;
  const viewer = await borrowAccount(viewerEmail, 'viewer', session.organization.id, seededHash);
  try {
    const viewerSession = data<{ token: string }>(await signIn(viewerEmail, PASSWORD));
    check('a viewer can sign in', Boolean(viewerSession?.token));
    if (viewerSession) {
      const viewerToken = viewerSession.token;
      check('and can read the register', (await call('GET', '/api/members?pageSize=1', { token: viewerToken })).status === 200);
      const write = await call('POST', '/api/members', {
        token: viewerToken,
        body: { firstName: 'Should', lastName: 'BeRefused', location: 'Nowhere' },
      });
      check('and is refused a write', write.status === 403, `${write.status} ${errorOf(write)}`);
      check('and refused the admin screens', (await call('GET', '/api/admin/users', { token: viewerToken })).status === 403);
      check('and refused the vendor console', (await call('GET', '/api/vendor/organizations', { token: viewerToken })).status === 403);
      check('and refused the church’s export', (await call('GET', '/api/settings/export', { token: viewerToken })).status === 403);
    }
  } finally {
    await basePrisma.user.deleteMany({ where: { id: viewer.id } });
  }

  console.log('\n8. Five wrong passwords lock the account');
  const lockedEmail = `lockout-check+${Date.now()}@praxis.test`;
  const locked = await borrowAccount(lockedEmail, 'viewer', session.organization.id, seededHash);
  try {
    const attempts: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      attempts.push((await signIn(lockedEmail, 'definitely-not-the-password')).status);
    }
    check('every wrong password is refused identically', attempts.every((status) => status === 401), attempts.join(','));
    const afterLock = await signIn(lockedEmail, PASSWORD);
    check('the account is locked once they run out', afterLock.status === 423, `${afterLock.status} ${errorOf(afterLock)}`);
    check('with the wait stated in minutes', /locked for another \d+ minute/.test(errorOf(afterLock)), errorOf(afterLock));
  } finally {
    await basePrisma.user.deleteMany({ where: { id: locked.id } });
  }

  console.log('\n9. The address ceiling bites (last, because it blocks this address)');
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 15; attempt += 1) {
    statuses.push((await signIn(`nobody+${attempt}@praxis.test`, 'wrong-password')).status);
  }
  check(
    'repeated sign-in attempts are rate limited',
    statuses.includes(429),
    `statuses: ${statuses.join(',')}`,
  );
  const blocked = await signIn(EMAIL, PASSWORD);
  check('and the refusal is a 429 rather than something a client can retry blindly', blocked.status === 429, `${blocked.status} ${errorOf(blocked)}`);
  check('whose message names the wait', /too many/i.test(errorOf(blocked)), errorOf(blocked));
  check('and which a client can honour from Retry-After', blocked.headers.get('retry-after') !== null, 'no Retry-After');

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} security checks passed`);
  if (failed > 0) process.exitCode = 1;
  console.log('Note: this run leaves the calling address rate-limited for up to a minute.');
  console.log('The church it signs up, and the two accounts it borrows, are removed before it exits.');
}

main()
  .catch((error: Error) => {
    console.error(`\nSecurity smoke could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
