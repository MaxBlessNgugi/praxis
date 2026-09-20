import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { isProduction } from '../config/env';
import { PRISMA_ERRORS } from '../lib/prisma';
import { log, describeError } from '../lib/log';
import { reportError } from '../lib/monitoring';
import { tenantId } from '../lib/tenant';

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

/** What body-parser refuses, and the sentence to give back for it. */
function bodyParserFailure(error: unknown): { status: number; message: string; code: string } | null {
  const { type } = (error ?? {}) as { type?: unknown };
  if (type === 'entity.too.large') {
    return { status: 413, message: 'That request was too large for this endpoint', code: 'payload_too_large' };
  }
  if (type === 'entity.parse.failed') {
    return { status: 400, message: 'That request body is not valid JSON', code: 'invalid_json' };
  }
  return null;
}

/**
 * The last handler in the chain, so every failure leaves through one door.
 *
 * Three things are being decided here. A validation failure is the client's fault and gets 400 with
 * the offending fields. A unique-constraint violation is a conflict, not a crash — two people
 * registering the same envelope number is an ordinary event at a parish desk. And anything else is
 * logged in full but reported as a bare 500 in production, because a stack trace in a response body
 * is an information leak, not a courtesy.
 *
 * A failure that is the server's fault — a 500, whether it arrived as an unknown throw or as an
 * `AppError` nobody expected — is also *reported*: logged as one structured line, and sent to the
 * error tracker when one is configured. A 4xx is not: those are the client being told no, and
 * streaming them into an error tracker is how a tracker becomes noise nobody reads.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  // A body the parser itself refused. body-parser marks these with `type` and a 4xx `status`, and
  // without this they leave as 500s — which is both the wrong answer to the caller and a client's
  // mistake reported to whoever watches the error tracker.
  const bodyFailure = bodyParserFailure(error);
  if (bodyFailure) {
    res.status(bodyFailure.status).json({ error: bodyFailure.message, code: bodyFailure.code, requestId: reqId(res) });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'The request failed validation',
      fields: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      requestId: reqId(res),
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
    if (error.statusCode >= 500) {
      log('error', 'request_failed', {
        requestId: res.getHeader('X-Request-Id') ?? null,
        code: error.code ?? null,
        path: req.path,
        ...describeError(error),
      });
      reportError(error, contextOf(req));
    }
    res.status(error.statusCode).json({ error: error.message, code: error.code, requestId: reqId(res) });
    return;
  }

  log('error', 'unhandled_error', {
    requestId: res.getHeader('X-Request-Id') ?? null,
    path: req.path,
    method: req.method,
    ...describeError(error),
  });
  reportError(error, contextOf(req));
  res.status(500).json({ error: isProduction ? 'Something went wrong' : String((error as Error)?.message ?? error), requestId: reqId(res) });
}

/** The same id the logs carry, so a caller can quote it and the office can find the request. */
const reqId = (res: Response): string | null => (res.getHeader('X-Request-Id') as string | undefined) ?? null;

/** Enough to find the request again, and nothing that could carry a member's data to a third party. */
function contextOf(req: Request): Record<string, unknown> {
  return {
    method: req.method,
    path: req.path,
    requestId: req.res?.getHeader('X-Request-Id') ?? null,
    ...(req.user ? { actorId: req.user.id } : {}),
    ...(tenantId() ? { organizationId: tenantId() } : {}),
  };
}
