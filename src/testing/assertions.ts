import assert from 'node:assert';

export function defined<T>(value: T | undefined, what = 'value'): T {
  assert.ok(value !== undefined, `expected a ${what}, found undefined`);
  return value;
}
