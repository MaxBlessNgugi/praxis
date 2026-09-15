import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** The length of the window, in milliseconds. */
  windowMs: number;
  /** How many requests are allowed inside one window. */
  max: number;
  /** The bucket namespace, so two limiters never share one counter. */
  name: string;
  /** Extra key material — the submitted email, say — to make the bucket narrower than the address. */
  keyOf?: (req: Request) => string;
}

const buckets = new Map<string, Bucket>();

/**
 * Evicts windows that have already elapsed.
 *
 * Without it the map is a memory leak with a pleasant name: every client address that ever called
 * would keep an entry for the life of the process. `unref` keeps the timer from holding the event
 * loop open, so a test process still exits on its own.
 */
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
if (typeof sweeper.unref === 'function') sweeper.unref();

/**
 * A fixed-window request limiter, held in memory.
 *
 * The in-memory choice is deliberate and it has one honest limitation: the counters belong to the
 * process, so two API instances allow twice the traffic and a restart forgets. That is the right trade
 * for a single parish container — a Redis dependency would be a second service to run and keep
 * available, in order to slow an attack that the per-account lockout in `auth.service` already caps.
 * The day Praxis runs more than one API instance, this moves behind a shared store and nothing else
 * has to change.
 *
 * Only `req.ip` is trusted, and only as far as `trust proxy` allows, which is why that setting is off
 * unless the deployment says otherwise.
 */
export function rateLimit({ windowMs, max, name, keyOf }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${name}:${req.ip ?? 'unknown'}:${keyOf ? keyOf(req) : ''}`;

    const existing = buckets.get(key);
    const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      // `Retry-After` is what a well-behaved client reads; the seconds are also in the body so a
      // console that only surfaces `error` can still tell the person something useful.
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({
        error: `Too many requests. Please try again in about ${resetSeconds} second${resetSeconds === 1 ? '' : 's'}.`,
        code: 'rate_limited',
      });
      return;
    }

    next();
  };
}
