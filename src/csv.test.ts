import assert from 'node:assert';
import { describe, it } from 'node:test';

import { parseCSVRows } from './csv.ts';

describe('parseCSVRows', () => {
  it('splits plain rows and fields', () => {
    assert.deepStrictEqual(parseCSVRows('a,b\nc,d'), [
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('reads CRLF and LF the same way', () => {
    assert.deepStrictEqual(parseCSVRows('a,b\r\nc,d'), parseCSVRows('a,b\nc,d'));
  });

  it('ignores one trailing newline, so a final blank line is not a row', () => {
    assert.deepStrictEqual(parseCSVRows('a\n'), [['a']]);
    assert.deepStrictEqual(parseCSVRows('a\r\n'), [['a']]);
    assert.deepStrictEqual(parseCSVRows('a\n\n'), [['a'], ['']]);
  });

  it('keeps empty fields, wherever they fall', () => {
    assert.deepStrictEqual(parseCSVRows('a,,b'), [['a', '', 'b']]);
    assert.deepStrictEqual(parseCSVRows(',a'), [['', 'a']]);
    assert.deepStrictEqual(parseCSVRows('a,'), [['a', '']]);
  });

  it('has no rows in an empty file, or one that is only a newline', () => {
    assert.deepStrictEqual(parseCSVRows(''), []);
    assert.deepStrictEqual(parseCSVRows('\n'), []);
    assert.deepStrictEqual(parseCSVRows('\r\n'), []);
  });

  it('takes a quoted field whole, commas and newlines included', () => {
    assert.deepStrictEqual(parseCSVRows('"a,b",c'), [['a,b', 'c']]);
    assert.deepStrictEqual(parseCSVRows('"a\nb",c'), [['a\nb', 'c']]);
    assert.deepStrictEqual(parseCSVRows('"a\r\nb",c'), [['a\r\nb', 'c']]);
  });

  it('reads a doubled quote inside a quoted field as one quote', () => {
    assert.deepStrictEqual(parseCSVRows('"a""b",c'), [['a"b', 'c']]);
    assert.deepStrictEqual(parseCSVRows('""""'), [['"']]);
    assert.deepStrictEqual(parseCSVRows('"",""'), [['', '']]);
  });

  it('quotes a field only at its start, so a quote mid-field is a character', () => {
    assert.deepStrictEqual(parseCSVRows('a"b,c'), [['a"b', 'c']]);
    assert.deepStrictEqual(parseCSVRows(' "a",b'), [[' "a"', 'b']]);
  });

  it('separates on whatever follows a closing quote', () => {
    assert.deepStrictEqual(parseCSVRows('"a" ,b'), [['a', '', 'b']]);
    assert.deepStrictEqual(parseCSVRows('"a"b,c'), [['a', '', 'c']]);
  });

  it('takes the rest of the input as the field when a quote is never closed', () => {
    assert.deepStrictEqual(parseCSVRows('"a,b'), [['a,b']]);
    assert.deepStrictEqual(parseCSVRows('a,"b'), [['a', 'b']]);
  });

  it('parses the shape the app actually loads', () => {
    assert.deepStrictEqual(parseCSVRows('date,value,note\n2024-01-01,1.5,"one, two"\n'), [
      ['date', 'value', 'note'],
      ['2024-01-01', '1.5', 'one, two'],
    ]);
  });
});
