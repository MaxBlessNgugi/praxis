/**
 * The SaaS lifecycle, exercised end to end against a running API.
 *
 * One throwaway church walks the whole road the product promises: it signs itself up onto a trial,
 * converts by payment, renews early, is marked unpaid, runs out its grace period, keeps reading but
 * cannot write, and comes back to life the moment money is recorded. Every date the story needs is
 * written by the vendor's own console — the same doors a person uses — so the database is never
 * touched to make the story work.
 *
 * Run it against a live API:  npm run check:billing     (API_URL to point somewhere other than :4000)
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

/** The clock's verdict on the probe church, read back through the vendor's view of it. */
async function statusOf(vendorToken: string, organizationId: string): Promise<string> {
  const answer = await call('GET', `/api/vendor/organizations/${organizationId}`, vendorToken);
  return data<{ status: string }>(answer)?.status ?? 'unknown';
}

/** Remove every trace of the probe church: its rows first, then the church itself. */
async function removeProbeChurch(organizationId: string): Promise<void> {
  const tenantTables = await basePrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.columns WHERE column_name = 'organizationId'`,
  );
  for (const { table_name: table } of tenantTables) {
    await basePrisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "organizationId" = $1`, organizationId);
  }
  await basePrisma.user.deleteMany({ where: { email: { endsWith: '@billing-lifecycle.test' } } });
  await basePrisma.organization.deleteMany({ where: { id: organizationId } });
}

