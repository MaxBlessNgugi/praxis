import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../src/config/env';
import { AppError, errorHandler } from '../src/middleware/errorHandler';

/**
 * What a failure looks like on the wire, in both environments.
 *
 * Two claims are checked here, and neither is visible from a passing test suite. The first is that
 * every failure leaves through the one handler with a shape a console can read: a sentence, a machine
 * `code`, and the offending fields for a validation refusal. The second is the difference between the
 * environments — a development server says what broke, and a production server says nothing that
 * would name a file, a host or a line of code. That difference is one ternary in `errorHandler`, and
 * a ternary is exactly what a later refactor deletes.
 *
 * The environment is fixed when `config/env` is imported, so one process cannot play both parts: this
 * runs itself again as each environment and compares the two.
 *
 *   npx tsx tools/error-envelope.ts
 */

const CHILD = process.env.PRAXIS_ENVELOPE_CHILD === '1';

interface Captured {
  status: number;
  body: Record<string, unknown> | null;
}

/** The smallest thing `errorHandler` accepts as a response: a status, a body, and headers. */
function fakeResponse(captured: Captured): Response {
  const headers = new Map<string, unknown>([['X-Request-Id', 'envelope-check']]);
  const res: Record<string, unknown> = {
    headersSent: false,
    getHeader: (name: string) => headers.get(name) ?? null,
    status: (code: number) => {
      captured.status = code;
      return res;
    },
    json: (payload: unknown) => {
      captured.body = payload as Record<string, unknown>;
      return res;
    },
  };
  return res as unknown as Response;
}

/** Each failure the handler knows by name, as it would arrive at the end of the chain. */
function cases(): Record<string, unknown> {
  const blankPhone = z.object({ phone: z.string().min(1, 'Enter a phone number') }).safeParse({ phone: '' });
  return {
    // The shape of a real one: a host, a file and a line, none of which a client should receive.
    unhandled: new Error('connect ECONNREFUSED 10.0.0.5:5432 at /srv/praxis/src/lib/prisma.ts:41'),
    chosen5xx: new AppError(503, 'The mail provider refused the message', 'provider_error'),
    conflict: new AppError(409, 'That envelope number is already in use', 'conflict'),
    validation: blankPhone.success ? new Error('the fixture did not fail') : blankPhone.error,
    duplicate: new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['phone'] },
    }),
    malformedBody: Object.assign(new Error('Unexpected end of JSON input'), { type: 'entity.parse.failed' }),
    oversizedBody: Object.assign(new Error('request entity too large'), { type: 'entity.too.large' }),
  };
}

/** Runs every named failure through the handler and reports what came out. */
function capture(): Record<string, Captured> {
  const results: Record<string, Captured> = {};
  for (const [name, error] of Object.entries(cases())) {
    const captured: Captured = { status: 0, body: null };
    const res = fakeResponse(captured);
    const req = { method: 'POST', path: '/api/members', res } as unknown as Request;
    errorHandler(error, req, res, (() => undefined) as NextFunction);
    results[name] = captured;
  }
  return results;
}

interface ChildAnswer {
  mode: string;
  results: Record<string, Captured>;
}

/** This file runs itself again as the given environment and reads the marked line back. */
function runAs(mode: 'development' | 'production'): ChildAnswer {
  const answer = spawnSync(process.execPath, ['--import', 'tsx', 'tools/error-envelope.ts'], {
    cwd: resolve(__dirname, '..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      PRAXIS_ENVELOPE_CHILD: '1',
      NODE_ENV: mode,
      // What production validation insists on, so the child can boot at all.
      JWT_SECRET: 'error-envelope-check-secret-that-is-long-enough',
      EMAIL_DRIVER: 'resend',
    },
  });
  // Marked, because the handler also logs a structured line per server-side failure and this has to
  // be greppable out of the same stream.
  const line = answer.stdout?.split('\n').find((row) => row.startsWith('RESULT '));
  if (!line) {
    throw new Error(`the ${mode} run printed no result:\n${answer.stdout}\n${answer.stderr}`);
  }
  return JSON.parse(line.slice('RESULT '.length)) as ChildAnswer;
}

let checks = 0;
let failed = 0;

function check(what: string, passed: boolean, detail = ''): void {
  checks += 1;
  if (passed) {
    console.log(`  ok   ${what}`);
    return;
  }
  failed += 1;
  console.log(`  FAIL ${what}${detail ? ` — ${detail}` : ''}`);
}

/** Anything in a response body that would name the inside of the service. */
const LEAKS = ['/srv/', 'ECONNREFUSED', 'at Object', 'node_modules', 'prisma.ts', 'stack', 'details'];

function leaked(body: Record<string, unknown> | null): string[] {
  const text = JSON.stringify(body ?? {});
  return LEAKS.filter((needle) => text.includes(needle));
}

function main(): void {
  console.log(`Error envelope → both environments (this process is ${env.NODE_ENV})`);
  const development = runAs('development');
  const production = runAs('production');

  console.log('\n1. Every failure keeps the console-readable shape');
  const expected: Record<string, number> = {
    unhandled: 500,
    chosen5xx: 503,
    conflict: 409,
    validation: 400,
    duplicate: 409,
    malformedBody: 400,
    oversizedBody: 413,
  };
  for (const [name, status] of Object.entries(expected)) {
    for (const answer of [development, production]) {
      const result = answer.results[name];
      check(
        `${answer.mode}: ${name} is a ${status} with a sentence`,
        result?.status === status && typeof result.body?.error === 'string',
        `${result?.status} ${JSON.stringify(result?.body)}`,
      );
    }
  }
  check(
    'a validation refusal names the field to fix',
    JSON.stringify(development.results.validation?.body?.fields ?? null)?.includes('phone') === true,
    JSON.stringify(development.results.validation?.body),
  );
  check(
    'a duplicate says which field is already taken',
    String(development.results.duplicate?.body?.error ?? '').includes('phone'),
    JSON.stringify(development.results.duplicate?.body),
  );
  check(
    'a body the parser itself refused is named as such',
    development.results.malformedBody?.body?.code === 'invalid_json' &&
      development.results.oversizedBody?.body?.code === 'payload_too_large',
    `${JSON.stringify(development.results.malformedBody?.body)} ${JSON.stringify(development.results.oversizedBody?.body)}`,
  );

  console.log('\n2. Development says what broke, production says nothing');
  check(
    'development surfaces the reason',
    String(development.results.unhandled?.body?.error ?? '').includes('ECONNREFUSED'),
    JSON.stringify(development.results.unhandled?.body),
  );
  check(
    'production answers with one bare sentence',
    production.results.unhandled?.body?.error === 'Something went wrong',
    JSON.stringify(production.results.unhandled?.body),
  );
  const everywhere = Object.entries(production.results).flatMap(([name, result]) =>
    leaked(result.body).map((needle) => `${name}: ${needle}`),
  );
  check('and no production response names a file, a host or a stack', everywhere.length === 0, everywhere.join('; '));
  check(
    'a failure the service chose still reaches the client in production',
    production.results.chosen5xx?.body?.error === 'The mail provider refused the message' &&
      production.results.chosen5xx?.body?.code === 'provider_error',
    JSON.stringify(production.results.chosen5xx?.body),
  );

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${checks - failed}/${checks} error-envelope checks passed`);
  if (failed > 0) process.exitCode = 1;
}

if (CHILD) {
  console.log(`RESULT ${JSON.stringify({ mode: env.NODE_ENV, results: capture() })}`);
} else {
  main();
}
