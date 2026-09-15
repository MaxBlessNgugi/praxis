import React, { useState } from 'react';
import { useDialog } from '../dialog';
import { LoadingBlock } from '../DataState';
import { errorMessage } from '../../../hooks/useApi';
import { exportCsv } from '../../../lib/export';
import {
  useMembers,
  type MemberImportColumn,
  type MemberImportField,
  type MemberImportReport,
  type MemberImportRowReport,
} from '../../../lib/hooks/useMembers';

/**
 * Bringing an existing register into Praxis.
 *
 * A church arrives with four hundred members in a spreadsheet, and typing them in is the reason a
 * console like this gets abandoned in its first week. The dialog is three steps on purpose — choose
 * the file, say which column is which, then read a report of exactly what will happen — and it is the
 * third step that matters: the import is shown before it is done, so a column mismatched by one
 * position is caught by a person looking at their own names rather than by a roll full of wrong
 * phone numbers.
 *
 * Nothing here parses the file. The server does, with the register's own rules, and this screen asks
 * it three questions: what columns does this hold, what would each row do, and (only when the answer
 * has been read) do it.
 */

/** The register's columns, in the order a clerk filling a paper form would meet them. */
const FIELDS: { field: MemberImportField; label: string }[] = [
  { field: 'firstName', label: 'First name' },
  { field: 'lastName', label: 'Last name' },
  { field: 'location', label: 'Congregation' },
  { field: 'phone', label: 'Phone' },
  { field: 'email', label: 'Email' },
  { field: 'nationalId', label: 'National ID' },
  { field: 'dateOfBirth', label: 'Date of birth' },
  { field: 'status', label: 'Membership status' },
  { field: 'baptismType', label: 'Baptism' },
  { field: 'baptismDate', label: 'Baptism date' },
  { field: 'baptismOfficiant', label: 'Baptism officiant' },
  { field: 'envelopeNumber', label: 'Envelope number' },
  { field: 'tags', label: 'Tags' },
  { field: 'pastoralNotes', label: 'Pastoral notes' },
];

const labelOf = (field: MemberImportField | '') =>
  FIELDS.find((candidate) => candidate.field === field)?.label ?? 'Not imported';

/**
 * A first guess at the mapping, from the file's own header row.
 *
 * Guessed, never assumed: the clerk checks it. The spellings are the ones church spreadsheets
 * actually use, and the fallback is the honest one — a column nobody recognises is left unmapped
 * rather than assigned to whatever came closest.
 */
const HEADER_HINTS: Record<string, MemberImportField> = {
  firstname: 'firstName',
  first: 'firstName',
  givenname: 'firstName',
  christianname: 'firstName',
  name: 'firstName',
  lastname: 'lastName',
  surname: 'lastName',
  familyname: 'lastName',
  secondname: 'lastName',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  mobilenumber: 'phone',
  tel: 'phone',
  telephone: 'phone',
  contact: 'phone',
  email: 'email',
  emailaddress: 'email',
  id: 'nationalId',
  idnumber: 'nationalId',
  nationalid: 'nationalId',
  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  birthday: 'dateOfBirth',
  born: 'dateOfBirth',
  location: 'location',
  congregation: 'location',
  campus: 'location',
  church: 'location',
  branch: 'location',
  parish: 'location',
  envelope: 'envelopeNumber',
  envelopenumber: 'envelopeNumber',
  env: 'envelopeNumber',
  status: 'status',
  membershipstatus: 'status',
  baptism: 'baptismType',
  baptismtype: 'baptismType',
  baptismdate: 'baptismDate',
  officiant: 'baptismOfficiant',
  baptismofficiant: 'baptismOfficiant',
  tags: 'tags',
  groups: 'tags',
  ministries: 'tags',
  notes: 'pastoralNotes',
  pastoralnotes: 'pastoralNotes',
  remarks: 'pastoralNotes',
};

function guessField(header: string): MemberImportField | '' {
  return HEADER_HINTS[header.toLowerCase().replace(/[^a-z]/g, '')] ?? '';
}

/** The template a clerk downloads: the headers this screen recognises, and one row showing the
 *  date and tag conventions, which are the two things a spreadsheet cannot guess at. */
