import { basePrisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

/**
 * One church cannot see or touch another's records.
 *
 * This is the test that matters for multi-tenancy, and it is the one thing a unit test of the
 * tenant-scoped client cannot prove, because the guarantee lives in the request path: token →
 * membership → church context → every query. So it runs against a live API, like `smoke.mjs`.
 *
 * It provisions a second church, signs in as that church's administrator, and then tries — with the
 * API's own endpoints — to read, change, retire and restore the first church's rows. Every attempt
 * must fail, and every list must come back empty rather than filtered. The second church is removed
 * again at the end, including when a check fails.
 *
 *   API_URL=http://127.0.0.1:4001 npx tsx tools/tenant-isolation.ts
 */

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';

const PROBE_SLUG = 'isolation-probe-church';
const PROBE_EMAIL = 'probe-admin@isolation.test';
const PROBE_PASSWORD = 'isolation-probe-password';
const PROBE_NAME = 'Probe Administrator';

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
  const response = await fetch(`${API_URL}${path}`, {
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

async function signInAs(email: string, password: string): Promise<string | null> {
  const answer = await call('POST', '/api/auth/login', undefined, { email, password });
  return data<{ token: string }>(answer)?.token ?? null;
}

async function churchOf(token: string): Promise<{ id: string; name: string } | null> {
  return data<{ organization: { id: string; name: string } }>(await call('GET', '/api/auth/me', token))?.organization ?? null;
}

/** Provision a church the way an operator would: there is deliberately no endpoint for this. */
async function roleIdOf(key: string): Promise<string> {
  const role = await basePrisma.role.findFirst({ where: { key } });
  if (!role) throw new Error(`the ${key} role is missing — seed the database first`);
  return role.id;
}

async function provisionProbeChurch(): Promise<{ organizationId: string; userId: string; adminRoleId: string }> {
  const adminRoleId = await roleIdOf('admin');
  const organization = await basePrisma.organization.create({
    data: { name: 'Isolation Probe Church', slug: PROBE_SLUG },
  });
  const user = await basePrisma.user.create({
    data: {
      name: PROBE_NAME,
      email: PROBE_EMAIL,
      passwordHash: await hashPassword(PROBE_PASSWORD),
      roleId: adminRoleId,
      memberships: { create: { organizationId: organization.id, roleId: adminRoleId, isDefault: true } },
    },
  });

  return { organizationId: organization.id, userId: user.id, adminRoleId };
}

/**
 * Remove every trace of the probe church: its rows first, because the foreign keys point that way,
 * then the account and the church. Table names come from the schema, so a model added later is
 * covered too.
 */
async function removeProbeChurch(organizationId: string, houseOrganizationId: string): Promise<void> {
  // The probe account's own rows go with the church; a membership it was given in the *first* church
  // has that church's id, and leaves with the account (the relation cascades).
  const tenantTables = await basePrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.columns WHERE column_name = 'organizationId'`,
  );
  for (const { table_name: table } of tenantTables) {
    await basePrisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "organizationId" = $1`, organizationId);
  }

  // The run also *writes* into the first church: assigning the shared account a role there, and its
  // own refusals. Those rows name the probe account, so they are removed with it. Leaving them behind
  // is what made the next run fail its own "neither history mentions the other" check — the leak was
  // in the tool, not in the product, and a check that only passes on a clean database is worth very
  // little.
  await basePrisma.auditLog.deleteMany({
    where: {
      organizationId: houseOrganizationId,
      OR: [{ summary: { contains: PROBE_NAME } }, { summary: { contains: PROBE_EMAIL } }],
    },
  });

  await basePrisma.user.deleteMany({ where: { email: PROBE_EMAIL } });
  await basePrisma.organization.deleteMany({ where: { id: organizationId } });
}

async function main(): Promise<void> {
  console.log(`Tenant isolation → ${API_URL}`);

  const houseToken = await signInAs(EMAIL, PASSWORD);
  if (!houseToken) throw new Error(`could not sign in as ${EMAIL}`);
  const house = await churchOf(houseToken);
  if (!house) throw new Error('the first church did not come back from /api/auth/me');

  console.log(`\n1. The first church reaches its own records  (${house.name})`);
  const members = data<Array<{ id: string }>>(await call('GET', '/api/members?pageSize=5', houseToken)) ?? [];
  const announcements = data<Array<{ id: string }>>(await call('GET', '/api/communications/announcements?pageSize=5', houseToken)) ?? [];
  const tithes = data<Array<{ id: string }>>(await call('GET', '/api/finance/tithes?pageSize=5', houseToken)) ?? [];
  check('the register lists its members', members.length > 0, `got ${members.length}`);
  check('the noticeboard lists its announcements', announcements.length > 0, `got ${announcements.length}`);
  check('the tithe ledger lists its entries', tithes.length > 0, `got ${tithes.length}`);
  if (!members[0] || !announcements[0] || !tithes[0]) throw new Error('the first church has nothing to isolate');
  const [memberId, announcementId, titheId] = [members[0].id, announcements[0].id, tithes[0].id];

  console.log('\n2. A second church is provisioned');
  const probe = await provisionProbeChurch();
  try {
    const probeToken = await signInAs(PROBE_EMAIL, PROBE_PASSWORD);
    check('its administrator can sign in', Boolean(probeToken));
    if (!probeToken) return;
    check('and lands in its own church', (await churchOf(probeToken))?.id === probe.organizationId);

    console.log('\n3. It sees none of the first church’s records');
    check(
      'the register is empty, not filtered',
      data<unknown[]>(await call('GET', '/api/members?pageSize=50', probeToken))?.length === 0,
    );
    check(
      'the noticeboard is empty',
      data<unknown[]>(await call('GET', '/api/communications/announcements?pageSize=50', probeToken))?.length === 0,
    );
    check(
      'the tithe ledger is empty',
      data<unknown[]>(await call('GET', '/api/finance/tithes?pageSize=50', probeToken))?.length === 0,
    );
    const cards = data<{ cards: { membersTotal: number; giving: number } }>(
      await call('GET', '/api/reports/overview', probeToken),
    )?.cards;
    check('the home figures count nothing', cards?.membersTotal === 0 && cards.giving === 0, JSON.stringify(cards));
    check('the Trash is empty', data<unknown[]>(await call('GET', '/api/admin/trash?pageSize=50', probeToken))?.length === 0);
    // Its own sign-in is legitimately in its log; the first church's history is what must not be.
    const probeAudit =
      data<Array<{ actor: { email: string } | null }>>(
        await call('GET', '/api/admin/audit?pageSize=50', probeToken),
      ) ?? [];
    check(
      'the audit log holds only its own history',
      probeAudit.length > 0 && probeAudit.every((row) => row.actor?.email !== EMAIL),
      `${probeAudit.length} rows`,
    );

    console.log('\n4. It cannot reach a record of the first church’s by id');
    check('reading a member is refused', (await call('GET', `/api/members/${memberId}`, probeToken)).status === 404);
    check(
      'changing a member is refused',
      (await call('PATCH', `/api/members/${memberId}`, probeToken, { phone: '+254700000000' })).status === 404,
    );
    const retire = await call(
      'DELETE',
      `/api/members/${memberId}?reason=other&reasonLabel=${encodeURIComponent('cross-tenant probe')}`,
      probeToken,
    );
    check('retiring a member is refused', retire.status === 404, errorMessage(retire));
    check(
      'reading an announcement is refused',
      (await call('GET', `/api/communications/announcements/${announcementId}`, probeToken)).status === 404,
    );
    check('reading a tithe is refused', (await call('GET', `/api/finance/tithes/${titheId}`, probeToken)).status === 404);

    console.log('\n5. Its own records go in and come back out');
    const created = await call('POST', '/api/members', probeToken, {
      firstName: 'Probe',
      lastName: 'Member',
      phone: '+254700111222',
      location: 'Probe Congregation',
    });
    const probeMemberId = data<{ id: string }>(created)?.id;
    check('it can enrol its own member', Boolean(probeMemberId), errorMessage(created));
    check(
      'which the first church cannot read',
      probeMemberId !== undefined && (await call('GET', `/api/members/${probeMemberId}`, houseToken)).status === 404,
    );

    if (probeMemberId) {
      const retired = await call(
        'DELETE',
        `/api/members/${probeMemberId}?reason=other&reasonLabel=${encodeURIComponent('isolation probe')}`,
        probeToken,
      );
      check('it can retire that member', retired.status < 300, errorMessage(retired));

      const archive = data<Array<{ id: string }>>(
        await call('GET', '/api/admin/trash?entityName=Member', probeToken),
      );
      const archivedId = archive?.[0]?.id;
      check('and sees it in its own Trash', Boolean(archivedId), `got ${archive?.length} rows`);

      const houseTrash = data<Array<{ id: string }>>(
        await call('GET', '/api/admin/trash?entityName=Member&pageSize=100', houseToken),
      );
      check(
        'while the first church’s Trash does not contain it',
        archivedId !== undefined && !houseTrash?.some((row) => row.id === archivedId),
      );

      if (archivedId) {
        const stolen = await call('POST', `/api/members/trash/${archivedId}/restore`, houseToken);
        check('the first church cannot restore it', stolen.status === 404, errorMessage(stolen));
        const own = await call('POST', `/api/members/trash/${archivedId}/restore`, probeToken);
        check('and the second church can', own.status < 300, errorMessage(own));
      }
    }

    console.log('\n6. A session cannot be moved into a church it does not serve');
    check(
      'switching to the other church is refused',
      (await call('POST', '/api/auth/switch-organization', houseToken, { organizationId: probe.organizationId })).status === 403,
    );
    check(
      'switching to its own church is allowed',
      (await call('POST', '/api/auth/switch-organization', houseToken, { organizationId: house.id })).status < 300,
    );

    console.log('\n7. Neither church’s history mentions the other');
    const houseHistory =
      data<Array<{ summary: string | null }>>(
        await call('GET', `/api/admin/audit?q=${encodeURIComponent(PROBE_NAME)}`, houseToken),
      ) ?? [];
    check('the first church’s audit log does not name the second’s administrator', houseHistory.length === 0);

    console.log('\n8. One account serving two churches keeps a separate role in each');
    // The case memberships exist for: one login, two parishes, different authority in each. The rights
    // screen of one church must change the role it governs and no other.
    await basePrisma.organizationMember.create({
      data: { organizationId: house.id, userId: probe.userId, roleId: await roleIdOf('viewer'), isDefault: false },
    });
    const shared =
      data<Array<{ id: string; roleKey: string }>>(
        await call('GET', `/api/admin/users?q=${encodeURIComponent(PROBE_NAME)}`, houseToken),
      ) ?? [];
    check('the first church lists the account that serves it', shared.length === 1, `got ${shared.length}`);
    check('in the role it holds there, not the role it holds elsewhere', shared[0]?.roleKey === 'viewer', `got ${shared[0]?.roleKey}`);

    const changed =
      shared[0] === undefined
        ? null
        : await call('POST', `/api/admin/users/${shared[0].id}/role`, houseToken, { roleKey: 'staff' });
    check('changing that role is allowed', changed !== null && changed.status < 300, changed ? errorMessage(changed) : 'not listed');
    const probeMe = data<{ user: { roleKey: string } }>(await call('GET', '/api/auth/me', probeToken));
    check(
      'and the second church’s role for the same account is untouched',
      probeMe?.user.roleKey === 'admin',
      `got ${probeMe?.user.roleKey}`,
    );
  } finally {
    await removeProbeChurch(probe.organizationId, house.id);
    console.log('\nThe probe church and its rows were removed.');
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} isolation checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`\nIsolation test could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
