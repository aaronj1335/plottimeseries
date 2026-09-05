/**
 * Turning a request path into a file on disk, for the dev server. This is the
 * bit that decides whether `GET /../../..` hands out the contents of the
 * machine, so it lives apart from the server, where it can be tested.
 */
import * as path from 'node:path';

export function isInside(directory: string, filePath: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export type Resolution =
  { kind: 'file'; filePath: string } | { kind: 'forbidden' } | { kind: 'not-found' };

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.map': 'application/json',
};

export function contentType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath)] ?? 'text/plain';
}

/**
 * Where a request path lands on disk. `roots` are tried in order, and the first
 * that holds the file wins.
 *
 * The path is percent-decoded first, so `%2e%2e%2f` is seen for the `../` it is
 * rather than looked up as a directory literally named `%2e%2e`. That is what
 * makes the containment check load-bearing, so every candidate is checked
 * against the root it was built from before the disk is touched at all.
 */
export function resolveStaticFile(
  pathname: string,
  roots: readonly string[],
  exists: (filePath: string) => boolean,
): Resolution {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { kind: 'forbidden' }; // a malformed escape is not a path
  }

  // A NUL truncates the path inside some syscalls, so it never reaches one.
  if (decoded.includes('\0')) return { kind: 'forbidden' };

  const relative = decoded === '/' ? 'index.html' : decoded;
  let escaped = false;

  for (const root of roots) {
    const candidate = path.join(root, relative);
    if (!isInside(root, candidate)) {
      escaped = true;
      continue;
    }
    if (exists(candidate)) return { kind: 'file', filePath: candidate };
  }

  return escaped ? { kind: 'forbidden' } : { kind: 'not-found' };
}
