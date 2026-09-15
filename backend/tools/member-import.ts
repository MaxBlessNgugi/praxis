import { basePrisma } from '../src/lib/prisma';

/**
 * A register arriving as a spreadsheet.
 *
 * Import is the one path that writes hundreds of rows from a document nobody has read line by line, so
 * it is verified against a live API rather than in a unit test: the report a clerk sees is the thing
 * under test, and the rules that decide it (the register's own schema, the duplicate keys, the dates)
 * only exist inside the running service.
 *
 * It drives the three questions the console asks — what columns are these, what would each row do,
 * what happened — plus the cases that go wrong in a parish office: a file with a BOM, a semicolon
 * delimiter, an Excel date serial, two people with the same name, and a second run of the same file.
 * Everything it writes is removed at the end, whether or not the checks passed.
 *
 *   API_URL=http://127.0.0.1:4001 npx tsx tools/member-import.ts
 */
const API = process.env.API_URL ?? 'http://localhost:4000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'bishop@destinysanctuary.co.ke';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'praxis-demo-2025';
const STARTED = new Date();

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
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

let checks = 0;
let failed = 0;
function check(what: string, passed: boolean, detail = ''): void {
  checks += 1;
  if (passed) console.log(`  ok   ${what}`);
  else {
    failed += 1;
    console.log(`  FAIL ${what}${detail ? ` — ${detail}` : ''}`);
  }
}

interface Report {
  headers: string[];
  rowCount: number;
  mapped: boolean;
  dryRun: boolean;
  missingRequired: string[];
  summary: { create: number; duplicate: number; invalid: number };
  rows: {
    row: number;
    name: string;
    status: string;
    errors: { field: string; message: string }[];
    duplicateOf?: { memberId: string; name: string; matchedOn: string; retired: boolean };
  }[];
  truncated: boolean;
  imported: number;
}

/** Every number the fixture uses, so the cleanup can find the rows without guessing at names. */
const PROBE_PHONES = [
  '+254712999001',
  '+254712999002',
  '+254712999003',
  '+254712999005',
  '+254712999010',
  '+254712999099',
  '+254702118663',
];

interface ListedMember {
  firstName: string;
  lastName: string;
  location: string;
  memberId: string;
  envelopeNumber: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  tags: string[];
}

async function findByPhone(token: string, fragment: string): Promise<ListedMember | null> {
  const answer = (await call('GET', `/api/members?q=${fragment}&pageSize=10`, token)).body as { data: ListedMember[] };
  return answer.data[0] ?? null;
}

