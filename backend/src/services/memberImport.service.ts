import { prisma } from '../lib/prisma';
import { includingRetired } from '../lib/live';
import { parseCsv } from '../lib/csv';
import { AppError } from '../middleware/errorHandler';
import { assertWithinPlan } from './billing.service';
import { initialsOf, nextEnvelopeNumbers, nextMemberIds } from './member.service';
import {
  createMemberSchema,
  normalisePhone,
  type CreateMemberInput,
  type MemberImportField,
  type MemberImportInput,
} from '../schemas/member.schema';

/**
 * A church's register arriving as a spreadsheet.
 *
 * Two rules shape everything here. **Nothing is written until somebody has read the report** — the
 * default is a dry run, and the commit is a second, deliberate request carrying the same file. And
 * **a row is never half-imported**: a row that fails validation is reported with the column that
 * failed and simply left out, while the rest go in. A parish importing four hundred members and
 * finding that one bad phone number cost it the other three hundred and ninety-nine would rightly
 * never trust the feature again.
 *
 * Duplicate detection is what makes a second import safe. A clerk re-importing last week's file after
 * adding twenty people to it should end up with twenty new members, not three hundred and twenty
 * duplicates — so every row is matched against the register on the keys the register already uses to
 * mean "the same person", and against the rows already accepted in this same file.
 */

/** Above this the parish should split the file; the report alone would be megabytes of JSON. */
const MAX_ROWS = 5000;

/** How many row reports travel in one response. Counts still cover the whole file. */
const REPORT_LIMIT = 500;

/** Fields a row cannot be created without — the register's own rules, stated early so the mapping
 *  screen can refuse to move on rather than the import failing four hundred times. */
const REQUIRED_FIELDS: MemberImportField[] = ['firstName', 'lastName'];

export interface ImportRowReport {
  /** The spreadsheet's own row number, header included, so the clerk can look at the right line. */
  row: number;
  name: string;
  status: 'create' | 'duplicate' | 'invalid';
  errors: { field: string; message: string }[];
  duplicateOf?: { memberId: string; name: string; matchedOn: string; retired: boolean };
}

export interface MemberImportReport {
  headers: string[];
  rowCount: number;
  mapped: boolean;
  dryRun: boolean;
  missingRequired: MemberImportField[];
  summary: { create: number; duplicate: number; invalid: number };
  rows: ImportRowReport[];
  /** True when the file had more rows than the report carries; the counts are still the full file. */
  truncated: boolean;
  imported: number;
}

/**
 * Excel's day zero.
 *
 * A date column formatted as a date and exported to CSV arrives as `32874`, not as a date — the cell
 * holds a number and only its *display* is a date. Refusing those rows would mean telling a clerk to
 * reformat a column in a spreadsheet they have already saved, so the serial is converted.
 */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/**
 * A date from the four ways a parish writes one.
 *
 * `03/04/1990` is read day-first, which is the Kenyan and British clerical habit and the opposite of
 * JavaScript's own guess. That is the risk being taken deliberately: a file written in the church's
 * own office means the church's own convention, and silently swapping the day and the month for every
 * member born before the thirteenth would be the worse error.
 */
function parseImportDate(raw: string): Date | null {
  const text = raw.trim();

  // 20000 is 1954, 60000 is 2064: inside that window a five-digit number is an Excel date serial.
  if (/^\d{5}$/.test(text)) {
    const serial = Number(text);
    if (serial >= 20000 && serial <= 60000) return new Date(EXCEL_EPOCH + serial * 86_400_000);
  }

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return dateFrom(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirst) return dateFrom(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

  return null;
}

function dateFrom(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1800 || year > 2200) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // A day that rolled over into the next month never existed: 31 February is a typo, not a date.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/**
 * What to call each column when a row is refused.
 *
 * The report is read by a clerk looking at a spreadsheet, so it names the column the way the mapping
 * screen does rather than the way the schema does.
 */
const FIELD_LABELS: Record<MemberImportField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  location: 'Congregation',
  email: 'Email',
  phone: 'Phone',
  nationalId: 'National ID',
  dateOfBirth: 'Date of birth',
  status: 'Status',
  baptismType: 'Baptism',
  baptismDate: 'Baptism date',
  baptismOfficiant: 'Baptism officiant',
  envelopeNumber: 'Envelope number',
  tags: 'Tags',
  pastoralNotes: 'Pastoral notes',
};

const DATE_ERROR = 'Use a date such as 1990-04-03 or 03/04/1990';

/**
 * Names for the words a register actually uses.
 *
 * A paper register does not say `deceased`, it says *late* or *died*; it does not say `dedicated`, it
 * says *dedication*. Mapping those is the difference between an import a clerk can complete and one
 * where sixty rows have to be edited by hand before they will go in.
 */
const STATUS_ALIASES: Record<string, string> = {
  active: 'active',
  inactive: 'inactive',
  transferred: 'transferred',
  'transferred out': 'transferred',
  transfer: 'transferred',
  deceased: 'deceased',
  dead: 'deceased',
  late: 'deceased',
};

