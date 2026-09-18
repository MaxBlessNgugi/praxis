import { Router } from 'express';
import * as fileController from '../controllers/file.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';
import { rateLimit } from '../middleware/rateLimit';
import { env } from '../config/env';

/**
 * `/api/files` — the church's own artwork, photographs and scanned documents.
 *
 * Reading a file needs a signed-in account and nothing more: the console is behind the gate, and an
 * usher opening a member's photograph to confirm who is at the door should not need `admin`.
 * **Writing** needs `staff`, like every other record the office keeps.
 *
 * The parser that accepts an upload's larger body is mounted on this path in `app.ts`, ahead of the
 * 1 MB parser the rest of the API uses. It lives there because the body has to be read before any of
 * this — a limit declared here would be checked too late to matter.
 */
export const fileRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');

fileRouter.use(requireAuth, moduleGate(), requireWritableSubscription);

// Rate-limited like a broadcast send, and for the same reason: one request here can move five
// megabytes and put them in the church's database permanently. Fifty a minute is more scanning than
// an office does; it is not more than a loop does.
fileRouter.post(
  '/',
  WRITERS,
  rateLimit({
    name: 'upload',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.COSTLY_RATE_LIMIT_MAX * 5,
  }),
  asyncHandler(fileController.upload),
);
fileRouter.get('/', asyncHandler(fileController.list));

// `/meta` before `/:id`, the same ordering rule the rest of the API documents: otherwise "meta"
// parses as a file id.
fileRouter.get('/:id/meta', asyncHandler(fileController.meta));
fileRouter.get('/:id', asyncHandler(fileController.download));
fileRouter.delete('/:id', WRITERS, asyncHandler(fileController.remove));
