/**
 * What a file's bytes actually are.
 *
 * The upload route is told what a file is — `mimeType` arrives in the request body, and a browser
 * fills it in from the file's *name*. That is a client's claim, not evidence, and the claim decides
 * whether the bytes are later served back with `image/png` or something a browser will interpret. A
 * script named `logo.png` declaring `image/png` would pass the allowlist and be served as an image.
 *
 * So the first bytes are read as well. Every format this console accepts begins with a signature that
 * a mislabelled file cannot fake by accident, and the two text formats are recognised by the absence
 * of NUL bytes rather than by a prefix, because they have none. The rule is not "the file must be what
 * it says" so much as "the file must not be *evidently* something else".
 *
 * Deliberately signature-based rather than a full parse: this is a guard against a mislabelled or
 * disguised upload, not a validator that runs a decoder over attacker-supplied input.
 */

/** The kinds of bytes this console stores. Text is one family, because CSV and plain text are
 *  indistinguishable at the byte level and pretending otherwise would refuse honest files. */
export type FileFamily = 'png' | 'jpeg' | 'gif' | 'webp' | 'pdf' | 'text' | 'zip';

/** Which MIME types a family may be declared as. */
export const FAMILY_MIME_TYPES: Readonly<Record<FileFamily, readonly string[]>> = {
  png: ['image/png'],
  jpeg: ['image/jpeg'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  text: ['text/plain', 'text/csv'],
  // An Office document is a ZIP; kept out of the list above because nothing accepts one yet.
  zip: ['application/zip'],
};

/** The family the bytes belong to, or null when nothing here recognises them. */
export function detectFileFamily(bytes: Buffer): FileFamily | null {
  const starts = (signature: string, offset = 0) =>
    bytes.length >= offset + signature.length && bytes.subarray(offset, offset + signature.length).toString('latin1') === signature;

  // PNG: a byte-order mark followed by "PNG", then CRLF and a substitution byte — exactly, so a
  // truncated file is not mistaken for a whole one.
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  // JPEG: the start-of-image marker.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  // GIF: either of the two versions in circulation.
  if (starts('GIF87a') || starts('GIF89a')) return 'gif';
  // WebP: a RIFF container whose form type is WEBP — the four bytes at 8 are what distinguish it from
  // a WAV or an AVI, which are also RIFF.
  if (starts('RIFF') && starts('WEBP', 8)) return 'webp';
  if (starts('%PDF-')) return 'pdf';
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2] ?? 0)) return 'zip';

  // Text: printable bytes with no NUL in the first block. A UTF-8 BOM — which Excel writes on every
  // CSV it exports — is allowed through, and would otherwise read as three unprintable bytes.
  const head = bytes.subarray(0, Math.min(bytes.length, 512));
  const body = head.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? head.subarray(3) : head;
  if (body.includes(0)) return null;
  return 'text';
}

/**
 * Whether the declared type is possible for these bytes.
 *
 * A type the console does not know at all is `false`, which is the right answer: the allowlist in
 * `file.schema.ts` already refuses it, and this refusal is the one that mentions the contents.
 */
export function declaredTypeMatches(declared: string, bytes: Buffer): boolean {
  const family = detectFileFamily(bytes);
  if (!family) return false;
  return FAMILY_MIME_TYPES[family].includes(declared);
}
