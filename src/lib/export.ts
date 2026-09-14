/**
 * CSV export — the dependency-free half of ECCLESIA's `src/utils/export.ts`, where every report
 * panel offers the same outputs. Its Excel and print-to-PDF variants are not carried over: nothing
 * in the console offers them, and unused export code is a maintenance cost with no caller.
 *
 * A column pairs a header label with a value extractor, so the caller decides which fields leave
 * the app and in what order.
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

/** UTF-8 CSV, with a BOM so Excel opens the accented names correctly. */
export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const lines = [
    columns.map((c) => csvEscape(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => csvEscape(c.value(r))).join(',')),
  ];
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  download(name, new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
}
