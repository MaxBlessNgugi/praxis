import { stringifyCsv } from '../lib/csv';
import { prisma } from '../lib/prisma';
import { displayTimeZone } from '../config/env';
import { attendanceWhere } from './service.service';
import { householdWhere } from './household.service';
import { titheWhere, offeringWhere } from './giving.service';
import type { ListAttendanceQuery } from '../schemas/service.schema';
import type { ListHouseholdsQuery } from '../schemas/household.schema';
import type { ListGivingQuery } from '../schemas/finance.schema';

/**
 * CSV exports: the ledger, as a file, straight from the database.
 *
 * The console used to build exports in the browser from the rows on the page — which meant a filter
 * was only as wide as what had loaded and a spreadsheet could quietly disagree with the ledger it
 * claimed to dump. An export here runs under the same tenant scope and role gates as the screen it
 * mirrors, and composes **the same where-builder** the list uses, so a filter means one thing on the
 * screen and in the file. There is no row cap on purpose: the server pages the list, not the export.
 *
 * The BOM goes in front of the header so Excel opens the accented names correctly, the way the
 * frontend's writer always has.
 */
const BOM = '\uFEFF';

/** A date leaves as `2026-02-08`, not as an ISO timestamp a spreadsheet turns into `####`. */
const iso = (value: Date | null | undefined): string | null =>
  value ? new Intl.DateTimeFormat('en-CA', { timeZone: displayTimeZone }).format(value) : null;

/** `stringifyCsv` writes rows of cells, so the headers travel as the first row. */
const rows = <T,>(columns: Array<[string, (row: T) => string | number | null | undefined]>, data: T[]) =>
  stringifyCsv([columns.map(([header]) => header), ...data.map((row) => columns.map(([, value]) => value(row)))]);

export async function tithesCsv(query: ListGivingQuery) {
  const data = await prisma.tithe.findMany({
    where: titheWhere(query),
    include: { member: { select: { memberId: true } }, recordedBy: { select: { name: true } } },
    orderBy: { receivedAt: 'desc' },
  });
  return {
    filename: 'praxis-tithes.csv',
    csv: BOM +
      rows(
        [
          ['Tx code', (r) => r.txCode],
          ['Date received', (r) => iso(r.receivedAt)],
          ['Member no.', (r) => r.member?.memberId ?? null],
          ['Donor', (r) => r.donorName],
          ['Envelope no.', (r) => r.envelopeNo],
          ['Amount (KES)', (r) => r.amount.toFixed(2)],
          ['Method', (r) => r.method],
          ['Category', (r) => r.category],
          ['Reference', (r) => r.reference],
          ['Recorded by', (r) => r.recordedBy?.name ?? null],
        ],
        data,
      ),
  };
}

export async function offeringsCsv(query: ListGivingQuery) {
  const data = await prisma.offering.findMany({
    where: offeringWhere(query),
    include: { service: { select: { title: true, heldAt: true } }, recordedBy: { select: { name: true } } },
    orderBy: { receivedAt: 'desc' },
  });
  return {
    filename: 'praxis-offerings.csv',
    csv: BOM +
      rows(
        [
          ['Tx code', (r) => r.txCode],
          ['Date received', (r) => iso(r.receivedAt)],
          ['Service', (r) => r.service?.title ?? null],
          ['Amount (KES)', (r) => r.amount.toFixed(2)],
          ['Method', (r) => r.method],
          ['Category', (r) => r.category],
          ['Reference', (r) => r.reference],
          ['Recorded by', (r) => r.recordedBy?.name ?? null],
        ],
        data,
      ),
  };
}

export async function attendanceCsv(query: ListAttendanceQuery) {
  const data = await prisma.attendance.findMany({
    where: attendanceWhere(query),
    include: {
      service: { select: { title: true, heldAt: true } },
      member: { select: { memberId: true, firstName: true, lastName: true } },
    },
    orderBy: { recordedAt: 'desc' },
  });
  return {
    filename: 'praxis-attendance.csv',
    csv: BOM +
      rows(
        [
          ['Recorded at', (r) => iso(r.recordedAt)],
          ['Service', (r) => r.service?.title ?? null],
          ['Service date', (r) => iso(r.service?.heldAt ?? null)],
          ['Member no.', (r) => r.member?.memberId ?? null],
          ['Member', (r) => (r.member ? `${r.member.firstName} ${r.member.lastName}` : null)],
          ['Kind', (r) => r.kind],
          ['Counted', (r) => r.count],
          ['Visitor name', (r) => r.visitorName],
          ['Notes', (r) => r.notes],
        ],
        data,
      ),
  };
}

export async function householdsCsv(query: ListHouseholdsQuery) {
  const data = await prisma.household.findMany({
    where: householdWhere(query),
    include: {
      members: { where: { deletedAt: null }, select: { firstName: true, lastName: true, isHouseholdHead: true, memberId: true } },
    },
    orderBy: { unitNumber: 'asc' },
  });
  return {
    filename: 'praxis-households.csv',
    csv: BOM +
      rows(
        [
          ['Unit number', (r) => r.unitNumber],
          ['Household', (r) => r.name],
          ['Location', (r) => r.location],
          ['Address', (r) => r.address],
          ['Members', (r) => r.members.length],
          ['Head', (r) => {
            const head = r.members.find((m) => m.isHouseholdHead);
            return head ? `${head.firstName} ${head.lastName}` : null;
          }],
          ['Member numbers', (r) => r.members.map((m) => m.memberId).join('; ')],
        ],
        data,
      ),
  };
}
