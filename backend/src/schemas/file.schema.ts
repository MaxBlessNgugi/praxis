import { z } from 'zod';

/**
 * Uploads.
 *
 * The bytes arrive base64-encoded inside a JSON body rather than as a `multipart/form-data` part.
 * That is a deliberate trade: multipart needs a streaming parser (and so a dependency) on the server,
 * and it buys nothing here, because the largest thing this console stores is a scanned minute. JSON
 * keeps one request pipeline, keeps validation in zod with everything else, and lets the same client
 * helper serve a logo, a photograph and a PDF.
 *
 * The cost is that base64 is about a third larger than the bytes it carries, which is why the size
 * limit is enforced on the *decoded* length and why the body limit on this router is set above it.
 */

export const filePurposeSchema = z.enum(['logo', 'member_photo', 'document', 'certificate_template', 'other']);
export type FilePurposeInput = z.infer<typeof filePurposeSchema>;

/**
 * What a purpose is allowed to hold.
 *
 * An allowlist rather than a blocklist, and it does not include `image/svg+xml`: an SVG is a document
 * that can carry script, and a logo is the one image every visitor's browser loads. Serving one from
 * the church's own origin would be a cross-site scripting hole dressed as artwork. Raster formats are
 * enough for a logo.
 */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const DOCUMENT_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  'application/pdf',
  'text/plain',
  'text/csv',
] as const;

export function allowedTypesFor(purpose: FilePurposeInput): readonly string[] {
  return purpose === 'document' || purpose === 'certificate_template' ? DOCUMENT_MIME_TYPES : IMAGE_MIME_TYPES;
}

/** A filename a browser will not misread as a path, and a MIME type from the allowlist. */
export const uploadFileSchema = z.object({
  purpose: filePurposeSchema.default('other'),
  fileName: z
    .string()
    .trim()
    .min(1, 'The file needs a name')
    .max(255)
    .refine((name) => !/[/\\\u0000]/.test(name), 'The file name may not contain a path'),
  mimeType: z.string().trim().min(3).max(160),
  /** Raw base64, or a `data:` URL whose prefix is stripped before decoding. */
  content: z.string().min(1, 'The file is empty'),
});

export const listFilesQuerySchema = z.object({
  purpose: filePurposeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
