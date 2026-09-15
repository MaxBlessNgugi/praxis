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
  /**
   * The church this token is acting for.
   *
   * A claim rather than a header, so a client cannot point itself at another parish by editing a
   * request: the token has to have been minted for a membership that exists. Absent means "whichever
   * church this account belongs to by default", which is what a token minted before this feature
   * existed already means.
   */
  org?: string;
  /**
   * A **support session**: a Praxis operator acting inside a church that is not their own.
   *
   * It is a separate claim rather than "an operator may name any church", because the two have very
   * different consequences. This one is minted by one endpoint, expires in an hour, and is written into
   * the target church's own audit log — so it is a period of access with a start and an end that the
   * church can read, not a standing permission.
   *
   * `sub` is still the operator's own account, which is the point: every row they touch names *them*,
   * and a support session cannot be handed to somebody else because it was never that person's token.
   */
  imp?: boolean;
}

/**
 * A 7-day HS256 token, matching the reference parish system.
 *
 * The honest limitation: a token issued for a week cannot be withdrawn before it expires. Adding
 * revocation means a denylist or a shorter lifetime with a refresh flow — a decision to make
 * deliberately, not by drift.
 *
 * A support-session token is the exception, and deliberately so: it is minted with an explicit
 * lifetime measured in minutes, because an operator looking at a parish's records has no business
 * holding an eight-hour key to it.
 */
export function signAccessToken(payload: TokenPayload, expiresIn?: string): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: (expiresIn ?? env.JWT_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
  });
}

/** How long a support session lasts. Short on purpose: it is a visit, not a key. */
export const SUPPORT_SESSION_MINUTES = 60;

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
  return {
    sub: decoded.sub,
    org: typeof decoded.org === 'string' ? decoded.org : undefined,
    imp: decoded.imp === true,
  };
}
