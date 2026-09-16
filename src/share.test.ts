import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as zlib from 'node:zlib';

import { buildShareURL, shareCSV, type ShareWindow } from './share.ts';

const CSV = `date,value
2023-01-01,1
2023-01-02,2`;

interface FakeWindow extends ShareWindow {
  copied: string[];
  replaced: string[];
}

function fakeWindow(href: string, writeText?: (text: string) => Promise<void>): FakeWindow {
  const copied: string[] = [];
  const replaced: string[] = [];

  return {
    location: { href },
    navigator: {
      clipboard: writeText && {
        writeText: async (text: string) => {
          await writeText(text);
          copied.push(text);
        },
      },
    },
    history: {
      replaceState: (_data: unknown, _unused: string, url: string) => {
        replaced.push(url);
      },
    },
    copied,
    replaced,
  };
}

function csvFrom(url: string): string {
  const fragment = new URLSearchParams(new URL(url).hash.slice(1)).get('csv') ?? '';
  return zlib.gunzipSync(Buffer.from(fragment, 'base64url')).toString('utf-8');
}

describe('buildShareURL', () => {
  it('carries the CSV back to the same page', async () => {
    const url = await buildShareURL(fakeWindow('https://example.com/plottimeseries'), CSV);

    assert.strictEqual(
      new URL(url).origin + new URL(url).pathname,
      'https://example.com/plottimeseries',
    );
    assert.strictEqual(csvFrom(url), CSV);
  });

  it('shares what is on screen, not the fragment the page was opened with', async () => {
    const stale = `csv=${zlib.gzipSync(Buffer.from('date,old\n2020-01-01,1')).toString('base64url')}`;
    const url = await buildShareURL(fakeWindow(`https://example.com/#${stale}`), CSV);

    assert.strictEqual(csvFrom(url), CSV);
  });

  it('drops a ?csv= that would ride along to the server', async () => {
    const url = await buildShareURL(
      fakeWindow('https://example.com/?csv=date%2Cold%0A2020-01-01%2C1'),
      CSV,
    );

    assert.strictEqual(new URL(url).searchParams.get('csv'), null);
    assert.strictEqual(csvFrom(url), CSV);
  });

  it('leaves every other query parameter alone', async () => {
    const url = await buildShareURL(fakeWindow('https://example.com/?ymin=0&ymax=100'), CSV);

    assert.strictEqual(new URL(url).search, '?ymin=0&ymax=100');
  });
});

describe('shareCSV', () => {
  it('puts the link on the clipboard', async () => {
    const win = fakeWindow('https://example.com/', () => Promise.resolve());

    assert.strictEqual(await shareCSV(win, CSV), 'copied');
    assert.strictEqual(win.copied.length, 1);
    assert.strictEqual(csvFrom(win.copied[0]!), CSV);
    assert.deepStrictEqual(win.replaced, []);
  });

  it('falls back to the address bar where there is no clipboard', async () => {
    const win = fakeWindow('https://example.com/');

    assert.strictEqual(await shareCSV(win, CSV), 'address-bar');
    assert.strictEqual(win.replaced.length, 1);
    assert.strictEqual(csvFrom(win.replaced[0]!), CSV);
  });

  it('falls back to the address bar when the clipboard write is refused', async () => {
    const win = fakeWindow('https://example.com/', () =>
      Promise.reject(new Error('Document is not focused')),
    );

    assert.strictEqual(await shareCSV(win, CSV), 'address-bar');
    assert.deepStrictEqual(win.copied, []);
    assert.strictEqual(csvFrom(win.replaced[0]!), CSV);
  });
});
