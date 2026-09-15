import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

/**
 * Where uploaded bytes live.
 *
 * Two drivers, one interface, and the interface is deliberately tiny: put bytes in, get bytes out,
 * remove bytes. Everything that knows what a file *is* — its purpose, who may read it, how it is
 * named — lives in the files module, so moving to a bucket later is a change here and nowhere else.
 *
 * The default driver keeps the bytes in Postgres. That is the right default for this deployment: the
 * console runs on ephemeral containers where a local uploads directory is wiped on every redeploy,
 * and a database the church already backs up is a store that already has a backup story. The `s3`
 * driver is the documented seam for when the volume of scanned minutes outgrows that.
 */

export interface StoredObject {
  /** The bytes, when the file is held in the database. */
  data: Buffer | null;
  /** The object key, when the file is held in object storage. */
  storageKey: string | null;
}

/** Whether the configured driver can actually run, checked at startup rather than on first upload. */
export function assertStorageConfigured(): void {
  if (env.STORAGE_DRIVER !== 's3') return;
  const missing = (['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const).filter(
    (key) => !env[key],
  );
  if (missing.length > 0) {
    throw new Error(
      `STORAGE_DRIVER is "s3" but ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set.`,
    );
  }
}

/**
 * Hand bytes to the active driver.
 *
 * The `s3` branch is not implemented in this build. It throws rather than silently writing to the
 * database, because a configuration that says "my files are in a bucket" and then quietly puts them
 * somewhere else is the kind of surprise an operator finds out about during a restore.
 */
export async function putObject(bytes: Buffer, fileName: string, mimeType: string): Promise<StoredObject> {
  if (env.STORAGE_DRIVER === 's3') {
    throw new AppError(
      501,
      'Object storage (STORAGE_DRIVER=s3) is not implemented in this build. Use STORAGE_DRIVER=database, or implement the s3 branch of lib/storage.ts.',
      'storage_driver_unavailable',
    );
  }

  // The database driver: the row owns the bytes, so there is no key to hand back.
  void fileName;
  void mimeType;
  return { data: bytes, storageKey: null };
}

/** A file's bytes, from whichever driver wrote them. */
export async function getObjectBytes(file: { data: Uint8Array | null; storageKey: string | null }): Promise<Buffer> {
  if (file.data) return Buffer.from(file.data);
  if (file.storageKey) {
    throw new AppError(
      501,
      'This file lives in object storage, which is not implemented in this build.',
      'storage_driver_unavailable',
    );
  }
  throw new AppError(410, 'The stored file has no contents', 'file_empty');
}

/** Describe the active driver, for the settings screen's honest "where is my data" line. */
export function storageDescription(): string {
  return env.STORAGE_DRIVER === 's3'
    ? `Object storage (${env.S3_BUCKET ?? 'bucket not set'})`
    : 'Praxis database (Postgres)';
}
