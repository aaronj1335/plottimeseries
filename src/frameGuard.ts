/**
 * Clickjacking defense for a page that has no way to send response headers.
 *
 * `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` are both headers.
 * GitHub Pages serves a fixed set we cannot add to, `frame-ancestors` is
 * ignored in the `<meta>` CSP, and a report opened off disk has no headers at
 * all -- so refusing to render is the only defense that travels with the file.
 * See scripts/securityHeaders.ts for the header-based version.
 */
export interface FrameContext {
  readonly top: unknown;
  readonly self: unknown;
}

export function isFramed(win: FrameContext): boolean {
  try {
    return win.top !== win.self;
  } catch {
    // Reading `top` across origins can throw. If we can't tell, assume framed.
    return true;
  }
}

export const FRAMED_MESSAGE = 'This page cannot be displayed inside a frame.';