async function main(): Promise<void> {
  // The platform admin, whose console the whole story runs through.
  const vendorSignIn = await call('POST', '/api/auth/login', undefined, {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD,
  });
  const vendorToken = data<{ token: string }>(vendorSignIn)?.token;
  check('the platform administrator signs in', vendorSignIn.status === 200 && Boolean(vendorToken), `status ${vendorSignIn.status}`);
  if (!vendorToken) {
    console.log(results.join('\n'));
    process.exitCode = 1;
    return;
  }

  const stamp = Date.now();
  const probeEmail = `admin-${stamp}@billing-lifecycle.test`;

  // 1. Signup → trial ---------------------------------------------------------
  console.log('\n1. A church signs itself up, onto a trial');
  const signup = await call('POST', '/api/auth/signup', undefined, {
    churchName: `Billing lifecycle ${stamp}`,
    adminName: 'Billing Probe',
    email: probeEmail,
    password: 'lifecycle-password',
    phone: '+254 700 000 001',
    country: 'Kenya',
  });
  const probeId = data<{ organization?: { id: string } }>(signup)?.organization?.id;
  const probeToken = data<{ token: string }>(signup)?.token;
  if (!probeId || !probeToken) {
    check('a church can sign itself up', false, `status ${signup.status}: ${errorOf(signup)}`);
    console.log(results.join('\n'));
    process.exitCode = 1;
    return;
  }
  check('a church can sign itself up', signup.status === 201);

  let status = await statusOf(vendorToken, probeId);
  check('it lands on its plan’s trial', status === 'trial', status);
  const subscription = await call('GET', '/api/billing/subscription', probeToken);
  check(
    'and sees a trial with days left',
    subscription.status === 200 && data<{ status: string; daysLeft: number | null }>(subscription)?.status === 'trial',
    `status ${subscription.status}`,
  );

  // 2. Conversion: the money arrives ----------------------------------------
  console.log('\n2. The money arrives, and the trial becomes a paid period');
  const payment = await call('POST', `/api/vendor/organizations/${probeId}/payments`, vendorToken, {
    amount: 3500,
    method: 'mpesa',
    reference: `LIFECYCLE-${stamp}`,
    months: 1,
  });
  check('a payment is recorded', payment.status === 201, `status ${payment.status}: ${errorOf(payment)}`);
  status = await statusOf(vendorToken, probeId);
  check('the church is active again, from any state', status === 'active', status);
  const afterPayment = await call('GET', '/api/billing/subscription', probeToken);
  check(
    'its period is a month long and its trial is closed',
    data<{ currentPeriodEnd: string | null; trialEndsAt: string | null }>(afterPayment)?.currentPeriodEnd !== null &&
      data<{ trialEndsAt: string | null }>(afterPayment)?.trialEndsAt === null,
  );
  const memberWrite = await call('POST', '/api/members', probeToken, {
    firstName: 'Lifecycle',
    lastName: 'Probe',
    sex: 'female',
    location: 'Nyahururu Main Church',
  });
  check('a paying church can write', memberWrite.status === 201, `status ${memberWrite.status}: ${errorOf(memberWrite)}`);

  // 3. Renewal pays early and *adds* the month ------------------------------
  console.log('\n3. Paying before the period ends adds to it, not from today');
  const periodEndBefore = data<{ currentPeriodEnd: string | null }>(afterPayment)?.currentPeriodEnd ?? '';
  const renewal = await call('POST', `/api/vendor/organizations/${probeId}/payments`, vendorToken, {
    amount: 3500,
    method: 'mpesa',
    reference: `LIFECYCLE-R${stamp}`,
    months: 1,
  });
  check('an early renewal is recorded', renewal.status === 201, `status ${renewal.status}`);
  const afterRenewal = await call('GET', '/api/billing/subscription', probeToken);
  const periodEndAfter = data<{ currentPeriodEnd: string | null }>(afterRenewal)?.currentPeriodEnd ?? '';
  check(
    'the period now runs a month past where it did',
    new Date(periodEndAfter).getTime() - new Date(periodEndBefore).getTime() > 25 * 86_400_000,
    `${periodEndBefore} → ${periodEndAfter}`,
  );

  // 4. Impossible states are refused ---------------------------------------
  console.log('\n4. A status that the calendar could not correct is refused');
  const pinnedActive = await call('POST', `/api/vendor/organizations/${probeId}/plan`, vendorToken, {
    planKey: data<{ plan: { key: string } }>(afterRenewal)?.plan?.key ?? 'sanctuary',
    status: 'active',
  });
  check('active without a paid period is refused', pinnedActive.status === 400, `status ${pinnedActive.status}: ${errorOf(pinnedActive)}`);

  // 5. Past due, by the clock, with the grace period still open ------------
  console.log('\n5. The period ends and the clock — not a hand — moves the church to past due');
  await basePrisma.$executeRawUnsafe(
    `UPDATE "Subscription" SET "currentPeriodEnd" = NOW() - INTERVAL '5 days', "currentPeriodStart" = NOW() - INTERVAL '35 days' WHERE "organizationId" = $1`,
    probeId,
  );
  status = await statusOf(vendorToken, probeId);
  check('five days overdue reads past due', status === 'past_due', status);
  const lateWrite = await call('POST', '/api/members', probeToken, {
    firstName: 'Grace',
    lastName: 'Period',
    sex: 'male',
    location: 'Nyahururu Main Church',
  });
  check('a church inside its grace period can still write', lateWrite.status === 201, `status ${lateWrite.status}: ${errorOf(lateWrite)}`);
  const headline = await call('GET', '/api/billing/subscription', probeToken);
  check(
    'and the console says the payment is overdue, not that access is lost',
    (data<{ headline: string }>(headline)?.headline ?? '').includes('overdue'),
    data<{ headline: string }>(headline)?.headline,
  );

  // 6. Expired: reads live, writes stop, nothing is deleted ----------------
  console.log('\n6. The grace period runs out — writes stop, reads do not');
  await basePrisma.$executeRawUnsafe(
    `UPDATE "Subscription" SET "currentPeriodEnd" = NOW() - INTERVAL '20 days', "currentPeriodStart" = NOW() - INTERVAL '50 days' WHERE "organizationId" = $1`,
    probeId,
  );
  status = await statusOf(vendorToken, probeId);
  check('twenty days overdue reads expired', status === 'expired', status);

  const expiredWrite = await call('POST', '/api/members', probeToken, {
    firstName: 'Blocked',
    lastName: 'Write',
    sex: 'male',
    status: 'active',
  });
  check(
    'a write is refused with 402 and the reason',
    expiredWrite.status === 402 && errorOf(expiredWrite).includes('read-only'),
    `${expiredWrite.status}: ${errorOf(expiredWrite)}`,
  );

  const expiredRead = await call('GET', '/api/members?pageSize=5', probeToken);
  check('the register still reads', expiredRead.status === 200, `status ${expiredRead.status}`);
  const reports = await call('GET', '/api/reports/members', probeToken);
  check('reports still read', reports.status === 200, `status ${reports.status}`);
  const auditLog = await call('GET', '/api/admin/audit?pageSize=5', probeToken);
  check('the audit log still reads', auditLog.status === 200, `status ${auditLog.status}`);
  const exportAnswer = await call('GET', '/api/settings/export', probeToken);
  check('an admin can still export a copy', exportAnswer.status === 200, `status ${exportAnswer.status}`);

  const settingsWrite = await call('PUT', '/api/settings/preferences/notifications', probeToken, { smsAlertsEnabled: true });
  check('and a settings write is also stopped', settingsWrite.status === 402, `status ${settingsWrite.status}: ${errorOf(settingsWrite)}`);
  const onboarding = await call('POST', '/api/settings/onboarding', probeToken, {});
  check(
    'but the onboarding wizard stays open to a lapsed church',
    onboarding.status !== 402,
    `status ${onboarding.status}: ${errorOf(onboarding)}`,
  );
  const billingRead = await call('GET', '/api/billing/subscription', probeToken);
  check('and the way back is still open: billing reads', billingRead.status === 200, `status ${billingRead.status}`);

  // 7. Recovery ------------------------------------------------------------
  console.log('\n7. One payment restores everything, with the records as they were');
  const restore = await call('POST', `/api/vendor/organizations/${probeId}/payments`, vendorToken, {
    amount: 3500,
    method: 'bank_transfer',
    reference: `LIFECYCLE-BACK-${stamp}`,
    months: 1,
  });
  check('the recovery payment is recorded', restore.status === 201, `status ${restore.status}`);
  status = await statusOf(vendorToken, probeId);
  check('the church is active again, from expired', status === 'active', status);
  const restoredWrite = await call('POST', '/api/members', probeToken, {
    firstName: 'Restored',
    lastName: 'Write',
    sex: 'female',
    location: 'Nyahururu Main Church',
  });
  check('and writes open again', restoredWrite.status === 201, `status ${restoredWrite.status}: ${errorOf(restoredWrite)}`);
  const stillThere = await call('GET', '/api/members?pageSize=10', probeToken);
  const names = JSON.stringify(data<Array<{ firstName?: string; lastName?: string }>>(stillThere) ?? []);
  check(
    'and the records written before the lapse are all still there',
    names.includes('Lifecycle') && names.includes('Grace'),
    `${(data<unknown[]>(stillThere) ?? []).length} members`,
  );

  // 8. Trial extension is a vendor act, and a cancelled church runs out its notice --------
  console.log('\n8. Trials extend by grant; cancellation keeps the paid period');
  const extend = await call('POST', `/api/vendor/organizations/${probeId}/plan`, vendorToken, {
    planKey: 'sanctuary',
    trialDays: 30,
    note: 'Lifecycle: extending for the probe.',
  });
  check('a trial can be granted from the vendor console', extend.status === 200, `status ${extend.status}: ${errorOf(extend)}`);
  status = await statusOf(vendorToken, probeId);
  check('and the church reads as trialing again', status === 'trial', status);

  const cancel = await call('POST', `/api/vendor/organizations/${probeId}/plan`, vendorToken, {
    planKey: 'sanctuary',
    status: 'cancelled',
    periodMonths: 1,
    note: 'Lifecycle: the church is leaving.',
  });
  check('a cancellation is recorded with its paid period', cancel.status === 200, `status ${cancel.status}: ${errorOf(cancel)}`);
  status = await statusOf(vendorToken, probeId);
  check('a cancelled church keeps its access to the end of the period', status === 'cancelled', status);
  const cancelledWrite = await call('POST', '/api/members', probeToken, {
    firstName: 'Notice',
    lastName: 'Period',
    sex: 'male',
    location: 'Nyahururu Main Church',
  });
  check('and can still write while its notice runs', cancelledWrite.status === 201, `status ${cancelledWrite.status}`);

  console.log('\nSweeping the probe church away');
  await removeProbeChurch(probeId);

  console.log(`\n${results.join('\n')}`);
  console.log(`\n${results.length - failed}/${results.length} billing lifecycle checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nThe billing lifecycle suite could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
