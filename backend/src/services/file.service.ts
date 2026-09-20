import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { live, findLive } from '../lib/live';
import { getObjectBytes, putObject } from '../lib/storage';
import { declaredTypeMatches } from '../lib/fileType';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { AppError } from '../middleware/errorHandler';
import { allowedTypesFor, type ListFilesQuery, type UploadFileInput } from '../schemas/file.schema';
import type { RetireReason } from '../schemas/common';

/**
 * Files: the church's logo, a member's photograph, a scanned minute.
 *
 * The service owns the two things a storage driver cannot: what a file is *for* (which decides what
 * kinds of bytes it may hold) and who may read it (which is the router's job, behind `requireAuth`).
 * The bytes themselves go through `lib/storage`, so moving them to a bucket later is a change there
 * and nowhere else.
 */

/** The metadata a client needs, and deliberately not the bytes — those have their own endpoint. */
const metaSelect = {
  id: true,
  purpose: true,
  fileName: true,
  mimeType: true,
  byteSize: true,
  uploadedById: true,
  createdAt: true,
} as const;

export type FileMeta = {
  id: string;
  purpose: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadedById: string | null;
  createdAt: Date;
};

/**
 * Turn a base64 body into bytes.
 *
 * `Buffer.from(value, 'base64')` is forgiving: it skips characters it does not recognise, so a
 * truncated or corrupted upload would decode to *something* and be stored as a valid-looking file.
 * Round-tripping the result back to base64 and comparing is what catches that, and it is cheap
 * relative to the size of the files this console accepts.
 */
function decodeBase64(content: string): Buffer {
  const payload = content.includes(',') && content.startsWith('data:') ? content.slice(content.indexOf(',') + 1) : content;
  const cleaned = payload.replace(/\s/g, '');
  const bytes = Buffer.from(cleaned, 'base64');

  if (bytes.length === 0) {
    throw new AppError(400, 'The uploaded file is empty', 'validation_error');
  }
  // Re-encode and compare, ignoring the padding the original may or may not have carried.
  if (bytes.toString('base64').replace(/=+$/, '') !== cleaned.replace(/=+$/, '')) {
    throw new AppError(400, 'The uploaded file is not valid base64', 'validation_error');
  }
  return bytes;
}

export async function uploadFile(input: UploadFileInput, actorId: string) {
  const bytes = decodeBase64(input.content);

  if (bytes.length > env.UPLOAD_MAX_BYTES) {
    const limitMb = Math.round((env.UPLOAD_MAX_BYTES / (1024 * 1024)) * 10) / 10;
    throw new AppError(413, `That file is larger than the ${limitMb} MB limit`, 'file_too_large');
  }

  const allowed = allowedTypesFor(input.purpose);
  if (!allowed.includes(input.mimeType as (typeof allowed)[number])) {
    throw new AppError(
      415,
      `A ${input.purpose.replace('_', ' ')} must be one of: ${allowed.join(', ')}`,
      'unsupported_media_type',
    );
  }

  // The declared type is the client's claim, and a file's name is where that claim comes from. The
  // bytes get a say: a script named `logo.png` declaring `image/png` is refused here rather than
  // stored and served back to every browser that loads the church's logo.
  if (!declaredTypeMatches(input.mimeType, bytes)) {
    throw new AppError(
      415,
      `Those bytes are not a ${input.mimeType}, whatever the file is called. Save it in an accepted format and try again.`,
      'content_type_mismatch',
    );
  }

  const stored = await putObject(bytes, input.fileName, input.mimeType);

  return prisma.storedFile.create({
    data: {
      purpose: input.purpose,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: bytes.length,
      data: stored.data,
      storageKey: stored.storageKey,
      uploadedById: actorId,
    },
    select: metaSelect,
  });
}

export async function getFileMeta(fileId: string): Promise<FileMeta> {
  return findLive(prisma.storedFile, fileId, 'That file does not exist', {
    select: metaSelect,
  }) as Promise<FileMeta>;
}

/** The file and its bytes, for the download route. */
export async function getFileForDownload(fileId: string) {
  const file = await findLive(prisma.storedFile, fileId, 'That file does not exist', {
    select: { ...metaSelect, data: true, storageKey: true },
  });
  const bytes = await getObjectBytes(file);
  return { file, bytes };
}

export async function listFiles(query: ListFilesQuery) {
  const where = { ...live, ...(query.purpose ? { purpose: query.purpose } : {}) };
  const [total, data] = await Promise.all([
    prisma.storedFile.count({ where }),
    prisma.storedFile.findMany({
      where,
      select: metaSelect,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data, meta: page(total, query) };
}

/**
 * Retire a file.
 *
 * Soft, like every other record here, and the row keeps its bytes: a profile that still points at a
 * retired file is a broken image rather than a lost one. The retirement goes through the same archive
 * as every other entity — a `SoftDeletedRecord` with the reason, the actor and a restore deadline, and
 * an audit line — so a deleted logo sits in the Trash beside a deleted member and comes back the same
 * way, rather than vanishing into a column flip nothing could undo.
 */
export function retireFile(fileId: string, input: RetireReason, actorId: string) {
  return retireRecord('StoredFile', fileId, {
    ...input,
    actorId,
    missing: 'That file does not exist',
    label: (row) => String(row.fileName),
  });
}