const BAPTISM_ALIASES: Record<string, string> = {
  baptized: 'baptized',
  baptised: 'baptized',
  christened: 'baptized',
  dedicated: 'dedicated',
  dedication: 'dedicated',
  none: 'none',
  no: 'none',
  'not baptized': 'none',
  'not baptised': 'none',
};

interface DuplicateIndex {
  memberId: string;
  name: string;
  matchedOn: string;
  retired: boolean;
}

/**
 * The keys a person is recognised by.
 *
 * Ordered most reliable first, and the label is what the report shows the clerk: *"the same phone
 * number as Mary Wanjiku (MBR-1042)"* is a sentence somebody can act on, where *"duplicate"* is not.
 */
function duplicateKeys(row: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  envelopeNumber?: string | null;
  dateOfBirth?: Date | null;
}): { key: string; label: string }[] {
  const keys: { key: string; label: string }[] = [];
  const name = `${row.firstName} ${row.lastName}`.trim().toLowerCase();

  // Normalised on both sides: a row that says `0712 999 001` and a register that says `+254712999001`
  // are the same person, and a register seeded from a paper file says both, in different rows.
  if (row.phone) keys.push({ key: `phone:${normalisePhone(row.phone)}`, label: 'phone number' });
  if (row.email) keys.push({ key: `email:${row.email.toLowerCase()}`, label: 'email address' });
  if (row.envelopeNumber) keys.push({ key: `envelope:${row.envelopeNumber.toLowerCase()}`, label: 'envelope number' });

  const born = row.dateOfBirth ? row.dateOfBirth.toISOString().slice(0, 10) : '';
  if (name) keys.push({ key: `name:${name}|${born}`, label: born ? 'name and date of birth' : 'name' });

  return keys;
}

/** Everything already on the register, indexed by those keys. Retired members are included: a row
 *  matching one of them is a restoration, not a new enrolment. */
async function duplicateIndex(): Promise<Map<string, DuplicateIndex>> {
  const existing = await prisma.member.findMany({
    where: includingRetired,
    select: {
      memberId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      envelopeNumber: true,
      dateOfBirth: true,
      deletedAt: true,
    },
  });

  const index = new Map<string, DuplicateIndex>();
  for (const member of existing) {
    const name = `${member.firstName} ${member.lastName}`;
    for (const { key, label } of duplicateKeys(member)) {
      if (index.has(key)) continue; // keep the first, which is the oldest and the likeliest original
      index.set(key, { memberId: member.memberId, name, matchedOn: label, retired: member.deletedAt !== null });
    }
  }
  return index;
}

/** One row, turned into a member payload or into the reasons it is not one. */
function readRow(
  values: string[],
  mapping: { index: number; field: MemberImportField }[],
  defaultLocation: string | undefined,
): { input?: CreateMemberInput; errors: { field: string; message: string }[] } {
  const errors: { field: string; message: string }[] = [];
  const raw: Record<string, unknown> = {};

  for (const { index, field } of mapping) {
    const cell = (values[index] ?? '').trim();
    if (cell === '') continue;

    switch (field) {
      case 'dateOfBirth':
      case 'baptismDate': {
        const date = parseImportDate(cell);
        if (!date) errors.push({ field, message: DATE_ERROR });
        else raw[field] = date;
        break;
      }
      case 'status': {
        raw[field] = STATUS_ALIASES[cell.toLowerCase()] ?? cell.toLowerCase();
        break;
      }
      case 'baptismType': {
        raw[field] = BAPTISM_ALIASES[cell.toLowerCase()] ?? cell.toLowerCase();
        break;
      }
      case 'tags': {
        raw[field] = cell
          .split(/[,;|]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 20);
        break;
      }
      default: {
        raw[field] = cell;
      }
    }
  }

  if (defaultLocation && raw.location === undefined) raw.location = defaultLocation;

  const parsed = createMemberSchema.safeParse(raw);
  if (parsed.success) return { input: parsed.data, errors };

  const failed = new Set(errors.map((error) => error.field));
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'row');
    if (failed.has(field)) continue; // a row can be wrong twice about one column; say it once
    // "Required" is the schema's word for a cell that was left blank: the spreadsheet's clerk is
    // looking for the column, so the message names it.
    const message = issue.code === 'invalid_type' && issue.received === 'undefined' ? `${FIELD_LABELS[field as MemberImportField] ?? field} is empty on this row` : issue.message;
    errors.push({ field, message });
  }
  return { errors };
}

/**
 * Import a register from CSV.
 *
 * Three requests, one endpoint. With no mapping the file is only *read* — the console is told what its
 * columns are and how many rows there are, which is what the mapping screen draws itself from. With a
 * mapping and `dryRun` it returns the report below. With a mapping and no dry run it writes the rows
 * that the report already promised would go in.
 */
