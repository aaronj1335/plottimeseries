
import { test } from 'node:test';
import assert from 'node:assert';
import { analyzeColumnFormatters } from './numberFormatting';
import { DataPoint } from './csvParser';

test('analyzeColumnFormatters', async (t) => {
  await t.test('formats range [-2, 2] as percentages', () => {
    const columns = ['pct'];
    const data: DataPoint[] = [
      { date: new Date(), pct: 0.5 },
      { date: new Date(), pct: -1.5 },
      { date: new Date(), pct: 2.0 },
    ];
    // Min -1.5, Max 2.0. Inside [-2, 2].
    
    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['pct'];
    
    assert.strictEqual(fmt(0.123), '12.3%');
    assert.strictEqual(fmt(1.5), '150.0%');
    assert.strictEqual(fmt(-0.5), '-50.0%');
  });

  await t.test('formats range [-10, 10] as 1 decimal place', () => {
    const columns = ['dec'];
    // Must be outside [-2, 2] to trigger this, so include something > 2 or < -2.
    const data: DataPoint[] = [
      { date: new Date(), dec: 5.55 },
      { date: new Date(), dec: -9.9 },
      { date: new Date(), dec: 0 },
    ];
    // Min -9.9, Max 5.55. Inside [-10, 10]. Outside [-2, 2].
    
    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['dec'];
    
    assert.strictEqual(fmt(5.543), '5.5');
    assert.strictEqual(fmt(0), '0.0');
    assert.strictEqual(fmt(-9.12), '-9.1');
  });

  await t.test('formats range outside [-10, 10] as integers', () => {
    const columns = ['int'];
    // Need > 10 or < -10.
    const data: DataPoint[] = [
      { date: new Date(), int: 10.1 }, 
      { date: new Date(), int: 1000 },
    ];
    // Max 1000. Outside [-10, 10].
    
    const formatters = analyzeColumnFormatters(data, columns);
    const fmt = formatters['int'];
    
    assert.strictEqual(fmt(1234.56), '1,235');
    assert.strictEqual(fmt(10.1), '10');
    assert.strictEqual(fmt(-15.9), '-16');
  });
});
