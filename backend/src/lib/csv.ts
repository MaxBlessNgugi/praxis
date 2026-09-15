/**
 * CSV, as far as a church office actually produces it.
 *
 * This is deliberately not a dependency, and deliberately not the whole of RFC 4180. What arrives from
 * a parish is Excel's *Save as CSV*, and that means four things have to work: quoted cells, commas
 * inside a quoted cell, a newline inside a quoted cell, and the UTF-8 byte-order mark Excel writes
 * without mentioning. A fifth matters just as much — Excel uses a semicolon instead of a comma when
 * the machine's locale says a comma is a decimal separator — because without it a file from that
 * machine reads as one column of everything.
 *
 * The parser is the register's front door, so it is strict about shape and silent about content: it
 * reports what the columns and rows *are* and leaves the question of whether a row describes a person
 * to the validator that knows the register.
 */

/** The delimiters a spreadsheet might have used. Order is only the tie-break. */
const DELIMITERS = [',', ';', '\t', '|'] as const;

export interface CsvTable {
  headers: string[];
  /** Body rows, blanks at the end of a row included, because a missing column is not a shifted one. */
  rows: string[][];
}

/**
 * Which delimiter this file uses.
 *
 * Counted outside quotes, on the header line: a comma inside `"Kariobangi, Nairobi"` says nothing
 * about the file's shape, and counting the whole document would let one quoted paragraph outvote the
 * real delimiter.
 */
function sniffDelimiter(text: string): string {
  const line = text.split(/\r?\n/, 1)[0] ?? '';
  let best: string = DELIMITERS[0];
  let bestCount = -1;
  let quoted = false;

  for (const candidate of DELIMITERS) {
    let count = 0;
    quoted = false;
    for (const character of line) {
      if (character === '"') quoted = !quoted;
      else if (character === candidate && !quoted) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Read a CSV document.
 *
 * The loop is character by character rather than line by line because a quoted cell may contain the
 * line break, and a line-based split would tear a member's two-line address into two members.
 */
export function parseCsv(text: string, delimiter?: string): CsvTable {
  const separator = delimiter ?? sniffDelimiter(text);
  // Excel's BOM, which would otherwise become part of the first column's name.
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const cells: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character !== '"') {
        cell += character;
      } else if (source[index + 1] === '"') {
        cell += '"';
        index += 1; // a doubled quote inside a quoted cell is one literal quote
      } else {
        quoted = false;
      }
      continue;
    }

    if (character === '"' && cell === '') {
      quoted = true;
    } else if (character === separator) {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      cells.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  // The final line, unless the document ended with the newline that terminated it.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    cells.push(row);
  }

  const [headerRow = [], ...body] = cells;
  const headers = headerRow.map((name, index) => name.trim() || `Column ${index + 1}`);

  // Trailing blank lines are what Excel leaves behind, not rows.
  const rows = body.filter((values) => values.some((value) => value.trim() !== ''));
  return { headers, rows };
}

/**
 * Write a CSV document.
 *
 * Quoting is decided per cell rather than per file: a cell that holds a comma, a quote or a line break
 * is quoted, and every other cell is left alone so the file stays readable in a text editor. The BOM
 * is prepended by the route that serves the download, not here — a file this function returns is also
 * read by tests and by the export on its way into an archive.
 */
export function stringifyCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const encode = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(encode).join(',')).join('\r\n');
}
