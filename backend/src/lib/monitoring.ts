import { randomUUID } from 'node:crypto';
import { env, isProduction } from '../config/env';
import { log } from './log';

/**
 * Where a 500 goes when nobody is watching.
 *
 * The failure this exists for is the one a parish reports three days later — "the giving screen has
 * been broken since Tuesday" — and the person who could fix it had no way to hear about it. With a DSN
 * configured, an unexpected failure is sent to a Sentry-compatible collector with the request that
 * caused it; without one, nothing leaves the process and the error is logged as before.
 *
 * **No SDK.** `@sentry/node` is a large dependency that wraps the same HTTP call, and this service
 * needs one call. The store endpoint is part of Sentry's public ingestion API and is what the SDKs
 * post to, so a real Sentry project accepts these events — and so does anything else that speaks the
 * same protocol (GlitchTip, for instance).
 *
 * It is called from the error handler and nowhere else, and it never throws: a failure in the thing
 * that reports failures must not become a second failure. Reporting is best-effort by design — the
 * response to the user is already decided by the time this runs.
 */

interface SentryTarget {
  url: string;
  key: string;
}

/**
 * A DSN is `<protocol>://<public key>@<host>/<project id>`, and the store endpoint is derived from it
 * rather than configured separately. A value that is not a DSN is refused here rather than sent
 * somewhere surprising.
 */
function targetFromDsn(dsn: string | undefined): SentryTarget | null {
  if (!dsn) return null;
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, '');
    if (!parsed.username || !projectId) return null;
    return { url: `${parsed.protocol}//${parsed.host}/api/${projectId}/store/`, key: parsed.username };
  } catch {
    return null;
  }
}

/** A stack string, as the frames the event shape wants: oldest first, as Sentry reads them. */
function framesOf(error: unknown): { filename: string; function: string; lineno: number }[] {
  if (!(error instanceof Error) || !error.stack) return [];
  return error.stack
    .split('\n')
    .slice(1)
    .flatMap((line) => {
      const match = line.match(/at\s+(?:(\S+)\s+\()?(.+):(\d+):\d+\)?$/);
      if (!match) return [];
      return [{ function: match[1] ?? '<anonymous>', filename: match[2] ?? 'unknown', lineno: Number(match[3]) }];
    })
    .reverse();
}

/** Report one failure. Fire-and-forget: the caller does not await it and cannot be failed by it. */
export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  const target = targetFromDsn(env.SENTRY_DSN);
  if (!target) return;

  const event = {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: 'error',
    logger: 'praxis-api',
    environment: env.NODE_ENV,
    server_name: env.APP_NAME,
    message: { formatted: error instanceof Error ? error.message : String(error) },
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : 'Error',
          value: error instanceof Error ? error.message : String(error),
          stacktrace: { frames: framesOf(error) },
        },
      ],
    },
    // The church and the route, but not the body: a request body here can be a member's pastoral
    // notes, and an error tracker is a third party.
    extra: context,
    tags: isProduction ? { environment: 'production' } : { environment: env.NODE_ENV },
  };

  void fetch(target.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${target.key}, sentry_client=praxis-api/1.0`,
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(5_000),
  }).catch((failure: unknown) => {
    // Logged, not rethrown, and not reported: reporting a failure to report would be a loop.
    log('warn', 'error_report_failed', { reason: failure instanceof Error ? failure.message : String(failure) });
  });
}