export async function importMembers(input: MemberImportInput, actorId: string): Promise<MemberImportReport> {
  const table = parseCsv(input.csv);

  if (table.headers.length === 0 || (table.rows.length === 0 && input.columns.length === 0)) {
    throw new AppError(400, 'That file has no rows in it', 'empty_import');
  }
  if (table.rows.length > MAX_ROWS) {
    throw new AppError(
      400,
      `That file has ${table.rows.length} rows. Import up to ${MAX_ROWS} at a time, then bring the rest.`,
      'import_too_large',
    );
  }

  const fields = input.columns.map((column) => column.field);
  const twice = fields.find((field, position) => fields.indexOf(field) !== position);
  if (twice) {
    throw new AppError(400, `Two columns are both mapped to ${twice}. Map each field once.`, 'duplicate_mapping');
  }

  const mapped = input.columns.length > 0;
  const missingRequired = [
    ...REQUIRED_FIELDS.filter((field) => !fields.includes(field)),
    // The register insists on a congregation for every member, so a file with no location column
    // needs the clerk to say which one it is for.
    ...(fields.includes('location') || input.defaultLocation ? [] : (['location'] as MemberImportField[])),
  ];

  // A dry run may ask with a partial mapping: that is the mapping screen finding out what the file
  // has. A *commit* may not — a request that writes nothing and answers 200 could be read as success.
  if (!input.dryRun && missingRequired.length > 0) {
    const labels = missingRequired.map((field) => FIELD_LABELS[field]).join(', ');
    throw new AppError(400, `Still to map before anything can be imported: ${labels}`, 'incomplete_mapping');
  }

  if (!mapped || missingRequired.length > 0) {
    return {
      headers: table.headers,
      rowCount: table.rows.length,
      mapped,
      dryRun: true,
      missingRequired,
      summary: { create: 0, duplicate: 0, invalid: 0 },
      rows: [],
      truncated: false,
      imported: 0,
    };
  }

  const index = await duplicateIndex();
  const reports: ImportRowReport[] = [];
  const creatable: { row: number; input: CreateMemberInput }[] = [];
  let duplicates = 0;
  let invalid = 0;

  table.rows.forEach((values, position) => {
    const row = position + 2; // +1 for the header, +1 because spreadsheets start at 1
    const { input: parsed, errors } = readRow(values, input.columns, input.defaultLocation);
    const name = [parsed?.firstName, parsed?.lastName].filter(Boolean).join(' ') || `Row ${row}`;

    if (errors.length > 0 || !parsed) {
      invalid += 1;
      reports.push({ row, name, status: 'invalid', errors });
      return;
    }

    const hit = duplicateKeys(parsed)
      .map(({ key }) => index.get(key))
      .find((found): found is DuplicateIndex => found !== undefined);

    if (hit) {
      duplicates += 1;
      reports.push({
        row,
        name,
        status: 'duplicate',
        errors: [],
        duplicateOf: { memberId: hit.memberId, name: hit.name, matchedOn: hit.matchedOn, retired: hit.retired },
      });
      return;
    }

    // Claimed in the index as well, so a file that lists the same person twice reports the second
    // line rather than creating twins.
    const self = duplicateKeys(parsed);
    for (const { key, label } of self) {
      index.set(key, { memberId: 'this file', name, matchedOn: label, retired: false });
    }

    creatable.push({ row, input: parsed });
    reports.push({ row, name, status: 'create', errors: [] });
  });

  const report: MemberImportReport = {
    headers: table.headers,
    rowCount: table.rows.length,
    mapped: true,
    dryRun: input.dryRun,
    missingRequired: [],
    summary: { create: creatable.length, duplicate: duplicates, invalid },
    rows: reports.slice(0, REPORT_LIMIT),
    truncated: reports.length > REPORT_LIMIT,
    imported: 0,
  };

  if (input.dryRun || creatable.length === 0) return report;

  // The plan is checked against the whole batch, not per row: a parish on a fifty-member plan
  // importing two hundred should be told once, before anything is written.
  await assertWithinPlan('maxMembers', creatable.length);

  const [memberIds, envelopeNumbers] = await Promise.all([
    nextMemberIds(creatable.length),
    nextEnvelopeNumbers(creatable.filter(({ input: row }) => !row.envelopeNumber).length),
  ]);
  let envelopeCursor = 0;

  const data = creatable.map(({ input: row }, position) => ({
    ...row,
    // Both sequences were sized to this batch just above, so a row without one is not possible.
    memberId: memberIds[position] as string,
    envelopeNumber: row.envelopeNumber ?? (envelopeNumbers[envelopeCursor++] as string),
    initials: initialsOf(row.firstName, row.lastName),
  }));

  const batch = `import-${new Date().toISOString()}`;
  const summary =
    `Imported ${data.length} member${data.length === 1 ? '' : 's'} from a spreadsheet` +
    (duplicates ? `, skipped ${duplicates} already on the register` : '') +
    (invalid ? `, rejected ${invalid} row${invalid === 1 ? '' : 's'}` : '');

  // One transaction and one audit entry for the batch: four hundred "Enrolled …" lines would bury
  // the trail of everything else that happened that day, and the batch is what a person did.
  const imported = await prisma.$transaction(
    async (tx) => {
      const created = await tx.member.createMany({ data });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'create',
          entityName: 'Member',
          entityId: batch,
          summary,
          after: { imported: created.count, duplicates, invalid, source: 'csv' },
        },
      });
      return created.count;
    },
    { timeout: 60_000 },
  );

  return { ...report, dryRun: false, imported };
}
