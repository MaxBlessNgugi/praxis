import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

/**
 * What counts as a live record, in one place.
 *
 * Retiring a record keeps its row — a giving ledger from three years ago still has to resolve the
 * member it was given by, and the Trash has to be able to hand it back — so every read that is not
 * the Trash has to say "not retired" for itself. That rule was written out at 150-odd call sites,
 * which is the wrong shape for it: nothing owned it, and the site that forgot showed a retired record
 * on a live screen without anything failing.
 *
 * Two things own it now. `live` is the filter every query is built from, and `findLive` is the lookup
 * that goes with it — one live row by id, or the 404 the screen that asked for it shows. A read that
 * is meant to span retired rows has to say so with `includingRetired`, so the exceptions are named
 * and countable rather than being the places somebody happened not to filter.
 */
export const live = { deletedAt: null } as const;

/**
 * The escape hatch, spread into the filter of a read that must see retired rows as well.
 *
 * Four reads earn it. Each identifies its row by a key that a retired record still holds — the
 * register number already issued to a member who has since been retired, a role or a ministry
 * membership being re-created under its unique key, and a project's target amount looked up by an id
 * the caller already has. Without it the key would be reissued or the insert would collide with a row
 * nobody can see.
 *
 * A no-op on purpose: it states the intent where the intent is, and changes no query.
 */
export const includingRetired = { deletedAt: undefined } as const;

/** The same rule for the two reports that group in SQL rather than through Prisma. */
export const liveSql = Prisma.sql`"deletedAt" IS NULL`;

/**
 * One live row by id, or the 404.
 *
 * `missing` is the sentence the screen that asked would put on the error — the same words its own
 * hand-written lookup used — so the message travels with the caller and not with the helper.
 *
 * `args` is the read itself, minus the guard: `{ where: { id } }` for the plain case, plus whatever
 * else the read needs (`include`, `select`). It is passed whole rather than assembled here because
 * Prisma's result type depends on it — an `include` typed through this helper is what keeps a caller
 * like the roster from reading `row.member` off a row that was never asked for one.
 */
export async function findLive<Delegate, Args extends Prisma.Args<Delegate, 'findFirst'> & { where: { id: string } }>(
  args: Args,
  delegate: Delegate,
  missing: string,
): Promise<NonNullable<Prisma.Result<Delegate, Args, 'findFirst'>>> {
  const query = { ...args, where: { ...args.where, ...live } } as Args;
  const row = await (delegate as { findFirst(args: Args): Promise<unknown> }).findFirst(query);
  if (!row) throw new AppError(404, missing, 'not_found');
  return row as NonNullable<Prisma.Result<Delegate, Args, 'findFirst'>>;
}
