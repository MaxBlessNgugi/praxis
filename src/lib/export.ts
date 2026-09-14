/**
 * Client-side exports — CSV, Excel and print-to-PDF — with no dependency behind them.
 *
 * Ported from ECCLESIA (`src/utils/export.ts`), where every report panel offers the same three
 * outputs. A column pairs a header label with a value extractor, so the caller decides which
 * fields leave the app and in what order.
 */

export interface ExportColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** RFC 4180: quote anything holding a comma, quote or newline, and double the quotes. */
function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function xmlEscape(value: string | number | null | undefined): string {
  return (value == null ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const withExtension = (filename: string, ext: string) => (filename.endsWith(ext) ? filename : `${filename}${ext}`);

/** UTF-8 CSV, with a BOM so Excel opens the accented names correctly. */
export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const lines = [
    columns.map((c) => csvEscape(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => csvEscape(c.value(r))).join(',')),
  ];
  download(withExtension(filename, '.csv'), new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
}

/** SpreadsheetML 2003 — the format Excel opens natively, with real numeric cells. */
export function exportExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const cell = (value: string | number | null | undefined, type: 'String' | 'Number') =>
    `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;

  const sheet = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Report"><Table>',
    '<Row>' + columns.map((c) => cell(c.label, 'String')).join('') + '</Row>',
    ...rows.map(
      (r) =>
        '<Row>' +
        columns
          .map((c) => {
            const raw = c.value(r);
            return cell(raw, typeof raw === 'number' && Number.isFinite(raw) ? 'Number' : 'String');
          })
          .join('') +
        '</Row>',
    ),
    '</Table></Worksheet></Workbook>',
  ].join('');

  download(withExtension(filename, '.xls'), new Blob([sheet], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
}

/** Print-to-PDF through a clean popup, so no PDF library is needed to produce one. */
export function exportPdf<T>(filename: string, title: string, columns: ExportColumn<T>[], rows: T[]): void {
  const header = columns.map((c) => `<th>${xmlEscape(c.label)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${xmlEscape(c.value(r))}</td>`).join('')}</tr>`)
    .join('');
  const empty = `<tr><td colspan="${columns.length}" style="text-align:center;color:#888">No records yet.</td></tr>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${xmlEscape(filename)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1c1c; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f0efef; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<h1>${xmlEscape(title)}</h1>
<div class="meta">${xmlEscape(new Date().toLocaleString())} &middot; ${rows.length} record(s)</div>
<table><thead><tr>${header}</tr></thead><tbody>${body || empty}</tbody></table>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  // Long enough for fonts and layout to settle before the print dialog snapshots the page.
  setTimeout(() => {
    win.print();
    win.close();
  }, 350);
}