async function main(): Promise<void> {
  const login = await call('POST', '/api/auth/login', undefined, { email: EMAIL, password: PASSWORD });
  const token = (login.body as { data: { token: string } }).data.token;
  check('signed in', Boolean(token));

  const existing = (await call('GET', '/api/members?pageSize=1', token)).body as { data: { phone: string; firstName: string; lastName: string }[] };
  const witness = existing.data[0];
  if (!witness) throw new Error('the register is empty — seed the database before running this');
  console.log(`  (a member already on the register: ${witness.firstName} ${witness.lastName} ${witness.phone})`);

  // A previous run may have left a second row for the witness; the oldest is the real one.
  const samePerson = await basePrisma.member.findMany({
    where: { firstName: witness.firstName, lastName: witness.lastName },
    orderBy: { memberId: 'asc' },
  });
  if (samePerson.length > 1) {
    await basePrisma.member.deleteMany({ where: { id: { in: samePerson.slice(1).map((row) => row.id) } } });
    console.log(`  (removed ${samePerson.length - 1} leftover row(s) from an earlier run)`);
  }

  const csv = [
    'Surname,First Name,Phone,Email,Born,Envelope,Where,Congregation Note',
    `Kamau,Peter,0712 999 001,peter.import@example.com,1990-04-03,,,`,
    `${witness.lastName},${witness.firstName},${witness.phone},,,,`,
    `Ochieng,Mary,0712999002,mary.import@example.com,03/04/1991,,,`,
    `Serial,Jane,0712999003,,32874,,,`,
    `MissingFirst,,,,1990-05-05,,,`,
    `BadDate,John,0712999004,,not-a-date,,,`,
    `Tagged,Grace,0712999005,,,ENV-9001,,leader; intercessor`,
    `Repeated,Peter,0712999001,peter.import@example.com,1990-04-03,,,`,
  ].join('\n');

  console.log(`\nImporting a register → ${API}`);

  console.log('\n1. The file is read before it is mapped');
  const inspect = (await call('POST', '/api/members/import', token, { csv })).body as { data: Report };
  check('the server names the columns', inspect.data.headers.join('|') === 'Surname|First Name|Phone|Email|Born|Envelope|Where|Congregation Note', inspect.data.headers.join('|'));
  check('and counts the rows', inspect.data.rowCount === 8, String(inspect.data.rowCount));
  check('and asks for the required fields', inspect.data.missingRequired.includes('firstName') && inspect.data.missingRequired.includes('location'), JSON.stringify(inspect.data.missingRequired));

  const columns = [
    { index: 1, field: 'firstName' },
    { index: 0, field: 'lastName' },
    { index: 2, field: 'phone' },
    { index: 3, field: 'email' },
    { index: 4, field: 'dateOfBirth' },
    { index: 5, field: 'envelopeNumber' },
    { index: 7, field: 'tags' },
  ];

  console.log('\n2. The dry run reports every row and writes nothing');
  const before = (await call('GET', '/api/members?pageSize=1', token)).body as { meta: { total: number } };
  const dry = (await call('POST', '/api/members/import', token, { csv, columns, dryRun: true, defaultLocation: 'Nyahururu Main Church' })).body as { data: Report };
  const report = dry.data;
  const dupes = report.rows.filter((row) => row.status === 'duplicate');
  const bad = report.rows.filter((row) => row.status === 'invalid');
  check('the mapping is accepted', report.mapped && report.missingRequired.length === 0);
  check('the four good rows are offered', report.summary.create === 4, JSON.stringify(report.summary));
  check('the member already on the register is caught', dupes.some((row) => row.duplicateOf?.memberId !== 'this file'), JSON.stringify(dupes));
  check('and it names them and why', dupes.some((row) => row.duplicateOf?.matchedOn === 'phone number' && row.duplicateOf.name === `${witness.firstName} ${witness.lastName}`), JSON.stringify(dupes[0]));
  check('the second copy inside the file is caught too', report.summary.duplicate === 2 && dupes.some((row) => row.duplicateOf?.memberId === 'this file'), JSON.stringify(report.summary));
  check('the two bad rows are rejected', report.summary.invalid === 2, JSON.stringify(report.summary));
  check(
    'and each names its column',
    bad.flatMap((row) => row.errors).some((error) => error.field === 'firstName') &&
      bad.flatMap((row) => row.errors).some((error) => error.field === 'dateOfBirth' && /date such as/.test(error.message)),
    JSON.stringify(bad),
  );
  const after = (await call('GET', '/api/members?pageSize=1', token)).body as { meta: { total: number } };
  check('nothing was written', before.meta.total === after.meta.total, `${before.meta.total} → ${after.meta.total}`);

  console.log('\n3. The commit writes exactly the rows the report promised');
  const commit = (await call('POST', '/api/members/import', token, { csv, columns, dryRun: false, defaultLocation: 'Nyahururu Main Church' })).body as { data: Report };
  check('four members went in', commit.data.imported === 4, JSON.stringify(commit.data.summary));

  const peter = await findByPhone(token, '712999001');
  check('and the register holds the first of them', peter?.firstName === 'Peter', JSON.stringify(peter));
  check('with the congregation filled in for the whole file', peter?.location === 'Nyahururu Main Church', peter?.location);
  check('and a register number issued', /^MBR-\d+$/.test(peter?.memberId ?? ''), peter?.memberId);
  const jane = await findByPhone(token, '712999003');
  check('and the Excel date serial read as a date', jane?.dateOfBirth?.startsWith('1990-01-01') === true, jane?.dateOfBirth ?? 'none');
  const grace = await findByPhone(token, '712999005');
  check('and the envelope number the clerk wrote kept', grace?.envelopeNumber === 'ENV-9001', grace?.envelopeNumber ?? 'none');
  check('and tags split on the separator', JSON.stringify(grace?.tags) === '["leader","intercessor"]', JSON.stringify(grace?.tags));

  console.log('\n4. A second run of the same file changes nothing');
  const again = (await call('POST', '/api/members/import', token, { csv, columns, dryRun: false, defaultLocation: 'Nyahururu Main Church' })).body as { data: Report };
  check('every good row is now a duplicate', again.data.imported === 0 && again.data.summary.duplicate === 6, JSON.stringify(again.data.summary));

  console.log('\n5. The batch is one line in the audit trail');
  const audit = (await call('GET', `/api/admin/audit?q=${encodeURIComponent('from a spreadsheet')}&pageSize=5`, token)).body as { data: { summary: string }[] };
  check('and it says how many went in and what was left out', audit.data[0]?.summary?.includes('Imported 4 members') === true && audit.data[0]?.summary?.includes('rejected 2 rows') === true, audit.data[0]?.summary ?? 'no entry');

  console.log('\n6. A semicolon file from a European Excel reads too');
  const semi = ['Surname;First Name;Phone;Where', 'Wanjala;Mercy;0712999010;Nyahururu Annex'].join('\r\n');
  const semiReport = (await call('POST', '/api/members/import', token, { csv: semi, columns: [{ index: 1, field: 'firstName' }, { index: 0, field: 'lastName' }, { index: 2, field: 'phone' }, { index: 3, field: 'location' }], dryRun: false })).body as { data: Report };
  check('the header and the row were both read', semiReport.data.imported === 1, JSON.stringify(semiReport.data.summary));

  console.log('\n7. One member at a time still works after the numbering change');
  const single = await call('POST', '/api/members', token, { firstName: 'Probe', lastName: 'Single', phone: '+254712999099', location: 'Nyahururu Main Church' });
  check('a member enrolled by hand is created', single.status < 300, JSON.stringify(single.body));

  console.log('\n8. A mapping that makes no sense is refused');
  const confused = await call('POST', '/api/members/import', token, {
    csv,
    columns: [{ index: 1, field: 'firstName' }, { index: 3, field: 'firstName' }],
  });
  check('one field on two columns is a 400', confused.status === 400, JSON.stringify(confused.body));
  const noLocation = await call('POST', '/api/members/import', token, {
    csv: 'First Name,Surname\nJoseph,Mwangi',
    columns: [{ index: 0, field: 'firstName' }, { index: 1, field: 'lastName' }],
    dryRun: false,
  });
  check('a file with no congregation column is refused, not guessed at', noLocation.status === 400, JSON.stringify(noLocation.body));

  const removed = await basePrisma.member.deleteMany({
    where: {
      createdAt: { gte: STARTED },
      OR: [{ email: { endsWith: '@example.com' } }, { phone: { in: PROBE_PHONES } }],
    },
  });
  await basePrisma.auditLog.deleteMany({
    where: { OR: [{ entityId: { startsWith: 'import-' } }, { summary: { contains: 'Probe Single' } }] },
  });
  console.log(`\nremoved ${removed.count} imported members and the batch audit line`);
  console.log(`${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} import checks passed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error: Error) => {
    console.error(`probe could not run: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => void basePrisma.$disconnect());
