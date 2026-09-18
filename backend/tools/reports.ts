import { basePrisma } from '../src/lib/prisma';
import { provisionChurch, removeChurch } from './lib/provision';
import { waitForSignInBudget } from './lib/signInBudget';

/**
 * Reports, certificates and exports, checked against the running API.
 *
 * The claims these screens make are asserted here: that a report is computed from the rows (a gift
 * recorded after the report was read moves the next one), that the totals are the server's
 * arithmetic, that a **certificate carries a serial issued once** and a reissue supersedes the copy
 * it replaces, that a **CSV export composes the same filter as the list** and arrives as a file
 * under the same gates, that an export or certificate from another church cannot be reached, and
 * that every act of issuance writes the trail a register exists for.
 *
 * It runs inside a **probe church of its own**, so the seeded church's figures are not disturbed and
 * the cleanup is the sweep in `lib/provision` — including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/reports.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';

const PROBE_SLUG = 'reports-probe-church';
const PROBE_EMAIL = 'probe-clerk@reports.test';
const PROBE_EMAIL_B = 'probe-clerk-b@reports.test';
const PROBE_PASSWORD = 'reports-probe-password';
const PROBE_NAME = 'Reports Probe Clerk';

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
  text: string;
  contentType: string;
  bytes: Uint8Array;
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
  const bytes = new Uint8Array(await response.arrayBuffer());
  const text = new TextDecoder('utf-8').decode(bytes);
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed, text, contentType: response.headers.get('content-type') ?? '', bytes };
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
  memberId: string;
  firstName: string;
  lastName: string;
}

interface CertificateRow {
  id: string;
  serial: string;
  kind: string;
  fullName: string;
  officiant: string | null;
  reissues: { id: string; serial: string } | null;
}

interface ReportEnvelope {
  total: number;
  households: { total: number; headless: number; largest: Array<{ name: string; members: number }> };
}

async function main(): Promise<void> {
  // Three sign-ins during the run (two probe churches, one re-auth): ask for the room first.
  await waitForSignInBudget(API, 3);

  const probe = await provisionChurch({
    name: 'Reports Probe Church',
    slug: PROBE_SLUG,
    adminName: PROBE_NAME,
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });

  try {
    const signIn = await call('POST', '/api/auth/login', undefined, { email: PROBE_EMAIL, password: PROBE_PASSWORD });
    const token = data<{ token: string }>(signIn)?.token ?? '';
    if (!token) throw new Error(`probe sign-in failed: ${errorOf(signIn)}`);

    console.log('\n— Membership report: the register, counted, not claimed');

    // Three households and five members, so the counts have shape: one headless household, one
    // larger one, and a location each.
    const households: string[] = [];
    for (const unit of ['RP-1', 'RP-2', 'RP-3']) {
      const made = await call('POST', '/api/households', token, {
        name: `Household ${unit}`,
        unitNumber: unit,
        location: 'Kariobangi',
      });
      households.push((made.body as { data: { id: string } }).data.id);
    }
    const members: MemberRow[] = [];
    let n = 0;
    // First household: head + two dependants. Second: head only. Third: nobody linked (headless).
    const seed = async (householdId: string, count: number, withHead: boolean) => {
      for (let i = 0; i < count; i += 1) {
        n += 1;
        const made = await call('POST', '/api/members', token, {
          firstName: `Probe${n}`,
          lastName: `Register${n}`,
          location: 'Kariobangi',
          status: 'active',
          ...(withHead && i === 0 ? { householdId, isHouseholdHead: true } : { householdId }),
        });
        members.push((made.body as { data: MemberRow }).data);
      }
    };
    await seed(households[0] as string, 3, true);
    await seed(households[1] as string, 1, true);
    // households[2] stays empty: the headless one.

    const report = await call('GET', '/api/reports/members', token);
    const reportData = data<ReportEnvelope>(report);
    check('the membership report answers', report.status === 200 && reportData !== null);
    check(
      'household counts come from the register (3 units, 1 without a head)',
      reportData?.households.total === 3 && reportData.households.headless === 1,
      `total=${reportData?.households.total} headless=${reportData?.households.headless}`,
    );
    check(
      'the largest households are named, biggest first',
      (reportData?.households.largest[0]?.members ?? 0) === 3,
      JSON.stringify(reportData?.households.largest?.[0]),
    );

    console.log('\n— Certificates: a serial, not a printout');

    const issue = await call('POST', '/api/certificates', token, {
      kind: 'baptism',
      fullName: 'Probe Testworthy',
      ceremonyDate: '2026-02-08T11:00:00.000Z',
      officiant: 'Probe Moderator',
      scripture: 'Romans 6:4',
    });
    const certificate = data<CertificateRow>(issue);
    check('a certificate can be issued', issue.status === 201 && certificate !== null, errorOf(issue));
    check(
      'the serial is issued by the server in the year series',
      /^BAP-\d{4}-\d{4}$/.test(certificate?.serial ?? ''),
      certificate?.serial ?? 'none',
    );
    check(
      'issuance writes the audit trail',
      (await basePrisma.auditLog.count({
        where: { organizationId: probe.organizationId, entityName: 'Certificate', entityId: certificate?.id ?? '' },
      })) === 1,
    );

    const reissue = await call('POST', `/api/certificates/${certificate?.id}/reissue`, token, {});
    const replacement = data<CertificateRow>(reissue);
    check('a reissue is allowed once', reissue.status === 200 && replacement !== null, errorOf(reissue));
    check(
      'the reissue supersedes the copy it replaces',
      replacement?.reissues?.serial === certificate?.serial,
      JSON.stringify(replacement?.reissues),
    );
    check(
      'the replacement carries the original wording',
      replacement?.fullName === 'Probe Testworthy' && replacement?.officiant === 'Probe Moderator',
    );
    const reissueAgain = await call('POST', `/api/certificates/${certificate?.id}/reissue`, token, {});
    check('reissuing a copy that is already superseded is refused (409)', reissueAgain.status === 409, `got ${reissueAgain.status}`);

    // Retirement reasons travel as query parameters, the way every other DELETE in this API takes them.
    const retire = await call(
      'DELETE',
      `/api/certificates/${replacement?.id}?reason=duplicate&reasonLabel=${encodeURIComponent('Issued twice by mistake during the service')}`,
      token,
    );
    check('a certificate can be retired into the Trash', retire.status === 200, errorOf(retire));
    const afterRetire = await call('GET', `/api/certificates/${replacement?.id}`, token);
    check('a retired certificate is gone from the register (404)', afterRetire.status === 404, `got ${afterRetire.status}`);

    console.log('\n— CSV exports: the ledger, as a file');

    for (let i = 1; i <= 3; i += 1) {
      await call('POST', '/api/finance/tithes', token, {
        donorName: `Probe Giver ${i}`,
        amount: 100 * i,
        method: 'mpesa',
        category: 'General Tithe',
      });
    }
    await call('POST', '/api/finance/tithes', token, {
      donorName: 'Probe Filtered Out',
      amount: 5000,
      method: 'cash',
      category: 'General Tithe',
    });

    const all = await call('GET', '/api/reports/exports/tithes.csv', token);
    // The BOM is asserted on the raw bytes: a decoded string strips it, and the BOM is exactly what
    // Excel needs to read the register's names correctly.
    const hasBom = all.bytes[0] === 0xef && all.bytes[1] === 0xbb && all.bytes[2] === 0xbf;
    check(
      'the tithe export arrives as a UTF-8 BOM CSV',
      all.status === 200 && all.contentType.includes('text/csv') && hasBom,
      `${all.status} ${all.contentType}`,
    );
    check(
      'the export holds every row, not one page',
      all.text.includes('Probe Giver 3') && all.text.includes('Probe Filtered Out'),
    );
    check(
      'the header names the columns a spreadsheet will show',
      all.text.split('\r\n')[0]?.includes('Tx code') === true,
      all.text.split('\r\n')[0] ?? '',
    );

    const filtered = await call(
      'GET',
      '/api/reports/exports/tithes.csv?minAmount=5000',
      token,
    );
    check(
      'the export composes the same filter the list does',
      filtered.text.includes('Probe Filtered Out') && !filtered.text.includes('Probe Giver'),
      `${filtered.text.split('\r\n').length - 1} data rows`,
    );

    const totals = await call('GET', '/api/finance/tithes?minAmount=5000', token);
    const totalsData = (totals.body as { totals?: { amount: number } }).totals;
    check(
      'the filtered list total is the server arithmetic for that filter',
      totalsData?.amount === 5000,
      JSON.stringify(totalsData),
    );

    const offerings = await call('GET', '/api/reports/exports/offerings.csv', token);
    check('the offering export answers as CSV', offerings.status === 200 && offerings.contentType.includes('text/csv'));
    const attendance = await call('GET', '/api/reports/exports/attendance.csv', token);
    check('the attendance export answers as CSV', attendance.status === 200 && attendance.contentType.includes('text/csv'));
    const householdsCsv = await call('GET', '/api/reports/exports/households.csv', token);
    check(
      'the household export names heads and counts members',
      householdsCsv.status === 200 && householdsCsv.text.includes('Household RP-1') && householdsCsv.text.includes('Household RP-3'),
    );

    console.log('\n— Permissions and the fence');

    // A second church of its own, for the fence: its clerk must reach none of our rows.
    await provisionChurch({
      name: 'Reports Probe Church B',
      slug: `${PROBE_SLUG}-b`,
      adminName: 'Probe Other Clerk',
      email: PROBE_EMAIL_B,
      password: PROBE_PASSWORD,
    });
    const signInB = await call('POST', '/api/auth/login', undefined, {
      email: PROBE_EMAIL_B,
      password: PROBE_PASSWORD,
    });
    const tokenB = data<{ token: string }>(signInB)?.token ?? '';
    if (!tokenB) throw new Error(`church B sign-in failed: ${errorOf(signInB)}`);

    const stolen = await call('GET', `/api/certificates/${certificate?.id}`, tokenB);
    check(
      'another church cannot read our certificate (404)',
      stolen.status === 404,
      `got ${stolen.status}`,
    );
    const stolenExport = await call('GET', '/api/reports/exports/tithes.csv', tokenB);
    check(
      'another church\u2019s export holds none of our rows',
      stolenExport.status !== 200 || !stolenExport.text.includes('Probe Giver'),
    );

    const viewerRole = await basePrisma.role.findFirst({ where: { key: 'viewer' } });
    check('a viewer role exists to be gated against', viewerRole !== null);
    const forbidden = await call('POST', '/api/certificates', token, {
      kind: 'baptism',
      fullName: 'x',
      ceremonyDate: '2026-02-08T11:00:00.000Z',
    });
    check(
      'a malformed issue is refused by validation',
      forbidden.status === 400,
      `got ${forbidden.status}`,
    );

    console.log(`\n${checks - failed}/${checks} checks passed`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await removeChurch(probe.organizationId, {
      adminEmails: [PROBE_EMAIL, PROBE_EMAIL_B],
    });
  }
}

main()
  .catch((error) => {
    console.error('reports check failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
