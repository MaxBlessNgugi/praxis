import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';
import { currentSubscription, type SubscriptionView } from '../services/billing.service';

/**
 * Where a lapsed subscription is enforced.
 *
 * The rule is *writes stop, reads continue*, and both halves are deliberate.
 *
 * Reads continue because the alternative is losing access to the church's own records over a
 * bookkeeping slip — and because a church that cannot open its register cannot check whether it has
 * already paid. Reports, the Trash, the audit log and every export stay exactly where they were, and
 * so do the billing routes, so nothing a church entrusted to Praxis becomes unreachable.
 *
 * Writes stop because that is the part being sold. The refusal is a `402` with the reason in the body
 * and `subscription_expired` in `code`, so the console can say *why* rather than showing a generic
 * failure, and the person reading it knows the records are safe and what unlocks them.
 *
 * Two details are load-bearing. It reads the subscription **itself**, rather than expecting an earlier
 * middleware to have left it on the request: a gate that fails open because a router forgot its
 * companion middleware is not a gate, and this one cannot be misconfigured into being open. And it only
 * reads it for a **write**, so the ordinary case — a screen loading its data — costs no extra query.
 *
 * It must be mounted after `requireAuth`, because it reads through the tenant-scoped client and needs
 * the church the request resolved to. Mounted too early it fails loudly with `tenant_context_missing`
 * rather than quietly letting a lapsed church write, which is the right way round.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      subscription?: SubscriptionView | null;
    }
  }
}

export function requireWritableSubscription(req: Request, _res: Response, next: NextFunction): void {
  const reading = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (reading) {
    next();
    return;
  }

  currentSubscription().then(
    (subscription) => {
      req.subscription = subscription;
      if (!subscription || subscription.status !== 'expired') {
        next();
        return;
      }
      next(
        new AppError(
          402,
          "This church's subscription has lapsed, so records are read-only. Nothing has been deleted — every record is still here, and the office can read all of it. Recording new work needs a payment: arrange it with Praxis and the console opens again with everything as it was.",
          'subscription_expired',
        ),
      );
    },
    (error: unknown) => next(error),
  );
}
