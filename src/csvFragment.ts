/**
 * Decoding for the `#csv=` fragment: base64url bytes, gzipped or not.
 *
 * A URL fragment is the only place a large CSV can ride in a link without a
 * server to store it. Browsers never put it in a request, so the data is not
 * in an access log, not in a `Referer`, and not sitting in a bucket that would
 * then need its own access control -- which is why this exists alongside
 * `?csv=` rather than as a bigger version of it. Everything past the `#` stays
 * on the machine that opens the link.
 *
 * The cost is that the payload is attacker-controlled input handed to a
 * decompressor, so `MAX_DECOMPRESSED_BYTES` is load-bearing rather than
 * defensive tidiness: gzip reaches about 1032:1, so a link small enough to
 * paste into a chat message expands to gigabytes and takes the tab with it.
 *
 * There is deliberately no encoder here. Anything that can run a script in this
 * repository can build a whole self-contained report instead, so the encoding
 * is documented as a `gzip | base64 | tr` pipeline in the README -- which also
 * works from a machine that has the CSV and nothing else.
 */

/**
 * Roughly the largest CSV this app can render before the table itself becomes
 * the problem, so an oversized link fails with a message instead of a frozen
 * tab.
 */
export const MAX_DECOMPRESSED_BYTES = 32 * 1024 * 1024;

const GZIP_MAGIC = [0x1f, 0x8b];

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
  const bytes = decodeBase64Url(encoded);
  // Uncompressed payloads need no cap: the URL that carried them is the cap.
  if (!isGzip(bytes)) return new TextDecoder().decode(bytes);
  return inflate(bytes, limit);
}
