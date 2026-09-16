import { decodeCSVFragment } from './csvFragment.ts';

export async function getCSVData(
  win: Window & { __INITIAL_CSV__?: string },
  loadDefault: () => Promise<string>,
): Promise<string> {
  const url = new URL(win.location.href);

  // The fragment outranks `?csv=`: it is the one that holds a whole dataset,
  // and unlike the query string it never reaches a server.
  const fragment = fragmentParam(url.hash, 'csv');

  if (fragment) {
    return decodeCSVFragment(fragment);
  }

  const csvParam = url.searchParams.get('csv');

  if (csvParam) {
    return csvParam;
  }

  if (win.__INITIAL_CSV__) {
    return win.__INITIAL_CSV__;
  }

  return loadDefault();
}

/**
 * The raw, still-encoded value of one `key=value` pair in a fragment.
 *
 * `URLSearchParams` would be the obvious tool and is the wrong one here: it
 * decodes what it returns, so a percent-encoded CSV would be decoded here and
 * again in `decodeCSVFragment`, and a cell holding the literal text `%0A` --
 * spelled `%250A` in the link -- would come out of the second pass as a row
 * break. It also applies form decoding, which reads a `+` in a cell as a
 * space. A fragment is not a form submission, so the value is handed over
 * exactly as the link spelled it, and decoded exactly once.
 */
function fragmentParam(hash: string, key: string): string | undefined {
  const prefix = `${key}=`;

  for (const pair of hash.replace(/^#/, '').split('&')) {
    if (pair.startsWith(prefix)) return pair.slice(prefix.length);
  }

  return undefined;
}
