/**
 * The `#csv=` fragment: percent-encoded CSV, or base64url bytes that may be
 * gzipped, encoded and decoded.
 *
 * A URL fragment is the only place a large CSV can ride in a link without a
 * server to store it. Browsers never put it in a request, so the data is not
 * in an access log, not in a `Referer`, and not sitting in a bucket that would
 * then need its own access control -- which is why this exists alongside
 * `?csv=` rather than as a bigger version of it. Everything past the `#` stays
 * on the machine that opens the link.
 *
 * Which of the two encodings a link uses is read off the payload rather than
 * declared: base64url spells everything in `A-Z a-z 0-9 - _ =`, and a CSV needs
 * a comma to separate its date column from a value column, so a payload holding
 * anything outside that alphabet is CSV text and never a mangled base64url
 * string. Percent-encoding costs about three bytes per delimiter, so it suits
 * the small hand-written link that `?csv=` already takes; the gzipped form is
 * what makes a whole dataset fit.
 *
 * The cost is that the payload is attacker-controlled input handed to a
 * decompressor, so `MAX_DECOMPRESSED_BYTES` is load-bearing rather than
 * defensive tidiness: gzip reaches about 1032:1, so a link small enough to
 * paste into a chat message expands to gigabytes and takes the tab with it.
 *
 * The encoder is the share button's half of that: it is the same `gzip |
 * base64 | tr` pipeline the README documents for a shell, run in the tab that
 * already holds the data, so sharing what is on screen does not mean going
 * back to the file it came from.
 */

/**
 * Roughly the largest CSV this app can render before the table itself becomes
 * the problem, so an oversized link fails with a message instead of a frozen
 * tab.
 */
export const MAX_DECOMPRESSED_BYTES = 32 * 1024 * 1024;

const GZIP_MAGIC = [0x1f, 0x8b];

/** The base64url alphabet, plus the `=` padding that is optional in a link. */
const BASE64URL = /^[A-Za-z0-9\-_]*={0,2}$/;

/**
 * One run of adjacent escapes, decoded together because a single character can
 * span several of them: `%E2%82%AC` is one euro sign, not three.
 */
const PERCENT_ESCAPES = /(?:%[0-9A-Fa-f]{2})+/g;

function percentDecode(encoded: string): string {
  // Escape by escape rather than `decodeURIComponent` over the whole string,
  // which is all-or-nothing: a cell holding a bare `%` -- `50% of target` --
  // would throw and leave every `%0A` in the link literal, so one unescaped
  // character in one cell would cost the newlines in every row. Base64url has
  // no `%` at all, so nothing well-formed reaches this either way.
  return encoded.replace(PERCENT_ESCAPES, run => {
    try {
      return decodeURIComponent(run);
    } catch {
      // Well-formed escapes that spell no character, such as a truncated UTF-8
      // sequence. They are what the link said, so that is what is plotted.
      return run;
    }
  });
}

function decodeBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  // `atob` wants standard base64. Padding is optional: base64url of any byte
  // string has a length of 0, 2 or 3 mod 4, and only 1 mod 4 is rejected.
  const base64 = encoded.split('-').join('+').split('_').join('/');

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('The csv fragment is not valid base64url.');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isGzip(bytes: Uint8Array): boolean {
  return GZIP_MAGIC.every((byte, i) => bytes[i] === byte);
}

async function inflate(bytes: Uint8Array<ArrayBuffer>, limit: number): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed links: it has no DecompressionStream.');
  }

  // `BufferSource` rather than `Uint8Array`, because that is what
  // `DecompressionStream` declares its writable side to accept.
  const compressed = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  // `DecompressionStream` is typed as a `GenericTransformStream`, whose
  // readable side is `any`. Naming the chunk type here keeps that `any` from
  // spreading through the read loop below.
  const reader = compressed.pipeThrough<Uint8Array>(new DecompressionStream('gzip')).getReader();

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(
        `The link's CSV expands past the ${limit} byte limit, so it was not decoded.`,
      );
    }

    // Streaming, because a multi-byte character can straddle two chunks.
    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return chunks.join('');
}

export async function decodeCSVFragment(
  encoded: string,
  limit: number = MAX_DECOMPRESSED_BYTES,
): Promise<string> {
  // Percent-decoding first, so that a base64url payload whose `=` padding was
  // escaped to `%3D` -- what `encodeURIComponent` does to it -- is still read
  // as base64url rather than as CSV that happens to have no commas in it.
  const text = percentDecode(encoded);

  // CSV text carries at least the comma between its date column and a value
  // column, so it cannot be mistaken for base64url.
  if (!BASE64URL.test(text)) return text;

  const bytes = decodeBase64Url(text);
  // Uncompressed payloads need no cap: the URL that carried them is the cap.
  if (!isGzip(bytes)) return new TextDecoder().decode(bytes);
  return inflate(bytes, limit);
}

// `String.fromCharCode(...bytes)` is one call with one argument per byte, so a
// whole megabyte-sized CSV passed at once overflows the argument stack. 32 KiB
// at a time is well under every engine's limit.
const BTOA_CHUNK_BYTES = 32 * 1024;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BTOA_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BTOA_CHUNK_BYTES));
  }

  // Padding is dropped rather than percent-encoded: `=` is legal in a fragment,
  // but `decodeBase64Url` does not need it, and the link is shorter without it.
  return btoa(binary).split('+').join('-').split('/').join('_').split('=').join('');
}

async function deflate(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('This browser cannot build compressed links: it has no CompressionStream.');
  }

  // Same shape as `inflate` above: `BufferSource` on the writable side, and the
  // chunk type named on `pipeThrough` so the `any` readable side stops there.
  const plain = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

  const reader = plain.pipeThrough<Uint8Array>(new CompressionStream('gzip')).getReader();

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * The inverse of `decodeCSVFragment`, always compressing: a CSV is repetitive
 * enough that gzip is the difference between a link that pastes into a chat
 * message and one that does not.
 */
export async function encodeCSVFragment(csv: string): Promise<string> {
  return encodeBase64Url(await deflate(csv));
}
