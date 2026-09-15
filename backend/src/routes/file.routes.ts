import express, { Router } from 'express';
import * as fileController from '../controllers/file.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { env } from '../config/env';

/**
 * `/api/files` — the church's own artwork, photographs and scanned documents.
 *
 * Reading a file needs a signed-in account and nothing more: the console is behind the gate, and an
 * usher opening a member's photograph to confirm who is at the door should not need `admin`.
 * **Writing** needs `staff`, like every other record the office keeps.
 *
 * The body limit is set here rather than on the whole app. A JSON payload carrying base64 is about a
 * third larger than the file it encodes, so the ceiling on this router is the file limit plus that
 * overhead — leaving `express.json`'s 1 MB default in place everywhere else, where it is a useful
 * guard against an oversized request rather than an obstacle to a legitimate one.
 */
export const fileRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');

/** base64 grows a payload by 4/3; the slack covers the rest of the envelope. */
const uploadLimit = Math.ceil(env.UPLOAD_MAX_BYTES * 1.4) + 64 * 1024;

fileRouter.use(requireAuth);

fileRouter.post('/', WRITERS, express.json({ limit: uploadLimit }), asyncHandler(fileController.upload));
fileRouter.get('/', asyncHandler(fileController.list));

// `/meta` before `/:id`, the same ordering rule the rest of the API documents: otherwise "meta"
// parses as a file id.
fileRouter.get('/:id/meta', asyncHandler(fileController.meta));
fileRouter.get('/:id', asyncHandler(fileController.download));
fileRouter.delete('/:id', WRITERS, asyncHandler(fileController.remove));
