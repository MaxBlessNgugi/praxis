import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '../middleware/errorHandler';

/**
 * Which church the current request is acting for.
 *
 * One value, carried implicitly rather than passed as an argument. The alternative — threading an
 * `organizationId` through every service, controller and helper that touches the database — is 190
 * arguments, each one a place to forget. This is the same argument the retirement rule makes in
 * `live.ts`: a rule that has to be repeated at every call site is a rule with no owner.
 *
 * The context is established once, in `authenticate`, and read by the tenant-scoped Prisma client in
 * `prisma.ts`. Nothing else should call `runWithTenant` except the few paths that run outside a
 * request — signing in, and the seed.
 */
export interface TenantContext {
  organizationId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** The current church, or null when the caller is not inside one — a script, a health check. */
export function currentTenant(): TenantContext | null {
  return storage.getStore() ?? null;
}

/** The current church's id, or null. */
export function tenantId(): string | null {
  return storage.getStore()?.organizationId ?? null;
}

/**
 * The current church's id, or a refusal.
 *
 * For the handful of reads the client extension cannot scope on its own — a raw report query, or a
 * global table joined to a church through a membership. Those sites have to say which church they
 * mean, and this is how they say it.
 */
export function requireTenantId(): string {
  const id = tenantId();
  if (!id) throw new AppError(500, 'This operation ran without an organisation context', 'tenant_context_missing');
  return id;
}

/**
 * Run `fn` — and everything it awaits — as one church.
 *
 * `AsyncLocalStorage.run` propagates through the async continuations created inside it, which is why
 * wrapping `next()` in the auth middleware is enough for an entire request: every query the handler
 * later makes sees the same church.
 */
export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return storage.run(context, fn);
}

/**
 * Set the church for the rest of this execution, and everything it started.
 *
 * For a process that serves exactly one church for its whole life — the seed. It is **not** for a
 * request path: the store set here outlives the call, so in a server the next request would inherit
 * the previous one's church, which is the leak this whole module exists to prevent.
 */
export function enterTenant(context: TenantContext): void {
  storage.enterWith(context);
}
