import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as zlib from 'node:zlib';

import { MAX_DECOMPRESSED_BYTES, decodeCSVFragment } from './csvFragment.ts';

const CSV = `date,value
2023-01-01,1
2023-01-02,2`;

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function gzipped(text: string): string {
  return base64url(zlib.gzipSync(Buffer.from(text, 'utf-8')));
}

describe('decodeCSVFragment', () => {
  it('reads a gzipped payload', async () => {
    assert.strictEqual(await decodeCSVFragment(gzipped(CSV)), CSV);
  });

  it('reads a payload that was not compressed', async () => {
    assert.strictEqual(await decodeCSVFragment(base64url(Buffer.from(CSV, 'utf-8'))), CSV);
  });

  it('survives multi-byte characters split across decompressed chunks', async () => {
    // One long run of the same character, so gzip emits it in several chunks
    // and a naive per-chunk decode would tear a character in half.
    const wide = `date,café\n${'2023-01-01,€\n'.repeat(20000)}`;
    assert.strictEqual(await decodeCSVFragment(gzipped(wide)), wide);
  });

  it('accepts base64url that carries no padding', async () => {
    const padded = Buffer.from(zlib.gzipSync(Buffer.from(CSV, 'utf-8'))).toString('base64url');
    assert.ok(!padded.includes('='));
    assert.strictEqual(await decodeCSVFragment(padded), CSV);
  });

  it('reads a gzip header that carries the source filename', async () => {
    // What `gzip -c file` writes when `-n` is forgotten: FLG bit 3 set, and a
    // NUL-terminated name after the ten fixed header bytes. The README says to
    // pass `-n` so the name does not travel in the link, but a link built
    // without it still has to plot.
    const plain = zlib.gzipSync(Buffer.from(CSV, 'utf-8'));
    const name = Buffer.from('secret-quarterly-figures.csv\0', 'latin1');
    const named = Buffer.concat([plain.subarray(0, 10), name, plain.subarray(10)]);
    named.writeUInt8(named.readUInt8(3) | 0b1000, 3);

    assert.strictEqual(await decodeCSVFragment(base64url(named)), CSV);
  });

  it('rejects a payload that is not base64url', async () => {
    await assert.rejects(() => decodeCSVFragment('not base64!'), /not valid base64url/);
  });

  it('rejects bytes that claim to be gzip but are not', async () => {
    await assert.rejects(() => decodeCSVFragment(base64url(new Uint8Array([0x1f, 0x8b, 0x00]))));
  });

  it('refuses a decompression bomb rather than expanding it', async () => {
    // 8 MiB of zeroes gzips to a few kilobytes, so this is the shape of a link
    // that is cheap to send and expensive to open.
    const bomb = gzipped('0'.repeat(8 * 1024 * 1024));
    assert.ok(bomb.length < 16 * 1024);

    await assert.rejects(() => decodeCSVFragment(bomb, 1024), /expands past the 1024 byte limit/);
  });

  it('caps at MAX_DECOMPRESSED_BYTES by default', () => {
    assert.strictEqual(MAX_DECOMPRESSED_BYTES, 32 * 1024 * 1024);
  });
});
