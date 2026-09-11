import { decodeCSVFragment } from './csvFragment.ts';

export async function getCSVData(
  win: Window & { __INITIAL_CSV__?: string },
  loadDefault: () => Promise<string>,
): Promise<string> {
  const url = new URL(win.location.href);

  // The fragment outranks `?csv=`: it is the one that holds a whole dataset,
  // and unlike the query string it never reaches a server. `URLSearchParams`
  // is safe to parse it with because base64url has no `+` for it to turn back
  // into a space.
  const fragment = new URLSearchParams(url.hash.slice(1)).get('csv');

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
