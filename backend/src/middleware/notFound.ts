import type { Request, Response } from 'express';

/**
 * Answers anything no route claimed.
 *
 * It exists so an unmatched path returns JSON like every other response. Without it Express serves
 * its own HTML error page, and a client that speaks JSON gets a parse failure instead of a 404 —
 * which then reads as a server bug rather than a wrong URL.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` });
}
