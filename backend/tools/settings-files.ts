import { basePrisma } from '../src/lib/prisma';

/**
 * Settings, files and data tools, checked against the running API.
 *
 * The claims asserted here are the ones a church takes on trust: that deleting a file puts it in the
 * Trash with a reason and an audit line (rather than vanishing into a column flip), that a file can
 * be *restored* from the Trash, that changing a preference is recorded with what changed, that the
 * data export is an audited admin act, and that the export bundle contains no credential material.
 *
 *   API_URL=http://127.0.0.1:4000 npx tsx tools/settings-files.ts
 */

const API = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';

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

function errorOf(answer: Answer): string {
  const body = answer.body as { error?: string } | null;
  return body?.error ?? `HTTP ${answer.status}`;
}

/** A one-pixel PNG, so the upload passes the signature check. */
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63fcffff3f030005fe02fea72d5e2b0000000049454e44ae426082',
  'hex',
).toString('base64');

async function main(): Promise<void> {
  console.log(`Settings & files → ${API}`);

  const session = data<{ token: string }>(
    await call('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } }),
  );
  if (!session) throw new Error(`could not sign in as ${EMAIL} — is the seeded church there?`);
  const token = session.token;

  console.log('\n1. A file is retired with a reason, not vanished');
  const upload = await call('POST', '/api/files', {
    token,
    body: { purpose: 'other', fileName: 'settings-check.png', mimeType: 'image/png', content: PNG },
  });
  check('an upload is accepted', upload.status === 201, `${upload.status} ${errorOf(upload)}`);
  const file = data<{ id: string; fileName: string }>(upload);
  if (!file) throw new Error('no file id — cannot continue');

  const noReason = await call('DELETE', `/api/files/${file.id}`, { token });
  check('deleting without a reason is refused', noReason.status === 400, `${noReason.status} ${errorOf(noReason)}`);

  const deleted = await call('DELETE', `/api/files/${file.id}?reason=wrong_entry&reasonLabel=Uploaded for the settings check`, { token });
  check('deleting with a reason works', deleted.status < 300, `${deleted.status} ${errorOf(deleted)}`);

  const archiveId = data<{ id: string }>(deleted)?.id ?? null;

  const gone = await call('GET', `/api/files/${file.id}`, { token });
  check('the deleted file no longer serves its bytes', gone.status === 404 || gone.status === 410, `got ${gone.status}`);

  const trash = await call('GET', '/api/admin/trash?pageSize=100', { token });
  const trashRows = (trash.body as { data?: Array<{ entityId: string; entityName: string }> })?.data ?? [];
  check(
    'the file sits in the Trash',
    trashRows.some((row) => row.entityId === file.id && row.entityName === 'StoredFile'),
    `${trashRows.length} rows`,
  );

  console.log('\n2. A file comes back from the Trash');
  if (archiveId) {
    const restored = await call('POST', `/api/admin/trash/${archiveId}/restore`, { token, body: {} });
    check('restore succeeds', restored.status < 300, `${restored.status} ${errorOf(restored)}`);
    const back = await call('GET', `/api/files/${file.id}/meta`, { token });
    check('and the file serves again', back.status === 200, `got ${back.status}`);
  } else {
    check('restore succeeds', false, 'no archive id returned');
  }

  console.log('\n3. Preferences are persisted with an audit line');
  const before = await call('GET', '/api/settings/preferences/notifications', { token });
  const original = data<{ value: Record<string, unknown> }>(before)?.value ?? {};

  const written = await call('PUT', '/api/settings/preferences/notifications', {
    token,
    body: { value: { ...original, volunteerReminderHoursBefore: 24 } },
  });
  check('a preference write is accepted', written.status < 300, `${written.status} ${errorOf(written)}`);

  const reread = await call('GET', '/api/settings/preferences/notifications', { token });
  check(
    'and survives a re-read',
    (data<{ value: Record<string, unknown> }>(reread)?.value?.volunteerReminderHoursBefore as number | undefined) === 24,
  );

  const audit = await call('GET', '/api/admin/audit?entityName=AppSetting&pageSize=5', { token });
  const auditRows = (audit.body as { data?: Array<{ summary: string }> })?.data ?? [];
  check(
    'and the change is in the audit log',
    auditRows.some((row) => row.summary.includes('notifications')),
    auditRows.map((row) => row.summary).join(' | ').slice(0, 120),
  );

  // Restore what the check changed, so the seeded church's settings are not bent by a test.
  await call('PUT', '/api/settings/preferences/notifications', { token, body: { value: original } });

  console.log('\n4. The data export is an admin act, and honest about what it holds');
  const staffRole = await basePrisma.role.findFirstOrThrow({ where: { key: 'staff' } });
  const orgId = (await basePrisma.organizationMember.findFirstOrThrow({
    where: { user: { email: EMAIL } },
    select: { organizationId: true },
  })).organizationId;
  const staffEmail = `settings-staff+${Date.now()}@praxis.test`;
  const staffUser = await basePrisma.user.create({
    data: {
      name: 'Settings Check Staff',
      email: staffEmail,
      passwordHash: (await basePrisma.user.findFirstOrThrow({ where: { email: EMAIL }, select: { passwordHash: true } })).passwordHash,
      memberships: { create: { organizationId: orgId, roleId: staffRole.id, isDefault: true } },
    },
  });
  try {
    const staffSession = data<{ token: string }>(
      await call('POST', '/api/auth/login', { body: { email: staffEmail, password: PASSWORD } }),
    );
    if (staffSession) {
      const refused = await call('GET', '/api/settings/export', { token: staffSession.token });
      check('a staff account cannot export the church', refused.status === 403, `got ${refused.status}`);
    } else {
      check('a staff account cannot export the church', false, 'staff sign-in failed');
    }
  } finally {
    await basePrisma.user.deleteMany({ where: { id: staffUser.id } });
  }

  const bundle = await call('GET', '/api/settings/export', { token });
  check('an administrator can export the church', bundle.status === 200, `${bundle.status} ${errorOf(bundle)}`);
  const bundleBody = JSON.stringify(bundle.body ?? {});
  check(
    'the bundle carries no credential material',
    !bundleBody.includes('passwordHash') && !bundleBody.includes('storageKey'),
  );
  check(
    'the bundle says what it is',
    data<{ format?: string }>(bundle)?.format === 'praxis.church-export/1',
  );

  const exportAudit = await call('GET', '/api/admin/audit?entityName=Organization&pageSize=10', { token });
  const exportRows = (exportAudit.body as { data?: Array<{ summary: string }> })?.data ?? [];
  check(
    'and the download is written into the church\u2019s audit log',
    exportRows.some((row) => row.summary.includes('Downloaded a copy')),
  );

  // The file the check uploaded is retired for real now that its assertions are done.
  const meta = await call('GET', `/api/files/${file.id}/meta`, { token });
  if (meta.status === 200) {
    await call('DELETE', `/api/files/${file.id}?reason=request&reasonLabel=Settings check cleanup`, { token });
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} settings & file checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`settings & files check could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
