const QUOTE = '"';
const DELIMITER = ',';
const LF = '\n';
const CR = '\r';

function plainField(text: string, start: number, end: number): [string, number] {
  let i = start;
  while (i < end && text[i] !== DELIMITER && text[i] !== LF && text[i] !== CR) i += 1;
  return [text.slice(start, i), i];
}

function quotedField(text: string, start: number, end: number): [string, number] {
  let value = '';
  let i = start + 1;

  while (i < end) {
    if (text[i] !== QUOTE) {
      value += text[i];
      i += 1;
    } else if (i + 1 < end && text[i + 1] === QUOTE) {
      value += QUOTE;
      i += 2;
    } else {
      break;
    }
  }

  return [value, i + 1];
}

/**
 * RFC 4180 CSV, as rows of raw fields: a field opening with `"` runs to its
 * closing quote and may hold commas and newlines, `""` inside one is a literal
 * quote, and rows end at LF or CRLF. A field is quoted only if its first
 * character is a quote, so a stray `"` mid-field is just a character.
 *
 * Scanned character by character rather than compiled. d3's `csvParse` builds
 * its row-to-object function with `new Function`, which would put an eval in
 * the bundle and force `'unsafe-eval'` into the CSP; validate.ts fails the
 * build if one reappears.
 */
export function parseCSVRows(text: string): string[][] {
  let end = text.length;
  if (text[end - 1] === LF) end -= 1;
  if (text[end - 1] === CR) end -= 1;
  if (end <= 0) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  while (i <= end) {
    const [value, after] = text[i] === QUOTE ? quotedField(text, i, end) : plainField(text, i, end);
    row.push(value);

    if (after >= end) break;

    // Whatever follows a field separates it from the next one. After a closing
    // quote that can be any character, not just the delimiter.
    if (text[after] !== LF && text[after] !== CR) {
      i = after + 1;
      continue;
    }

    rows.push(row);
    row = [];
    i = text[after] === CR && text[after + 1] === LF ? after + 2 : after + 1;
  }

  rows.push(row);
  return rows;
}
