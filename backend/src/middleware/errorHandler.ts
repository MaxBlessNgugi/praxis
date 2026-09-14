import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { isProduction } from '../config/env';
import { PRISMA_ERRORS } from '../lib/prisma';

/** A failure the service chose, with a status the client can act on. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundError = (what: string) => new AppError(404, `${what} was not found`, 'not_found');
export const conflictError = (message: string) => new AppError(409, message, 'conflict');
export const unauthorizedError = (message = 'Authentication required') => new AppError(401, message, 'unauthorized');
export const forbiddenError = (message = 'Not permitted') => new AppError(403, message, 'forbidden');

/**
 * The last handler in the chain, so every failure leaves through one door.
 *
 * Three things are being decided here. A validation failure is the client's fault and gets 400 with
 * the offending fields. A unique-constraint violation is a conflict, not a crash — two people
 * registering the same envelope number is an ordinary event at a parish desk. And anything else is
 * logged in full but reported as a bare 500 in production, because a stack trace in a response body
 * is an information leak, not a courtesy.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'The request failed validation',
      fields: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === PRISMA_ERRORS.uniqueViolation) {
      const target = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(', ') : 'a unique field';
      res.status(409).json({ error: `A record with the same ${target} already exists` });
      return;
    }
    if (error.code === PRISMA_ERRORS.notFound) {
      res.status(404).json({ error: 'The requested record was not found' });
      return;
    }
    if (error.code === PRISMA_ERRORS.foreignKeyViolation) {
      res.status(409).json({ error: 'That record refers to something that does not exist' });
      return;
    }
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }

  console.error('[unhandled]', error);
  res.status(500).json({ error: isProduction ? 'Something went wrong' : String((error as Error)?.message ?? error) });
}
