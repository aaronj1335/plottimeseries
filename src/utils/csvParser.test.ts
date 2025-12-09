import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCSV } from './csvParser.ts';

describe('CSV Parser', () => {
  it('should parse valid CSV data', () => {
    const csv = `date,val1,val2\n2023-01-01,10,20\n2023-01-02,15,25`;
    const { data, columns } = parseCSV(csv);

    assert.deepStrictEqual(columns, ['val1', 'val2']);
    assert.strictEqual(data.length, 2);

    // Check first row
    assert.strictEqual(data[0].date.toISOString().split('T')[0], '2023-01-01');
    assert.strictEqual(data[0].val1, 10);
    assert.strictEqual(data[0].val2, 20);
  });

  it('should ignore rows with invalid dates', () => {
    const csv = `date,val\ninvalid-date,10\n2023-01-01,20`;
    const { data } = parseCSV(csv);

    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].val, 20);
  });

  it('should handle empty CSV', () => {
    const { data, columns } = parseCSV('');
    assert.strictEqual(data.length, 0);
    assert.strictEqual(columns.length, 0);
  });
});
