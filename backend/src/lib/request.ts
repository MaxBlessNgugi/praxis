import type { Request } from 'express';
import { unauthorizedError } from '../middleware/errorHandler';

/**
 * The signed-in account's id.
 *
 * Thrown rather than defaulted: every write records who did it, so a route that reaches here without
 * a user is a missing guard, and this turns that into a 401 rather than an `undefined` in the audit
 * trail.
 */
export function actor(req: Request): string {
  if (!req.user) throw unauthorizedError();
  return req.user.id;
}

/** A path parameter, which Express types as possibly-an-array and possibly-undefined. */
export const id = (req: Request): string => req.params.id as string;