const TEMPLATE_COLUMNS = [
  { label: 'First name', value: (row: Record<string, string>) => row.firstName },
  { label: 'Last name', value: (row: Record<string, string>) => row.lastName },
  { label: 'Congregation', value: (row: Record<string, string>) => row.location },
  { label: 'Phone', value: (row: Record<string, string>) => row.phone },
  { label: 'Email', value: (row: Record<string, string>) => row.email },
  { label: 'Date of birth', value: (row: Record<string, string>) => row.dateOfBirth },
  { label: 'Envelope number', value: (row: Record<string, string>) => row.envelopeNumber },
  { label: 'Baptism', value: (row: Record<string, string>) => row.baptismType },
  { label: 'Tags', value: (row: Record<string, string>) => row.tags },
  { label: 'Pastoral notes', value: (row: Record<string, string>) => row.pastoralNotes },
];

const TEMPLATE_ROW = {
  firstName: 'Mary',
  lastName: 'Wanjiku',
  location: 'Main Church',
  phone: '0712 345 678',
  email: 'mary@example.com',
  dateOfBirth: '1985-03-14',
  envelopeNumber: '',
  baptismType: 'baptized',
  tags: 'leader; intercessor',
  pastoralNotes: '',
};

const ROWS_SHOWN = 60;

const STATUS_STYLE: Record<MemberImportRowReport['status'], string> = {
  create: 'bg-[#059669]/10 text-[#047857]',
  duplicate: 'bg-[#2563EB]/10 text-[#1D4ED8]',
  invalid: 'bg-[#DC2626]/10 text-[#B91C1C]',
};

const STATUS_LABEL: Record<MemberImportRowReport['status'], string> = {
  create: 'Will be added',
  duplicate: 'Already on the register',
  invalid: 'Needs fixing',
};

/** What one row's report says, in the words of the person reading it. */
function rowDetail(row: MemberImportRowReport): string {
  if (row.status === 'invalid') return row.errors.map((error) => `${labelOf(error.field as MemberImportField)}: ${error.message}`).join('; ');
  if (row.duplicateOf) {
    const suffix = row.duplicateOf.retired ? ' (retired — restore it instead of adding it again)' : '';
    return `${row.duplicateOf.name} ${row.duplicateOf.memberId}, same ${row.duplicateOf.matchedOn}${suffix}`;
  }
  return '';
}

interface ImportMembersDialogProps {
  onClose: () => void;
  /** Anything actually written: the register behind the dialog has to be read again. */
  onImported: () => void;
}

