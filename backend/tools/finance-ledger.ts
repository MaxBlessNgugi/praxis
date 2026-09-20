import { basePrisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { provisionChurch, removeChurch, roleId } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * The money, checked against the running API rather than taken on trust.
 *
 * Everything asserted here is a claim the giving screens make to a treasurer: that a recorded gift
 * appears in the ledger, in the filtered list and in the totals for its window; that the totals are
 * the server's arithmetic rather than a sum of whatever the page happened to hold; that a mistake is
 * voided with a reason and the original stays; that reading a transaction to print a receipt writes
 * nothing; that the chained ledger notices a row somebody edited by hand; and that another church
 * can reach none of it.
 *
 * It runs inside a **probe church of its own**, so the seeded church's ledger is not filled with
 * probe gifts and the cleanup is the sweep in `lib/provision` — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/finance-ledger.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'finance-probe-church';
const PROBE_EMAIL = 'probe-treasurer@finance.test';
const PROBE_PASSWORD = 'finance-probe-password';
const PROBE_NAME = 'Finance Probe Treasurer';

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

interface TitheRow {
  id: string;
  txCode: string;
  donorName: string;
  amount: number;
  method: string;
  category: string;
  memberId: string | null;
  member?: { firstName: string; lastName: string } | null;
  receivedAt: string;
  updatedAt: string;
}

interface OfferingRow {
  id: string;
  txCode: string;
  amount: number;
  serviceId: string | null;
  service?: { title: string } | null;
}

/**
 * A list answer, which is its own envelope: `data`, `meta` and — on the giving ledgers — `totals` sit
 * side by side at the top level rather than inside `data` the way a single record does.
 */
type Ledger<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; pages: number }; totals: { amount: number } };

function ledger<T>(answer: Answer): Ledger<T> | null {
  const body = answer.body as Partial<Ledger<T>> | null;
  return body?.meta ? { data: body.data ?? [], meta: body.meta, totals: body.totals ?? { amount: 0 } } : null;
}

interface Summary {
  period: { from: string | null; to: string | null };
  giving: {
    tithes: { total: number; count: number };
    offerings: { total: number; count: number };
    total: number;
  };
  projects: { cash: number; pledges: number; received: number };
  welfare: { disbursed: number; awaitingPayment: number; declined: number; openCases: number };
  charity: { total: number; count: number };
  tithesByMethod: Array<{ method: string; amount: number; count: number }>;
  tithesByCategory: Array<{ category: string; amount: number; count: number }>;
  offeringsByMethod: Array<{ method: string; amount: number; count: number }>;
}

const money = (value: number) => value.toFixed(2);

/** Today, the way the console writes it: the API takes `YYYY-MM-DD` and means the whole day. */
const today = () => new Date().toISOString().slice(0, 10);

