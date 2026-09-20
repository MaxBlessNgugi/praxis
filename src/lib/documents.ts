/**
 * Printable documents: certificates and reports.
 *
 * These are built as **HTML and printed by the browser**, rather than assembled as a PDF by a library.
 * That is a deliberate choice, not a shortcut. A church certificate is a typographic object — it needs
 * a display face, generous leading, a rule and a seal — and CSS is very good at exactly that, while a
 * PDF library is very good at drawing rectangles. The browser also already ships the fonts, the
 * hyphenation and the pagination. "Print → Save as PDF" is then the export, on every platform, with
 * the same layout the operator just looked at.
 *
 * Everything is self-contained: no external stylesheet, no webfont fetch, no image URL. A printed
 * document that silently loses its letterhead because a font request failed is worse than no
 * document, so the shell inlines its own CSS and the caller inlines the logo as a data URL.
 *
 * The documents escape their own input. A member's name reaches these functions from a database
 * field, and a certificate is printed on a press; an apostrophe that closed a tag would be an
 * annoyance, and a `<script>` that did would be a hole.
 */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A date written the way a certificate writes it: "5 February 2025". */
export function proseDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Kenyan shillings, with the grouping a treasurer reads without counting zeroes. */
export function kes(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface ChurchHeader {
  name: string;
  tagline?: string | null;
  location: string;
  /** A data URL. The caller fetches the uploaded logo and converts it, so the document is portable. */
  logoSrc?: string | null;
}

/** The letterhead, shared by every document so the church looks like itself on all of them. */
function letterhead(church: ChurchHeader): string {
  return `
    <header class="letterhead">
      ${church.logoSrc ? `<img class="mark" src="${church.logoSrc}" alt="" />` : ''}
      <div class="identity">
        <p class="church">${escapeHtml(church.name)}</p>
        ${church.tagline ? `<p class="tagline">${escapeHtml(church.tagline)}</p>` : ''}
        <p class="place">${escapeHtml(church.location)}</p>
      </div>
    </header>`;
}

/** The one stylesheet both shells share: page setup, type scale, and the warm rules. */
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1C1917;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { padding: 18mm 16mm; }
  .letterhead { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #C2410C; padding-bottom: 10px; }
  .mark { height: 46px; width: auto; }
  .identity { display: flex; flex-direction: column; }
  .church { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; margin: 0; text-transform: uppercase; }
  .tagline { font-size: 11px; font-style: italic; color: #57534E; margin: 2px 0 0; }
  .place { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #A8A29E; margin: 3px 0 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #57534E; padding: 7px 8px; border-bottom: 1.5px solid #E7E5E4; }
  td { font-size: 12px; padding: 7px 8px; border-bottom: 1px solid #F4ECE8; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals td { font-weight: 700; border-top: 2px solid #C2410C; border-bottom: none; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E7E5E4; font-size: 9px; color: #A8A29E; display: flex; justify-content: space-between; }
  h2.section { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #C2410C; margin: 18px 0 6px; }
  @page { size: A4 portrait; margin: 0; }
`;

/** Both certificate types share this frame; only the wording and the reference differ. */
function certificateShell(input: {
  documentTitle: string;
  church: ChurchHeader;
  heading: string;
  /** The recipient's full name, set large. */
  recipient: string;
  ornament: string;
  bodyHtml: string;
  reference: string;
  issued: string;
  signatureName: string;
  signatureRole: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.documentTitle)} — ${escapeHtml(input.recipient)}</title>
<style>
  ${BASE_CSS}
  .sheet { padding: 14mm; }
  .frame {
    border: 1.5px solid #C2410C;
    border-radius: 4px;
    padding: 12mm 14mm;
    min-height: 168mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }
  .frame::after {
    content: '';
    position: absolute; inset: 3mm;
    border: 0.5px solid #E7E5E4;
    border-radius: 2px;
    pointer-events: none;
  }
  .contract { text-align: center; margin-top: 16px; }
  .contract .kicker { font-size: 10px; letter-spacing: 0.34em; text-transform: uppercase; color: #A8A29E; margin: 0; }
  .contract h1 { font-size: 30px; letter-spacing: 0.06em; text-transform: uppercase; margin: 8px 0 0; color: #C2410C; }
  .rule { width: 64px; height: 2px; background: #C2410C; margin: 12px auto 0; }
  .ornament { font-size: 46px; margin: 10px 0 0; color: #D97706; }
  .recipient { font-size: 34px; margin: 12px 0 0; font-style: italic; letter-spacing: 0.01em; }
  .body { font-size: 13.5px; line-height: 1.85; text-align: center; margin: 14px auto 0; max-width: 132mm; color: #3F3F46; }
  .body strong { color: #1C1917; }
  .signatures { display: flex; justify-content: space-between; gap: 20mm; margin-top: 22px; }
  .signature { flex: 1; text-align: center; }
  .signature .line { border-top: 1px solid #57534E; margin-bottom: 5px; height: 16px; }
  .signature .who { font-size: 11px; font-weight: 700; }
  .signature .role { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #A8A29E; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; font-size: 9px; color: #A8A29E; margin-top: 18px; letter-spacing: 0.06em; }
  @page { size: A4 landscape; margin: 0; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="frame">
      <div>
        ${letterhead(input.church)}
        <div class="contract">
          <p class="kicker">${escapeHtml(input.church.name)}</p>
          <h1>${escapeHtml(input.heading)}</h1>
          <div class="rule"></div>
          <p class="ornament" aria-hidden="true">${input.ornament}</p>
        </div>
      </div>

      <div>
        <p class="recipient">${escapeHtml(input.recipient)}</p>
        <div class="body">${input.bodyHtml}</div>
      </div>

      <div>
        <div class="signatures">
          <div class="signature">
            <div class="line"></div>
            <div class="who">${escapeHtml(input.signatureName)}</div>
            <div class="role">${escapeHtml(input.signatureRole)}</div>
          </div>
          <div class="signature">
            <div class="line"></div>
            <div class="who">Church Secretary</div>
            <div class="role">${escapeHtml(input.church.name)}</div>
          </div>
        </div>
        <div class="meta">
          <span>Reference ${escapeHtml(input.reference)}</span>
          <span>Issued ${escapeHtml(input.issued)}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface BaptismCertificateInput {
  church: ChurchHeader;
  /** The person the certificate is for; a single line, as a certificate sets it. */
  fullName: string;
  /** The date the baptism took place. */
  baptismDate: string | null;
  officiant: string | null;
  /** The member's register number, used to make the certificate traceable to the roll. */
  memberNumber: string;
  location: string;
  scriptureReference?: string;
  /** The serial the register issued for this certificate, when it was issued through the register. */
  serial?: string;
}

const BAPTISM_VERSE =
  '"Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life."';

export function buildBaptismCertificate(input: BaptismCertificateInput): string {
  const verse = input.scriptureReference ?? 'Romans 6:4';
  const body = `
    was baptised in the name of the Father, and of the Son, and of the Holy Spirit,
    at <strong>${escapeHtml(input.location)}</strong> on <strong>${escapeHtml(proseDate(input.baptismDate))}</strong>,
    <strong>${escapeHtml(input.officiant ?? 'the officiating minister')}</strong> presiding,
    and is received into the fellowship of this church.
    <br /><br />
    <em style="color:#A8A29E; font-size:11.5px;">${BAPTISM_VERSE} <br />— ${escapeHtml(verse)}</em>`;

  return certificateShell({
    documentTitle: 'Certificate of Baptism',
    church: input.church,
    heading: 'Certificate of Baptism',
    recipient: input.fullName,
    ornament: '✝',
    bodyHtml: body,
    reference: input.serial ?? `BAP-${input.memberNumber}`,
    issued: proseDate(new Date().toISOString()),
    signatureName: input.officiant ?? 'The Officiating Minister',
    signatureRole: 'Officiating Minister',
  });
}

export interface DedicationCertificateInput {
  church: ChurchHeader;
  /** The child's name. */
  childName: string;
  /** The parents or guardians presenting the child, as displayed. */
  parents: string;
  dedicationDate: string | null;
  officiant: string | null;
  memberNumber: string;
  location: string;
  /** The serial the register issued for this certificate, when it was issued through the register. */
  serial?: string;
}

export function buildDedicationCertificate(input: DedicationCertificateInput): string {
  const body = `
    was presented before God and this congregation for dedication
    at <strong>${escapeHtml(input.location)}</strong> on <strong>${escapeHtml(proseDate(input.dedicationDate))}</strong>,
    <strong>${escapeHtml(input.officiant ?? 'the officiating minister')}</strong> presiding,
    and is commended to the Lord&rsquo;s keeping and to the care of this church.
    <br /><br />
    <span style="font-size:11.5px; color:#57534E;">Presented by <strong>${escapeHtml(input.parents)}</strong></span>
    <br /><br />
    <em style="color:#A8A29E; font-size:11.5px;">"Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God." <br />— Mark 10:14</em>`;

  return certificateShell({
    documentTitle: 'Certificate of Dedication',
    church: input.church,
    heading: 'Certificate of Dedication',
    recipient: input.childName,
    ornament: '✦',
    bodyHtml: body,
    reference: input.serial ?? `DED-${input.memberNumber}`,
    issued: proseDate(new Date().toISOString()),
    signatureName: input.officiant ?? 'The Officiating Minister',
    signatureRole: 'Officiating Minister',
  });
}

/**
 * The register, as one page the council can read.
 *
 * Deliberately a *summary* rather than a printout of every row: a 400-member roll printed in full is
 * a document nobody reads, and the pastoral question asked in a meeting is "how many, who are we
 * missing, where do they live" — which is exactly what the counts below answer. Every figure is
 * computed from the live register at the moment it is printed, so this page cannot disagree with the
 * screens it summarises.
 */
export interface MembershipReportInput {
  church: ChurchHeader;
  generatedBy: string;
  report: {
    total: number;
    byStatus: Record<string, number>;
    byBaptismType: Record<string, number>;
    withBaptismRecord: number;
    envelopesIssued: number;
    baptismsThisYear: number;
    youth: number;
    byLocation: Array<{ location: string; members: number }>;
    households: { total: number; household: number; single: number; large: number };
    joinedByYear: Array<{ year: string; members: number }>;
  };
}

const STATUS_NAMES: Record<string, string> = {
  active: 'Active',
  transferred: 'Transferred out',
  deceased: 'With the Lord',
  inactive: 'Inactive',
};

const BAPTISM_NAMES: Record<string, string> = {
  baptized: 'Baptised',
  dedicated: 'Dedicated as a child',
  none: 'No ordinance recorded',
};

function countRows(counts: Record<string, number>, names: Record<string, string>): string {
  const rows = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `<tr><td>${escapeHtml(names[key] ?? key)}</td><td class="num">${count}</td></tr>`)
    .join('');
  return rows || '<tr><td colspan="2">Nothing recorded yet.</td></tr>';
}

export function buildMembershipReport(input: MembershipReportInput): string {
  const { report } = input;

  const locationRows = report.byLocation
    .map((row) => `<tr><td>${escapeHtml(row.location)}</td><td class="num">${row.members}</td></tr>`)
    .join('');

  const yearRows = report.joinedByYear
    .map((row) => `<tr><td>${escapeHtml(row.year)}</td><td class="num">${row.members}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Register summary — ${escapeHtml(input.church.name)}</title>
<style>
  ${BASE_CSS}
  h1 { font-size: 22px; margin: 14px 0 2px; }
  .period { font-size: 11px; color: #57534E; margin: 0; }
  .cards { display: flex; gap: 10px; margin-top: 14px; }
  .card { flex: 1; border: 1px solid #E7E5E4; border-radius: 6px; padding: 10px 12px; }
  .card .label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #A8A29E; }
  .card .value { font-size: 17px; font-weight: 700; margin-top: 4px; color: #9B2F00; }
  .card .sub { font-size: 9.5px; color: #57534E; margin-top: 2px; }
  .split { display: flex; gap: 18px; align-items: flex-start; margin-top: 4px; }
  .split > * { flex: 1; min-width: 0; }
  .note { font-size: 10px; color: #57534E; margin-top: 14px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="sheet">
    ${letterhead(input.church)}
    <h1>Membership Register Summary</h1>
    <p class="period">Prepared by ${escapeHtml(input.generatedBy)} on ${escapeHtml(proseDate(new Date().toISOString()))} from the live register</p>

    <div class="cards">
      <div class="card">
        <div class="label">On the roll</div>
        <div class="value">${report.total}</div>
        <div class="sub">${report.byStatus.active ?? 0} active</div>
      </div>
      <div class="card">
        <div class="label">With an ordinance recorded</div>
        <div class="value">${report.withBaptismRecord}</div>
        <div class="sub">${report.baptismsThisYear} this year</div>
      </div>
      <div class="card">
        <div class="label">Households</div>
        <div class="value">${report.households.total}</div>
        <div class="sub">${report.households.household} homes · ${report.households.single} living alone</div>
      </div>
      <div class="card">
        <div class="label">Children &amp; youth</div>
        <div class="value">${report.youth}</div>
        <div class="sub">${report.envelopesIssued} envelopes issued</div>
      </div>
    </div>

    <div class="split">
      <div>
        <h2 class="section">Standing</h2>
        <table><tbody>${countRows(report.byStatus, STATUS_NAMES)}</tbody></table>
      </div>
      <div>
        <h2 class="section">Ordinances</h2>
        <table><tbody>${countRows(report.byBaptismType, BAPTISM_NAMES)}</tbody></table>
      </div>
    </div>

    <div class="split">
      <div>
        <h2 class="section">Where they live</h2>
        <table><thead><tr><th>Area</th><th class="num">Members</th></tr></thead>
        <tbody>${locationRows || '<tr><td colspan="2">No locations recorded.</td></tr>'}</tbody></table>
      </div>
      <div>
        <h2 class="section">Joined by year</h2>
        <table><thead><tr><th>Year</th><th class="num">Joined</th></tr></thead>
        <tbody>${yearRows || '<tr><td colspan="2">No join dates recorded.</td></tr>'}</tbody></table>
      </div>
    </div>

    <p class="note">
      Counts are taken from the register itself rather than from a stored total, so this page and the
      Members screens cannot disagree. Retired records are excluded: a member transferred out or
      called home is no longer on the roll, though their history remains in the Trash for thirty days
      and in the audit log for good.
    </p>

    <footer>
      <span>${escapeHtml(input.church.name)}</span>
      <span>Generated by Praxis Church OS</span>
    </footer>
  </div>
</body>
</html>`;
}

export interface FinanceSummaryInput {
  church: ChurchHeader;
  generatedBy: string;
  summary: {
    period: { from: string | null; to: string | null };
    giving: { tithes: { total: number; count: number }; offerings: { total: number; count: number }; total: number };
    projects: { cash: number; pledges: number; contributions: number; pledgeCount: number; received: number };
    welfare: { disbursed: number; awaitingPayment: number; declined: number; openCases: number };
    charity: { total: number; count: number };
    tithesByMethod: Array<{ method: string; amount: number; count: number }>;
    tithesByCategory: Array<{ category: string; amount: number; count: number }>;
  };
}

const METHOD_NAMES: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-PESA / Online',
  cheque: 'Cheque',
  bank_transfer: 'Bank transfer',
  card: 'Card',
};

/**
 * The one-page treasury summary.
 *
 * Deliberately a *summary*: the figures a treasurer is asked for in a meeting, on one page. Cash and
 * pledges are shown apart rather than summed, for the same reason the screens show them apart — a
 * total that adds promised money to banked money overstates what the church holds.
 */
export function buildFinanceSummary(input: FinanceSummaryInput): string {
  const { summary } = input;
  const period =
    summary.period.from || summary.period.to
      ? `${proseDate(summary.period.from)} — ${proseDate(summary.period.to)}`
      : 'All time to date';

  const methodRows = summary.tithesByMethod
    .map((row) => `<tr><td>${escapeHtml(METHOD_NAMES[row.method] ?? row.method)}</td><td class="num">${row.count}</td><td class="num">${kes(row.amount)}</td></tr>`)
    .join('');

  const categoryRows = summary.tithesByCategory
    .map((row) => `<tr><td>${escapeHtml(row.category)}</td><td class="num">${row.count}</td><td class="num">${kes(row.amount)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Financial Summary — ${escapeHtml(input.church.name)}</title>
<style>
  ${BASE_CSS}
  h1 { font-size: 22px; margin: 14px 0 2px; }
  .period { font-size: 11px; color: #57534E; margin: 0; }
  .cards { display: flex; gap: 10px; margin-top: 14px; }
  .card { flex: 1; border: 1px solid #E7E5E4; border-radius: 6px; padding: 10px 12px; }
  .card .label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #A8A29E; }
  .card .value { font-size: 17px; font-weight: 700; margin-top: 4px; color: #9B2F00; }
  .card .sub { font-size: 9.5px; color: #57534E; margin-top: 2px; }
  .split { display: flex; gap: 18px; align-items: flex-start; }
  .split > * { flex: 1; min-width: 0; }
  .note { font-size: 10px; color: #57534E; margin-top: 14px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="sheet">
    ${letterhead(input.church)}
    <h1>Financial Summary</h1>
    <p class="period">${escapeHtml(period)} &middot; prepared by ${escapeHtml(input.generatedBy)} on ${escapeHtml(proseDate(new Date().toISOString()))}</p>

    <div class="cards">
      <div class="card">
        <div class="label">Total giving</div>
        <div class="value">${kes(summary.giving.total)}</div>
        <div class="sub">Tithes ${kes(summary.giving.tithes.total)} &middot; Offerings ${kes(summary.giving.offerings.total)}</div>
      </div>
      <div class="card">
        <div class="label">Project funds banked</div>
        <div class="value">${kes(summary.projects.cash)}</div>
        <div class="sub">Pledges outstanding ${kes(summary.projects.pledges)}</div>
      </div>
      <div class="card">
        <div class="label">Welfare disbursed</div>
        <div class="value">${kes(summary.welfare.disbursed)}</div>
        <div class="sub">Approved, not yet paid ${kes(summary.welfare.awaitingPayment)}</div>
      </div>
      <div class="card">
        <div class="label">Charity spend</div>
        <div class="value">${kes(summary.charity.total)}</div>
        <div class="sub">${summary.charity.count} recorded disbursement${summary.charity.count === 1 ? '' : 's'}</div>
      </div>
    </div>

    <div class="split">
      <div>
        <h2 class="section">Tithes by method</h2>
        <table>
          <thead><tr><th>Method</th><th class="num">Count</th><th class="num">Amount</th></tr></thead>
          <tbody>${methodRows || '<tr><td colspan="3">No giving recorded in this period.</td></tr>'}</tbody>
        </table>
      </div>
      <div>
        <h2 class="section">Tithes by category</h2>
        <table>
          <thead><tr><th>Category</th><th class="num">Count</th><th class="num">Amount</th></tr></thead>
          <tbody>${categoryRows || '<tr><td colspan="3">No tithes recorded in this period.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <h2 class="section">Position</h2>
    <table>
      <tbody>
        <tr><td>Tithes received (${summary.giving.tithes.count})</td><td class="num">${kes(summary.giving.tithes.total)}</td></tr>
        <tr><td>Offerings received (${summary.giving.offerings.count})</td><td class="num">${kes(summary.giving.offerings.total)}</td></tr>
        <tr class="totals"><td>Total giving</td><td class="num">${kes(summary.giving.total)}</td></tr>
        <tr><td>Project contributions banked (${summary.projects.contributions})</td><td class="num">${kes(summary.projects.cash)}</td></tr>
        <tr><td>Project pledges outstanding (${summary.projects.pledgeCount})</td><td class="num">${kes(summary.projects.pledges)}</td></tr>
        <tr><td>Welfare disbursed</td><td class="num">${kes(summary.welfare.disbursed)}</td></tr>
        <tr><td>Welfare approved, not yet paid</td><td class="num">${kes(summary.welfare.awaitingPayment)}</td></tr>
        <tr><td>Welfare cases open</td><td class="num">${summary.welfare.openCases}</td></tr>
        <tr><td>Charity spend (${summary.charity.count})</td><td class="num">${kes(summary.charity.total)}</td></tr>
      </tbody>
    </table>

    <p class="note">
      Every figure above is computed from the live ledger, not from a stored total, so this summary
      cannot disagree with the records it summarises. Each financial record also writes a line to the
      chained audit ledger, which can be verified from the Finance Audit screen.
    </p>

    <footer>
      <span>${escapeHtml(input.church.name)}</span>
      <span>Generated by Praxis Church OS</span>
    </footer>
  </div>
</body>
</html>`;
}

export interface GivingReceiptInput {
  church: ChurchHeader;
  /** Who handed it over. Printed as the issuer, and recorded nowhere: a receipt is not a record. */
  generatedBy: string;
  receipt: {
    /** The transaction's own code, which is the number a giver quotes back to the office. */
    number: string;
    issuedOn: string;
    receivedFrom: string;
    /** Tithe, offering or a gift toward a named project. */
    kind: string;
    designation?: string | null;
    amount: number;
    method: string;
    reference?: string | null;
    envelopeNo?: string | null;
    collectedAt?: string | null;
    receivedBy?: string | null;
  };
}

/**
 * A giver's receipt for one transaction.
 *
 * Built from the record, never from a counter: the number is the transaction code the ledger already
 * issued, so a second copy of the same receipt carries the same number and a receipt can never claim a
 * gift the books do not hold. Nothing here writes — printing is a read, which is why a receipt can be
 * reprinted years later without disturbing a single figure.
 */
export function buildGivingReceipt(input: GivingReceiptInput): string {
  const { receipt } = input;
  const rows: Array<[string, string]> = [
    ['Received from', receipt.receivedFrom],
    ['Towards', receipt.designation ? `${receipt.kind} · ${receipt.designation}` : receipt.kind],
    ['Payment method', METHOD_NAMES[receipt.method] ?? receipt.method],
  ];
  if (receipt.envelopeNo) rows.push(['Envelope', receipt.envelopeNo]);
  if (receipt.reference) rows.push(['Reference', receipt.reference]);
  if (receipt.collectedAt) rows.push(['Collected at', receipt.collectedAt]);
  if (receipt.receivedBy) rows.push(['Received by', receipt.receivedBy]);

  const detail = rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(receipt.number)} — ${escapeHtml(input.church.name)}</title>
<style>
  ${BASE_CSS}
  h1 { font-size: 22px; margin: 14px 0 2px; }
  .meta { font-size: 11px; color: #57534E; margin: 0; }
  .amount { margin: 18px 0 6px; padding: 14px 16px; border: 1px solid #E7E5E4; border-radius: 6px; display: flex; align-items: baseline; justify-content: space-between; }
  .amount .label { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #A8A29E; }
  .amount .value { font-size: 26px; font-weight: 700; color: #9B2F00; }
  table.fields { width: 100%; border-collapse: collapse; margin-top: 12px; }
  table.fields th { width: 34%; text-align: left; font-size: 10.5px; color: #57534E; font-weight: 500; padding: 6px 0; vertical-align: top; }
  table.fields td { font-size: 11.5px; padding: 6px 0; }
  table.fields tr + tr th, table.fields tr + tr td { border-top: 1px dotted #E7E5E4; }
  .note { font-size: 10px; color: #57534E; margin-top: 18px; line-height: 1.6; }
  .sign { margin-top: 26px; display: flex; justify-content: space-between; gap: 24px; }
  .sign div { flex: 1; border-top: 1px solid #1C1917; padding-top: 4px; font-size: 9.5px; color: #57534E; }
</style>
</head>
<body>
  <div class="sheet">
    ${letterhead(input.church)}
    <h1>Receipt</h1>
    <p class="meta">
      No. ${escapeHtml(receipt.number)} &middot; issued ${escapeHtml(proseDate(receipt.issuedOn))}
      &middot; printed by ${escapeHtml(input.generatedBy)} on ${escapeHtml(proseDate(new Date().toISOString()))}
    </p>

    <div class="amount">
      <span class="label">Amount received</span>
      <span class="value">${kes(receipt.amount)}</span>
    </div>

    <table class="fields"><tbody>${detail}</tbody></table>

    <p class="note">
      This receipt reflects a transaction already recorded in the church's books, and quoting its number
      is enough for the office to find it. A transaction that was voided is reported as voided in the
      ledger and is not a valid receipt.
    </p>

    <div class="sign">
      <div>Received by (treasurer or usher)</div>
      <div>Church stamp</div>
    </div>

    <footer>
      <span>${escapeHtml(input.church.name)}</span>
      <span>Generated by Praxis Church OS</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Print a document the browser has already rendered.
 *
 * A hidden iframe rather than a new window: `window.open` is blocked by most pop-up blockers, and a
 * console that silently fails to print a certificate is worse than one that cannot. The iframe is
 * same-origin, so `print()` reaches it directly, and it is removed once the dialog closes.
 *
 * The promise resolves when printing has been *handed to the browser* — the print dialog is modal and
 * reports nothing back, so there is no honest way to know whether the operator saved or cancelled.
 */
export function printDocument(html: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.srcdoc = html;

    const cleanup = () => {
      // Give the browser a moment to finish spooling the job before the frame goes away.
      window.setTimeout(() => frame.remove(), 1000);
      resolve();
    };

    frame.onload = () => {
      const view = frame.contentWindow;
      if (!view) {
        cleanup();
        return;
      }
      view.focus();
      view.print();
      cleanup();
    };

    document.body.appendChild(frame);
  });
}

/** Turn a fetched blob into a data URL, so a printed document can carry the church's own logo. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That image could not be read'));
    reader.readAsDataURL(blob);
  });
}
