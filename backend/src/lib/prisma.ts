import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';

/**
 * One client for the process.
 *
 * `tsx watch` reloads modules on every save, and each reload would otherwise open a new pool until
 * Postgres refuses connections — so the instance is cached on `globalThis` outside production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

/**
 * Money leaves this service as a plain number, and enters it as `Decimal`.
 *
 * Prisma returns `Decimal` objects, which `JSON.stringify` renders as `{"s":1,"e":2,"d":[...]}` —
 * a shape no client can use. Converting at the boundary keeps arithmetic exact inside the database
 * and keeps the HTTP contract ordinary. This is the only place money is allowed to lose its type.
 */
export function money(value: { toString(): string } | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value.toString());
}

/** Prisma known error codes this service translates, rather than leaking driver messages. */
export const PRISMA_ERRORS = {
  uniqueViolation: 'P2002',
  notFound: 'P2025',
  foreignKeyViolation: 'P2003',
} as const;
