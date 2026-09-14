import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch a rejected promise returned by a handler.
 *
 * Without this, an `await` that throws inside a controller becomes an unhandled rejection and the
 * request hangs until the client gives up — the error is logged nowhere near the request that caused
 * it. Wrapping forwards every rejection to `next`, which is the one door `errorHandler` listens on.
 * (Express 5 does this itself; this project pins 4.)
 */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
