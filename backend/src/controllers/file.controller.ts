import type { Request, Response } from 'express';
import { listFilesQuerySchema, uploadFileSchema } from '../schemas/file.schema';
import * as fileService from '../services/file.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';

export async function upload(req: Request, res: Response): Promise<void> {
  created(res, await fileService.uploadFile(uploadFileSchema.parse(req.body), actor(req)));
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await fileService.listFiles(listFilesQuerySchema.parse(req.query));
  res.json(result);
}

export async function meta(req: Request, res: Response): Promise<void> {
  ok(res, await fileService.getFileMeta(id(req)));
}

/**
 * Serve the bytes.
 *
 * Three headers, all of them load-bearing rather than decorative. `nosniff` stops a browser deciding
 * a text file is really HTML; the CSP drops the response to a sandbox with no scripts, so even a
 * document that *is* HTML cannot run; and `Content-Disposition: inline` keeps an image renderable in
 * an `<img>` while a PDF still opens in the viewer. The browser is told what the file is and given no
 * opportunity to reinterpret it.
 */
export async function download(req: Request, res: Response): Promise<void> {
  const { file, bytes } = await fileService.getFileForDownload(id(req));
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(bytes.length));
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.end(bytes);
}

export async function remove(req: Request, res: Response): Promise<void> {
  ok(res, await fileService.retireFile(id(req)));
}
