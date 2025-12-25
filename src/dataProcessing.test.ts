import { describe, it, test } from 'node:test';
import assert from 'node:assert';
import {
  parseCSV,
  analyzeColumnFormatters,
  formatColumnName,
  processCSV,
  DataPoint,
} from './dataProcessing.ts';

describe('parseCSV', () => {
  it('should parse valid CSV data', () => {
    const csv = `date,val1,val2\n2023-01-01,10,20\n2023-01-02,15,25`;
    const { data, columns } = parseCSV(csv);

    assert.deepStrictEqual(columns, ['val1', 'val2']);
    assert.strictEqual(data.length, 2);

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

  it('should parse dates correctly', () => {
    const dateString = '2023-01-01';
    const dateObject = new Date(dateString);

    assert.strictEqual(dateObject.toISOString(), '2023-01-01T00:00:00.000Z');
  });

  it('should handle data with uppercase Date field', () => {
    const csv = `Date,pct_change,amount,category
2023-01-01,0.15,45.5,High
2023-01-02,-0.8,-99.25,Low
2023-01-03,0.02,0.75,Medium
2023-01-04,1.0,100,High
2023-01-05,-0.33,-5.5,Low
2023-01-06,0.5,0.05,Medium`;
    const { data } = parseCSV(csv);

    assert.strictEqual(data.length, 6);
    assert.strictEqual(data[0].pct_change, 0.15);
    assert.strictEqual(data[0].amount, 45.5);
    assert.strictEqual(data[0].category, 'High');
  });
});

test('analyzeColumnFormatters', async (t) => {
  await t.test('formats range [-2, 2] as percentages', () => {
    const columns = ['pct'];
    const data: DataPoint[] = [
      { date: new Date(), pct: 0.5 },
      { date: new Date(), pct: -1.5 },
      { date: new Date(), pct: 2.0 },
    ];

    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['pct'];

    assert.strictEqual(fmt(0.123), '12.3%');
    assert.strictEqual(fmt(1.5), '150.0%');
    assert.strictEqual(fmt(-0.5), '-50.0%');
  });

  await t.test('formats range [-10, 10] as 1 decimal place', () => {
    const columns = ['dec'];
    const data: DataPoint[] = [
      { date: new Date(), dec: 5.55 },
      { date: new Date(), dec: -9.9 },
      { date: new Date(), dec: 0 },
    ];

    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['dec'];

    assert.strictEqual(fmt(5.543), '5.5');
    assert.strictEqual(fmt(0), '0.0');
    assert.strictEqual(fmt(-9.12), '-9.1');
  });

  await t.test('formats range outside [-10, 10] as integers', () => {
    const columns = ['int'];
    const data: DataPoint[] = [
      { date: new Date(), int: 10.1 },
      { date: new Date(), int: 1000 },
    ];

    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['int'];

    assert.strictEqual(fmt(1234.56), '1,235');
    assert.strictEqual(fmt(10.1), '10');
    assert.strictEqual(fmt(-15.9), '-16');
  });
});

test('formatColumnName', () => {
  assert.strictEqual(formatColumnName('hello_world'), 'Hello world');
  assert.strictEqual(formatColumnName('total_assets'), 'Total assets');
  assert.strictEqual(formatColumnName('date'), 'Date');
  assert.strictEqual(formatColumnName('simple'), 'Simple');
  assert.strictEqual(formatColumnName('multiple_underscores_here'), 'Multiple underscores here');
  assert.strictEqual(formatColumnName(''), '');
});

test('processCSV', async (t) => {
  await t.test('converts CSV string to formatted data points', () => {
    const csv = `date,pct_change,amount,category
2023-01-01,0.15,45.5,High
2023-01-02,-0.8,-99.25,Low`;

    const { formattedData, columns } = processCSV(csv);

    assert.deepStrictEqual(columns, ['pct_change', 'amount', 'category']);
    assert.strictEqual(formattedData.length, 2);

    assert.strictEqual(formattedData[0].formattedDate, '2023-01-01');
    assert.strictEqual(formattedData[0].pct_change, '15.0%');
    assert.strictEqual(formattedData[0].amount, '46');
    assert.strictEqual(formattedData[0].category, 'High');

    assert.strictEqual(formattedData[1].formattedDate, '2023-01-02');
    assert.strictEqual(formattedData[1].pct_change, '-80.0%');
    assert.strictEqual(formattedData[1].amount, '-99');
    assert.strictEqual(formattedData[1].category, 'Low');
  });

  await t.test('handles empty CSV', () => {
    const { formattedData, columns } = processCSV('');
    assert.strictEqual(formattedData.length, 0);
    assert.strictEqual(columns.length, 0);
  });
});