export const ImportMembersDialog: React.FC<ImportMembersDialogProps> = ({ onClose, onImported }) => {
  const dialog = useDialog(onClose, 'Import the register from a spreadsheet');
  const { importMembers } = useMembers();

  const [step, setStep] = useState<'choose' | 'map' | 'report'>('choose');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<Record<number, MemberImportField | ''>>({});
  const [oneCongregation, setOneCongregation] = useState('');
  const [report, setReport] = useState<MemberImportReport | null>(null);
  const [missing, setMissing] = useState<MemberImportField[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const columns: MemberImportColumn[] = Object.entries(mapping)
    .filter((entry): entry is [string, MemberImportField] => entry[1] !== '')
    .map(([index, field]) => ({ index: Number(index), field }));

  const locationMapped = columns.some((column) => column.field === 'location');
  const readyToCheck =
    columns.some((column) => column.field === 'firstName') &&
    columns.some((column) => column.field === 'lastName') &&
    (locationMapped || oneCongregation.trim().length >= 2);

  /** Read the file, then ask the server what is in it. */
  const inspect = async (text: string, name: string) => {
    setBusy(true);
    setError(null);
    try {
      const read = await importMembers({ csv: text });
      setCsv(text);
      setFileName(name);
      setHeaders(read.headers);
      setRowCount(read.rowCount);
      setMissing(read.missingRequired);
      setMapping(Object.fromEntries(read.headers.map((header, index) => [index, guessField(header)])));
      setStep('map');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    await inspect(text, file.name);
  };

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const checked = await importMembers({ csv, columns, defaultLocation: oneCongregation.trim() || undefined, dryRun: true });
      setReport(checked);
      setMissing(checked.missingRequired);
      setStep('report');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    setError(null);
    try {
      const written = await importMembers({ csv, columns, defaultLocation: oneCongregation.trim() || undefined, dryRun: false });
      setImported(written.imported);
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const stepStyle = (current: 'choose' | 'map' | 'report') =>
    step === current ? 'text-[#C2410C]' : 'text-[#A8A29E]';

  /** Once the file has gone in, the report stops being a forecast — the chips say what happened. */
  const done = imported !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1C1917]/50 p-4 backdrop-blur-xs" {...dialog}>
      <div className="my-8 w-full max-w-3xl rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E7E5E4] px-6 py-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Import the register</h3>
            <p className="mt-0.5 flex items-center gap-2 text-xs font-semibold">
              <span className={stepStyle('choose')}>1. Choose the file</span>
              <span aria-hidden="true" className="text-[#E7E5E4]">→</span>
              <span className={stepStyle('map')}>2. Match the columns</span>
              <span aria-hidden="true" className="text-[#E7E5E4]">→</span>
              <span className={stepStyle('report')}>3. Check, then import</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[#57534E] hover:bg-[#F8F1E9] hover:text-[#1C1917]"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-semibold text-[#B91C1C]">
              {error}
            </p>
          )}

          {imported !== null && (
            <div className="rounded-[10px] border border-[#059669]/30 bg-[#059669]/10 px-3.5 py-2.5 text-xs font-semibold text-[#047857]">
              {imported === 0
                ? 'Nothing was left to add — every row was already on the register or needed fixing.'
                : `${imported} ${imported === 1 ? 'member is' : 'members are'} now on the register.`}
            </div>
          )}

          {busy && <LoadingBlock label="Working through the file…" />}

          {!busy && step === 'choose' && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-[#57534E]">
                A spreadsheet saved as <strong className="text-[#1C1917]">CSV</strong> — in Excel, <em>Save As → CSV (Comma delimited)</em>.
                Nothing is added until you have seen what each row will do.
              </p>

              <div className="rounded-[12px] border border-dashed border-[#E7E5E4] bg-[#FDF8F3] px-4 py-5">
                <label htmlFor="register-file" className="block font-headline text-xs font-bold text-[#1C1917]">
                  Choose the file
                </label>
                <input
                  id="register-file"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(event) => void onPickFile(event.target.files?.[0])}
                  className="mt-2 block w-full cursor-pointer text-xs text-[#57534E] file:mr-3 file:cursor-pointer file:rounded-[8px] file:border-0 file:bg-[#C2410C] file:px-3 file:py-1.5 file:font-headline file:text-xs file:font-bold file:text-white hover:file:bg-[#EA580C]"
                />
                <p className="mt-2 text-[11px] text-[#A8A29E]">
                  Or paste the rows below, including the header line.
                </p>
                <textarea
                  aria-label="Paste the spreadsheet rows"
                  rows={4}
                  value={csv}
                  onChange={(event) => setCsv(event.target.value)}
                  placeholder={'First name,Last name,Phone,Congregation\nMary,Wanjiku,0712 345 678,Main Church'}
                  className="mt-2 w-full rounded-[8px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2 font-mono text-[11px] text-[#1C1917] focus:border-[#C2410C] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={csv.trim() === ''}
                    onClick={() => void inspect(csv, 'Pasted rows')}
                    className="rounded-[8px] bg-[#C2410C] px-3 py-1.5 font-headline text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-[#E7E5E4] disabled:text-[#A8A29E]"
                  >
                    Read the pasted rows
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCsv('praxis-members-template', TEMPLATE_COLUMNS, [TEMPLATE_ROW])}
                    className="rounded-[8px] border border-[#E7E5E4] bg-[#F8F1E9] px-3 py-1.5 font-headline text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4]"
                  >
                    Download the template
                  </button>
                </div>
              </div>
            </div>
          )}

          {!busy && step === 'map' && (
            <div className="space-y-4">
              <p className="text-xs text-[#57534E]">
                <strong className="text-[#1C1917]">{fileName}</strong> — {rowCount} row{rowCount === 1 ? '' : 's'} read.
                Say what each column holds; the guesses came from your header row.
              </p>

              <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {headers.map((header, index) => (
                  <div key={`${header}-${index}`} className="flex flex-col gap-1.5 rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <label htmlFor={`column-${index}`} className="font-mono text-xs font-bold text-[#1C1917]">
                      {header}
                    </label>
                    <select
                      id={`column-${index}`}
                      value={mapping[index] ?? ''}
                      onChange={(event) =>
                        setMapping((current) => ({ ...current, [index]: event.target.value as MemberImportField | '' }))
                      }
                      className="h-9 w-full cursor-pointer rounded-[8px] border border-[#E7E5E4] bg-[#FFFFFF] px-2 font-headline text-xs font-semibold text-[#1C1917] focus:border-[#C2410C] focus:outline-none sm:w-56"
                    >
                      <option value="">Not imported</option>
                      {FIELDS.map((candidate) => (
                        <option key={candidate.field} value={candidate.field}>
                          {candidate.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!locationMapped && (
                <div>
                  <label htmlFor="one-congregation" className="block font-headline text-xs font-bold text-[#1C1917]">
                    This whole file belongs to one congregation
                  </label>
                  <input
                    id="one-congregation"
                    type="text"
                    value={oneCongregation}
                    onChange={(event) => setOneCongregation(event.target.value)}
                    placeholder="Main Church"
                    className="mt-1 w-full rounded-[8px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1C1917] focus:border-[#C2410C] focus:outline-none"
                  />
                </div>
              )}

              {missing.length > 0 && (
                <p className="text-[11px] font-semibold text-[#B45309]">
                  Still to map: {missing.map((field) => labelOf(field)).join(', ')}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="px-3 py-2 font-headline text-xs font-bold text-[#57534E] hover:text-[#1C1917]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!readyToCheck}
                  onClick={() => void check()}
                  className="rounded-[8px] bg-[#C2410C] px-4 py-2 font-headline text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-[#E7E5E4] disabled:text-[#A8A29E]"
                >
                  Check the file
                </button>
              </div>
            </div>
          )}

          {!busy && step === 'report' && report && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#F0FDF4] px-3 py-2.5">
                  <div className="font-headline text-lg font-bold text-[#047857]">{report.summary.create}</div>
                  <div className="text-[11px] font-semibold text-[#57534E]">{done ? 'added' : 'will be added'}</div>
                </div>
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#EFF6FF] px-3 py-2.5">
                  <div className="font-headline text-lg font-bold text-[#1D4ED8]">{report.summary.duplicate}</div>
                  <div className="text-[11px] font-semibold text-[#57534E]">already on the register</div>
                </div>
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#FEF2F2] px-3 py-2.5">
                  <div className="font-headline text-lg font-bold text-[#B91C1C]">{report.summary.invalid}</div>
                  <div className="text-[11px] font-semibold text-[#57534E]">need fixing first</div>
                </div>
              </div>

              {report.rows.length > 0 && (
                <div className="max-h-[40vh] overflow-y-auto rounded-[10px] border border-[#E7E5E4]">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">What each row of the file will do</caption>
                    <thead className="sticky top-0 bg-[#FDF8F3]">
                      <tr className="font-headline text-[11px] uppercase tracking-wider text-[#A8A29E]">
                        <th scope="col" className="px-3 py-2">Line</th>
                        <th scope="col" className="px-3 py-2">Name</th>
                        <th scope="col" className="px-3 py-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.slice(0, ROWS_SHOWN).map((row) => (
                        <tr key={row.row} className="border-t border-[#E7E5E4] align-top text-xs text-[#1C1917]">
                          <td className="px-3 py-2 font-mono text-[11px] text-[#57534E]">{row.row}</td>
                          <td className="px-3 py-2 font-semibold">{row.name}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[row.status]}`}>
                              {STATUS_LABEL[row.status]}
                            </span>
                            {rowDetail(row) && <div className="mt-1 text-[11px] text-[#57534E]">{rowDetail(row)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.rows.length > ROWS_SHOWN && (
                    <p className="border-t border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2 text-[11px] text-[#57534E]">
                      Showing the first {ROWS_SHOWN} of {report.rowCount} lines. The counts above cover the whole file.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E5E4] pt-4">
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  className="px-3 py-2 font-headline text-xs font-bold text-[#57534E] hover:text-[#1C1917]"
                >
                  Back to the columns
                </button>
                {done ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-[8px] bg-[#C2410C] px-4 py-2 font-headline text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#EA580C]"
                  >
                    Close
                  </button>
                ) : report.summary.create > 0 ? (
                  <button
                    type="button"
                    onClick={() => void commit()}
                    className="rounded-[8px] bg-[#C2410C] px-4 py-2 font-headline text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#EA580C]"
                  >
                    Import {report.summary.create} member{report.summary.create === 1 ? '' : 's'}
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-[#57534E]">
                    There is nothing to add from this file. The rows that need fixing are listed above.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
