/**
 * The share button's half of `data.ts`: the CSV this tab is showing, turned
 * back into a link that reopens it.
 *
 * `getCSVData` reads `#csv=` and `?csv=`; this writes the fragment form, which
 * is the only one that holds a whole dataset without sending it anywhere. The
 * link is delivered to the clipboard, and to the address bar when that is not
 * available -- either way it never leaves the machine.
 */
import { encodeCSVFragment } from './csvFragment.ts';

/** Where the link ended up, so the button can say which happened. */
export type ShareOutcome = 'copied' | 'address-bar';

/** The parts of `window` sharing touches, spelled out so tests can stand in. */
export interface ShareWindow {
  readonly location: { readonly href: string };
  // `| undefined` rather than just optional: outside a secure context the
  // property is there and holds nothing, which is not the same as absent.
  readonly navigator: {
    readonly clipboard?: { writeText(text: string): Promise<void> } | undefined;
  };
  readonly history: { replaceState(data: unknown, unused: string, url: string): void };
}

/**
 * This page, carrying the whole dataset in its fragment.
 *
 * Any `?csv=` is dropped rather than carried along: the fragment outranks it
 * when the link is opened, so keeping it would only pad the link out with a
 * second copy of the data -- the copy that does travel to the server.
 */
export async function buildShareURL(win: ShareWindow, csv: string): Promise<string> {
  const url = new URL(win.location.href);
  url.searchParams.delete('csv');
  url.hash = `csv=${await encodeCSVFragment(csv)}`;
  return url.toString();
}

export async function shareCSV(win: ShareWindow, csv: string): Promise<ShareOutcome> {
  const url = await buildShareURL(win, csv);

  try {
    // `navigator.clipboard` is typed as always being there, but it is missing
    // outside a secure context -- a report opened from a plain http:// host, or
    // through a permissions policy that withholds it.
    const { clipboard } = win.navigator;
    if (!clipboard) throw new Error('This browser did not offer a clipboard.');
    await clipboard.writeText(url);
    return 'copied';
  } catch {
    // Second best is the address bar: the same link, one ctrl-L from being
    // copied by hand. `replaceState` rather than assigning `location.hash`,
    // which would leave a history entry to back out of -- and, since the app
    // reads the fragment once at load, would not reload the page either way.
    win.history.replaceState(null, '', url);
    return 'address-bar';
  }
}
