import { test } from 'node:test';
import assert from 'node:assert';
import { CLIError, parseArgs } from './cliOptions.ts';

test('parseArgs', async (t) => {
  await t.test('defaults to stdin with no chart options', () => {
    assert.deepStrictEqual(parseArgs([]), { csvPath: null, chartOptions: {}, help: false });
  });

  await t.test('reads the CSV path', () => {
    assert.deepStrictEqual(parseArgs(['data.csv']), {
      csvPath: 'data.csv',
      chartOptions: {},
      help: false,
    });
  });

  await t.test('parses y scale bounds given as separate arguments', () => {
    assert.deepStrictEqual(parseArgs(['--y-max', '100', '--y-min', '-5', 'data.csv']), {
      csvPath: 'data.csv',
      chartOptions: { yMax: 100, yMin: -5 },
      help: false,
    });
  });

  await t.test('parses y scale bounds given inline', () => {
    assert.deepStrictEqual(parseArgs(['--y-max=100', 'data.csv']), {
      csvPath: 'data.csv',
      chartOptions: { yMax: 100 },
      help: false,
    });
  });

  await t.test('accepts options after the CSV path', () => {
    assert.deepStrictEqual(parseArgs(['data.csv', '--y-max', '0.5']), {
      csvPath: 'data.csv',
      chartOptions: { yMax: 0.5 },
      help: false,
    });
  });

  await t.test('reports help', () => {
    assert.strictEqual(parseArgs(['--help']).help, true);
    assert.strictEqual(parseArgs(['-h']).help, true);
  });

  await t.test('rejects a non-numeric bound', () => {
    assert.throws(() => parseArgs(['--y-max', 'abc']), CLIError);
    assert.throws(() => parseArgs(['--y-max']), CLIError);
    assert.throws(() => parseArgs(['--y-max=']), CLIError);
  });

  await t.test('rejects an unknown option', () => {
    assert.throws(() => parseArgs(['--nope', 'data.csv']), CLIError);
  });
});
