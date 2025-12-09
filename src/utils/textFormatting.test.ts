
import { test } from 'node:test';
import assert from 'node:assert';
import { formatColumnName } from './textFormatting.ts';

test('formatColumnName', () => {
  assert.strictEqual(formatColumnName('hello_world'), 'Hello world');
  assert.strictEqual(formatColumnName('total_assets'), 'Total assets');
  assert.strictEqual(formatColumnName('date'), 'Date');
  assert.strictEqual(formatColumnName('simple'), 'Simple');
  assert.strictEqual(formatColumnName('multiple_underscores_here'), 'Multiple underscores here');
  assert.strictEqual(formatColumnName(''), '');
});