async function main(): Promise<void> {
  await waitForSignInBudget(API, 3, (line) => console.log(line));

  console.log('1. A probe church is provisioned');
  const probe = await provisionChurch({
    name: 'Finance Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  check('the probe church exists', Boolean(probe.organizationId));

  const signedIn = await call('POST', '/api/auth/login', undefined, {
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  const token = data<{ token: string }>(signedIn)?.token ?? '';
  check('its treasurer can sign in', token.length > 0, errorOf(signedIn));

  // The seeded church signs in now and its giving is read before anything is recorded, so the last
  // section can prove the probe's money never moved it.
  const houseSignIn = await call('POST', '/api/auth/login', undefined, {
    email: process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke',
    password: process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025',
  });
  const houseToken = data<{ token: string }>(houseSignIn)?.token ?? '';
  check('the seeded church can sign in', houseToken.length > 0, errorOf(houseSignIn));
  const houseBefore = data<Summary>(await call('GET', '/api/finance/summary', houseToken));
  const houseId = data<{ organization: { id: string } }>(await call('GET', '/api/auth/me', houseToken))?.organization.id ?? '';

  // A member to file a gift against, so "associated with a member" is exercised rather than assumed.
  const member = data<{ id: string; firstName: string }>(
    await call('POST', '/api/members', token, {
      firstName: 'Grace',
      lastName: 'Wanjiru',
      location: 'Probe Congregation',
      envelopeNumber: 'ENV-9001',
    }),
  );
  check('a member is enrolled to give against', Boolean(member?.id));

  // A second church, created mid-run to prove its register is fenced off — declared here so the
  // cleanup below reaches it even when a check in between fails.
  let stranger: { id: string } | null = null;
  const strangerEmail = '';

  try {
    console.log('\n2. A tithe is recorded, and appears in the ledger it belongs to');
    const recorded = await call('POST', '/api/finance/tithes', token, {
      memberId: member?.id,
      donorName: 'Grace Wanjiru',
      envelopeNo: 'ENV-9001',
      amount: 1500,
      method: 'mpesa',
      category: 'Tithe',
      reference: 'PROBE-MPESA-1',
      receivedAt: today(),
    });
    const tithe = data<TitheRow>(recorded);
    check('recording a tithe succeeds', recorded.status === 201, errorOf(recorded));
    check('it is issued a code from the year series', /^TX-\d{4}-\d{4}$/.test(tithe?.txCode ?? ''), tithe?.txCode ?? 'none');
    check('the money is stored exactly as keyed', money(tithe?.amount ?? 0) === money(1500), String(tithe?.amount));

    const readBack = data<TitheRow>(await call('GET', `/api/finance/tithes/${tithe?.id}`, token));
    check('reading it back names the member on the register', readBack?.member?.firstName === 'Grace', readBack?.member?.firstName ?? 'none');

    console.log('\n3. The list endpoint filters and totals on the server');
    const bySearch = ledger<TitheRow>(await call('GET', `/api/finance/tithes?q=${encodeURIComponent('PROBE-MPESA-1')}`, token));
    check('a search finds it by its reference', bySearch?.meta.total === 1, `got ${bySearch?.meta.total}`);
    check(
      'and the filtered total is the server’s, not the page’s',
      money(bySearch?.totals.amount ?? 0) === money(1500),
      `got ${bySearch?.totals.amount}`,
    );

    const byMember = ledger<TitheRow>(await call('GET', `/api/finance/tithes?memberId=${member?.id}`, token));
    check('filtering by giver finds it', byMember?.meta.total === 1, `got ${byMember?.meta.total}`);

    const tooSmall = ledger<TitheRow>(await call('GET', '/api/finance/tithes?minAmount=100000', token));
    check('an amount floor excludes it', tooSmall?.meta.total === 0, `got ${tooSmall?.meta.total}`);

    const byMethod = ledger<TitheRow>(await call('GET', '/api/finance/tithes?method=cheque', token));
    check('a method filter that does not match excludes it', byMethod?.meta.total === 0, `got ${byMethod?.meta.total}`);

    const paged = ledger<TitheRow>(await call('GET', '/api/finance/tithes?pageSize=1&sort=oldest', token));
    check('paging reports the whole filtered count, not the page', paged?.meta.pageSize === 1 && (paged?.meta.total ?? 0) >= 1);

    console.log('\n4. Totals are the server’s, for the window asked for');
    const month = data<Summary>(await call('GET', `/api/finance/summary?from=${today()}&to=${today()}`, token));
    check('the window is echoed back with its bounds', month?.period.from !== null && month?.period.to !== null);
    check(
      'the summary total matches the ledger total for the same window',
      money(month?.giving.tithes.total ?? 0) === money(1500),
      `${month?.giving.tithes.total} vs 1500`,
    );
    // A bare date for `to` has to mean the whole of that day, or "today" would exclude the gift
    // recorded this morning — which is the day a treasurer is looking at the figure.
    check('a gift received today falls inside a window that ends today', month?.giving.tithes.count === 1, `got ${month?.giving.tithes.count}`);
    check(
      'the split by method adds up to the same total',
      money((month?.tithesByMethod ?? []).reduce((sum, row) => sum + row.amount, 0)) === money(month?.giving.tithes.total ?? 0),
    );

    console.log('\n5. Offerings are the same ledger, filed against a gathering');
    const service = data<{ id: string; title: string }>(
      await call('POST', '/api/services', token, {
        title: 'Probe Sunday Service',
        venue: 'Probe Sanctuary',
        heldAt: new Date().toISOString(),
      }),
    );
    check('a gathering exists to file the plate against', Boolean(service?.id));

    const offeringRecorded = await call('POST', '/api/finance/offerings', token, {
      serviceId: service?.id,
      amount: 4200,
      method: 'cash',
      category: 'Sunday Offering',
      receivedAt: today(),
    });
    const offering = data<OfferingRow>(offeringRecorded);
    check('recording an offering succeeds', offeringRecorded.status === 201, errorOf(offeringRecorded));
    check('it is issued a code from its own year series', /^OF-\d{4}-\d{4}$/.test(offering?.txCode ?? ''), offering?.txCode ?? 'none');
    check('the ledger row carries the gathering it was taken at', offering?.service?.title === 'Probe Sunday Service');

    const unknownService = await call('POST', '/api/finance/offerings', token, {
      serviceId: '00000000-0000-4000-8000-000000000000',
      amount: 100,
      method: 'cash',
    });
    check('an offering cannot be filed against a gathering that does not exist', unknownService.status === 400, `got ${unknownService.status}`);

    const offerings = ledger<OfferingRow>(await call('GET', `/api/finance/offerings?serviceId=${service?.id}`, token));
    check('the offering ledger filters by gathering', offerings?.meta.total === 1, `got ${offerings?.meta.total}`);

    console.log('\n5b. Money is refused before it can be rounded, and the register is fenced');
    // `toFixed(2)` at the storage boundary would *round* a sub-cent rather than refuse it — recording
    // 0.005 as 0.01 books a cent nobody gave. The schema must refuse it before that boundary.
    for (const amount of [0, -5, 0.005, 999999999999, Number.NaN]) {
      const refused = await call('POST', '/api/finance/tithes', token, {
        donorName: 'Edge Probe',
        amount,
        method: 'cash',
      });
      check(`a gift of ${amount} is refused before storage`, refused.status === 400, `got ${refused.status}`);
    }
    const cents = await call('POST', '/api/finance/tithes', token, {
      donorName: 'Cents Probe',
      amount: 33.33,
      method: 'cash',
    });
    const centsRow = data<TitheRow>(cents);
    check('a cents amount is stored exactly as keyed', cents.status === 201 && money(centsRow?.amount ?? 0) === money(33.33), errorOf(cents));

    // Member ids are global and the FK is tenant-blind; only the service layer's register check
    // separates one church's roll from another's — for a gift *and* for the certificate that cites it.
    const roleKey = await roleId('admin');
    stranger = await basePrisma.organization.create({
      data: {
        name: 'Finance Probe Stranger Church',
        slug: `${PROBE_SLUG}-stranger-${Date.now()}`,
      },
    });
    const strangerEmail = `stranger-${Date.now()}@finance.test`;
    await basePrisma.user.create({
      data: {
        name: 'Stranger Probe Admin',
        email: strangerEmail,
        passwordHash: await hashPassword('stranger-probe-password'),
        roleId: roleKey,
        memberships: { create: { organizationId: stranger.id, roleId: roleKey, isDefault: true } },
      },
    });
    const strangerMember = await basePrisma.member.create({
      data: {
        organizationId: stranger.id,
        memberId: 'MBR-9001',
        firstName: 'Foreign',
        lastName: 'Member',
        location: 'Probe',
      },
    });
    check('a second church with its own member exists to be fenced off', Boolean(strangerMember.id));

    const crossGift = await call('POST', '/api/finance/tithes', token, {
      memberId: strangerMember.id,
      donorName: 'Foreign Member',
      amount: 100,
      method: 'cash',
    });
    check('a gift cannot be filed against another church\u2019s member', crossGift.status === 400, `got ${crossGift.status}: ${errorOf(crossGift)}`);
    const crossCert = await call('POST', '/api/certificates', token, {
      kind: 'baptism',
      fullName: 'Cross Tenant Cert',
      memberId: strangerMember.id,
      ceremonyDate: new Date().toISOString(),
    });
    check('a certificate cannot cite another church\u2019s member', crossCert.status === 400, `got ${crossCert.status}: ${errorOf(crossCert)}`);

    // A certificate from the probe church's own register must still issue cleanly.
    const ownCert = await call('POST', '/api/certificates', token, {
      kind: 'baptism',
      fullName: 'Grace Wanjiru',
      memberId: member?.id,
      ceremonyDate: new Date().toISOString(),
    });
    const ownCertRow = data<{ serial: string; member?: { firstName: string } | null }>(ownCert);
    check(
      'a certificate on the church\u2019s own register still issues',
      ownCert.status === 201 && /^BAP-/.test(ownCertRow?.serial ?? '') && ownCertRow?.member?.firstName === 'Grace',
      errorOf(ownCert),
    );

    console.log('\n5c. A ledger stays exact when six clerks key at once');
    const concurrent = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        call('POST', '/api/finance/tithes', token, {
          donorName: `Concurrent Probe ${index + 1}`,
          amount: 10,
          method: 'cash',
        }),
      ),
    );
    check('all six land', concurrent.every((r) => r.status === 201), concurrent.filter((r) => r.status !== 201).map((r) => `${r.status}: ${errorOf(r)}`).join('; ') || 'none');
    const concurrentCodes = concurrent.map((r) => (r.body as { data?: { txCode?: string } })?.data?.txCode ?? '');
    check('no two clerks take the same code', new Set(concurrentCodes).size === 6, concurrentCodes.join(', '));
    const concurrentLedger = ledger<TitheRow>(await call('GET', '/api/finance/tithes?q=Concurrent+Probe', token));
    check(
      'and the ledger totals exactly what was keyed',
      money(concurrentLedger?.totals.amount ?? 0) === money(60),
      `got ${concurrentLedger?.totals.amount}`,
    );

    console.log('\n5d. The wider ledger — projects, welfare, charity — and the empty window');
    // A window with nothing in it must say zero, not null and not last month's numbers.
    const empty = data<Summary>(await call('GET', '/api/finance/summary?from=2030-01-01&to=2030-01-02', token));
    check(
      'an empty period reads as zeros across every block',
      money(empty?.giving.tithes.total ?? -1) === money(0) &&
        (empty?.giving.tithes.count ?? -1) === 0 &&
        money(empty?.projects.cash ?? -1) === money(0) &&
        money(empty?.welfare.disbursed ?? -1) === money(0) &&
        money(empty?.charity.total ?? -1) === money(0),
      JSON.stringify(empty?.period),
    );

    const project = data<{ id: string; name: string }>(
      await call('POST', '/api/finance/projects', token, {
        name: 'Probe Roof Fund',
        targetAmount: 500000,
      }),
    );
    check('a project exists to receive a contribution', Boolean(project?.id), String(!project?.id));
    const contribution = await call('POST', `/api/finance/projects/${project?.id}/contributions`, token, {
      memberId: member?.id,
      donorName: 'Grace Wanjiru',
      amount: 2500,
      method: 'mpesa',
    });
    const contributionRow = data<{ txCode: string }>(contribution);
    check(
      'a project contribution is recorded from its own series',
      contribution.status === 201 && /^PC-\d{4}-/.test(contributionRow?.txCode ?? ''),
      errorOf(contribution),
    );

    const welfareCase = data<{ id: string; caseCode: string }>(
      await call('POST', '/api/finance/welfare', token, {
        memberId: member?.id,
        beneficiaryName: 'Grace Wanjiru',
        amount: 8000,
        purpose: 'Probe: school fees after a layoff',
      }),
    );
    check('a welfare case opens from its own series', /^WF-\d{4}-/.test(welfareCase?.caseCode ?? ''), welfareCase?.caseCode ?? 'none');
    const decided = await call('POST', `/api/finance/welfare/${welfareCase?.id}/decision`, token, { decision: 'approved' });
    const disbursed = await call('POST', `/api/finance/welfare/${welfareCase?.id}/disburse`, token, {});
    check(
      'approval and payout are two separate acts, both accepted in order',
      decided.status === 200 && disbursed.status === 200,
      `${decided.status}, ${disbursed.status}`,
    );
    const paidTwice = await call('POST', `/api/finance/welfare/${welfareCase?.id}/disburse`, token, {});
    check('and paying out twice is refused', paidTwice.status === 409, `got ${paidTwice.status}`);

    const charity = await call('POST', '/api/finance/charity', token, {
      item: 'Probe food parcel',
      initiative: 'Probe Outreach',
      amount: 3200.5,
    });
    check('a charity spend is recorded with cents intact', charity.status === 201, errorOf(charity));

    // The summary must now carry exactly what was just written, per block — the reconciliation the
    // treasurer trusts when the screen and the ledger disagree.
    const wider = data<Summary>(await call('GET', '/api/finance/summary', token));
    check(
      'the summary carries the contribution under cash, not pledges',
      money(wider?.projects.cash ?? 0) === money(2500) && money(wider?.projects.pledges ?? 0) === money(0),
      `cash ${wider?.projects.cash}, pledges ${wider?.projects.pledges}`,
    );
    check(
      'the welfare case reads as disbursed, not awaiting',
      money(wider?.welfare.disbursed ?? 0) === money(8000) && money(wider?.welfare.awaitingPayment ?? 0) === money(0),
      `disbursed ${wider?.welfare.disbursed}, awaiting ${wider?.welfare.awaitingPayment}`,
    );
    check('and the charity spend lands in its own block', money(wider?.charity.total ?? 0) === money(3200.5), String(wider?.charity.total));

    console.log('\n6. A mistake is voided with a reason, never edited away');
    const beforeVoid = data<Summary>(await call('GET', '/api/finance/summary', token));
    const voided = await call(
      'DELETE',
      `/api/finance/tithe/${tithe?.id}?reason=wrong_amount&reasonLabel=${encodeURIComponent('Keyed 1500 instead of 150')}`,
      token,
    );
    check('voiding is allowed for an administrator', voided.status < 300, errorOf(voided));

    const afterVoid = ledger<TitheRow>(await call('GET', '/api/finance/tithes', token));
    check('the voided gift leaves the live ledger', (afterVoid?.data ?? []).every((row) => row.id !== tithe?.id));
    const summaryAfterVoid = data<Summary>(await call('GET', '/api/finance/summary', token));
    check(
      'the totals fall by exactly the voided amount',
      money((beforeVoid?.giving.tithes.total ?? 0) - (summaryAfterVoid?.giving.tithes.total ?? 0)) === money(1500),
      `${beforeVoid?.giving.tithes.total} → ${summaryAfterVoid?.giving.tithes.total}`,
    );

    const audit = data<Array<{ action: string; summary: string }>>(
      await call('GET', '/api/finance/audit?pageSize=100', token),
    ) ?? [];
    const voidLine = audit.find((entry) => entry.action === 'voided');
    check('the ledger keeps a line for the void', Boolean(voidLine));
    check('and the line carries the reason somebody gave', (voidLine?.summary ?? '').includes('Keyed 1500'), voidLine?.summary ?? 'none');

    const trash = data<Array<{ id: string; entityId: string; reasonLabel: string }>>(
      await call('GET', '/api/finance/trash', token),
    ) ?? [];
    const retired = trash.find((row) => row.entityId === tithe?.id);
    check('the voided gift is in the finance trash', Boolean(retired));
    check('with the reason its clerk gave kept beside it', (retired?.reasonLabel ?? '').includes('Keyed 1500'), retired?.reasonLabel ?? 'none');

    if (retired) {
      const restored = await call('POST', `/api/finance/trash/${retired.id}/restore`, token, {});
      check('it can be put back', restored.status < 300, errorOf(restored));
      const afterRestore = ledger<TitheRow>(await call('GET', `/api/finance/tithes?q=${encodeURIComponent('PROBE-MPESA-1')}`, token));
      check('and it returns to the ledger', afterRestore?.meta.total === 1, `got ${afterRestore?.meta.total}`);
      const summaryAfterRestore = data<Summary>(await call('GET', '/api/finance/summary', token));
      check(
        'with the totals whole again',
        money(summaryAfterRestore?.giving.tithes.total ?? 0) === money(beforeVoid?.giving.tithes.total ?? 0),
      );
    }

    console.log('\n7. The chained ledger notices a row edited by hand');
    const verified = data<{ entries: number; valid: boolean; brokenAt: number | null; detail: string | null }>(
      await call('GET', '/api/finance/audit/verify', token),
    );
    check('the chain verifies while nothing has been touched', verified?.valid === true, verified?.detail ?? '');

    const target = await basePrisma.financeAuditEntry.findFirst({
      where: { organizationId: probe.organizationId },
      orderBy: { sequence: 'asc' },
    });
    if (!target) {
      check('there is an entry to tamper with', false, 'the probe church wrote no ledger entries');
    } else {
      await basePrisma.financeAuditEntry.update({
        where: { id: target.id },
        data: { summary: `${target.summary} (edited outside the API)` },
      });
      const broken = data<{ valid: boolean; brokenAt: number | null; detail: string | null }>(
        await call('GET', '/api/finance/audit/verify', token),
      );
      check('tampering with an entry is reported', broken?.valid === false);
      check('and the entry it happened at is named', broken?.brokenAt === target.sequence, `got ${broken?.brokenAt} for ${target.sequence}`);
      check('with a reason an auditor can act on', (broken?.detail ?? '').length > 0, broken?.detail ?? 'none');

      await basePrisma.financeAuditEntry.update({ where: { id: target.id }, data: { summary: target.summary } });
      const healed = data<{ valid: boolean }>(await call('GET', '/api/finance/audit/verify', token));
      check('and restoring the original text verifies again', healed?.valid === true);
    }

    console.log('\n8. Printing a receipt reads, and writes nothing');
    const ledgerBeforePrint = (await basePrisma.financeAuditEntry.count({ where: { organizationId: probe.organizationId } })) ?? 0;
    const firstRead = data<TitheRow>(await call('GET', `/api/finance/tithes/${tithe?.id}`, token));
    const secondRead = data<TitheRow>(await call('GET', `/api/finance/tithes/${tithe?.id}`, token));
    const ledgerAfterPrint = await basePrisma.financeAuditEntry.count({ where: { organizationId: probe.organizationId } });
    check('reading a transaction twice writes no ledger line', ledgerBeforePrint === ledgerAfterPrint, `${ledgerBeforePrint} → ${ledgerAfterPrint}`);
    check('and changes nothing on the transaction', firstRead?.updatedAt === secondRead?.updatedAt);

    console.log('\n9. Another church can reach none of it');
    const houseAfter = data<Summary>(await call('GET', '/api/finance/summary', houseToken));
    check(
      'the probe church’s giving never entered the other church’s totals',
      money(houseAfter?.giving.total ?? 0) === money(houseBefore?.giving.total ?? 0),
      `${houseBefore?.giving.total} → ${houseAfter?.giving.total}`,
    );
    check(
      'reading the probe church’s tithe by id is refused',
      (await call('GET', `/api/finance/tithes/${tithe?.id}`, houseToken)).status === 404,
    );
    check(
      'voiding it from outside is refused',
      (await call('DELETE', `/api/finance/tithe/${tithe?.id}?reason=other&reasonLabel=${encodeURIComponent('Not mine')}`, houseToken)).status >= 400,
    );
    check(
      'restoring it from outside is refused',
      (await call('POST', `/api/finance/trash/${tithe?.id}/restore`, houseToken, {})).status >= 400,
    );
    const houseLedger = ledger<TitheRow>(await call('GET', `/api/finance/tithes?q=${encodeURIComponent('PROBE-MPESA-1')}`, houseToken));
    check('and its own ledger never lists it', houseLedger?.meta.total === 0, `got ${houseLedger?.meta.total}`);
  } finally {
    await removeChurch(stranger?.id ?? '', { adminEmails: [strangerEmail] });
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL],
      // The refusals in the last section were written into the *seeded* church's log and name the probe.
      residualAudit: { organizationId: houseId, mentions: [PROBE_NAME, PROBE_EMAIL, 'Probe Sunday Service'] },
    });
    console.log('\nThe probe church, its ledger and its rows were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} finance checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nFinance ledger check could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
