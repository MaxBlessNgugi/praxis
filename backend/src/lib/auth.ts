import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

/**
 * Every password in this service is hashed here, and nothing else imports bcrypt.
 *
 * One call site means one cost factor and one place to audit; scattered hashing is how a codebase
 * ends up with two of each.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** What the token carries. Rights are read from the database on every request, not trusted here. */
export interface TokenPayload {
  sub: string;
}

/**
 * A 7-day HS256 token, matching the reference parish system.
 *
 * The honest limitation: a token issued for a week cannot be withdrawn before it expires. Adding
 * revocation means a denylist or a shorter lifetime with a refresh flow — a decision to make
 * deliberately, not by drift.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * A token that cannot be verified is a `401`, never a `500`.
 *
 * `jwt.verify` throws its own error types, which would otherwise reach the error handler as an
 * unexpected failure: the client would be told the server broke instead of being told to sign in
 * again, and every endpoint would leak the library's message. Both cases below are ordinary — a
 * stale tab sends an expired token, a typo sends a malformed one — so both are answered plainly.
 */
export function verifyAccessToken(token: string): TokenPayload {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Your session has expired. Sign in again.', 'token_expired');
    }
    throw new AppError(401, 'That access token is not valid', 'invalid_token');
  }
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new AppError(401, 'That access token is not valid', 'invalid_token');
  }
  return { sub: decoded.sub };
}
