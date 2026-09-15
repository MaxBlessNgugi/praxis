import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { log } from '../lib/log';
import { tenantId } from '../lib/tenant';

/**
 * One line per request, written when the response is finished.
 *
 * This is the only record of what the service *did* — the audit log records what changed, and logs
 * nothing about a request that failed, was refused, or took four seconds. Those are the requests
 * somebody ends up asking about.
 *
 * Two details are load-bearing rather than cosmetic. The line is written on `finish`, so it carries
 * the real status and duration instead of the ones known at the start. And every response is given a
 * `X-Request-Id`, echoed in the log line — so a screenshot of a failed screen, or a support email
 * quoting that header, resolves to the exact line in the log without guessing by timestamp.
 *
 * `/health` is exempt: it is polled every thirty seconds by whatever watches the deployment, and a
 * stream of "ok" would drown the lines worth reading.
 */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') {
    next();
    return;
  }

  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const milliseconds = Number(process.hrtime.bigint() - startedAt) / 1e6;
    log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
      requestId,
      method: req.method,
      // The path without its query string: a search term or a person's name does not belong in a log
      // line, and the query is not needed to find the request again.
      path: req.path,
      status: res.statusCode,
      ms: Math.round(milliseconds),
      // Both are absent on an unauthenticated request, which is the honest answer rather than a blank.
      ...(req.user ? { actorId: req.user.id } : {}),
      ...(tenantId() ? { organizationId: tenantId() } : {}),
    });
  });

  next();
}
