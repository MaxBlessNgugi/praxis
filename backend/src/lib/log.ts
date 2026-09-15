import { isProduction } from '../config/env';

/**
 * One line of JSON per event.
 *
 * The alternative — `console.log('user ' + id + ' did ' + thing)` — is unreadable to the log platform
 * a deployment ships to and unsearchable to the person reading it at 11pm, because the half of the
 * message that matters is inside a sentence. A line with named fields can be filtered by field:
 * `event=request status=500`, `event=request organizationId=…`. Every one of these is a single line,
 * so a log stream stays greppable and a container's stdout stays parseable.
 *
 * Nothing here is a logging framework, and deliberately: the volume a parish console produces is a
 * few hundred lines a day, and what those lines need is a shape, not a transport.
 */
export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ at: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

/**
 * A serialisable shape of a thrown thing.
 *
 * An `Error` stringifies to `{}`, which is exactly the bug this avoids: a log line saying `{}` where
 * the failure should be.
 */
export function describeError(error: unknown): { type: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      // Stacks belong in development and in an error tracker, not in a production log stream that a
      // support engineer reads over someone's shoulder.
      ...(isProduction ? {} : { stack: error.stack }),
    };
  }
  return { type: typeof error, message: String(error) };
}
