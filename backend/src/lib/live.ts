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
 * that goes with it. A read that is meant to span retired rows has to say so with `includingRetired`,
 * so the exceptions are named and countable rather than being the places somebody happened not to
 * filter. The Trash needs neither: it reads `SoftDeletedRecord`, which is the retired records' own
 * table rather than a table with retired rows in it.
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

/** The guard `findLive` puts on the read it is given, and the type of what comes back for it. */
type LiveWhere = { where: { id: string; deletedAt: null } };
type LiveRow<Delegate, Args> = NonNullable<Prisma.Result<Delegate, Args & LiveWhere, 'findFirst'>>;

/**
 * One live row by id, or the 404.
 *
 * `missing` is the 404 in the words of the screen that asked, so the message travels with the
 * caller and not with the helper. `args` is whatever else the read needs (`include`, `select`),
 * kept a parameter of its own because Prisma's result type — and so the row returned — is a
 * function of it.
 *
 * A lookup keyed on anything else — a `role.key`, a `serviceId`, a member *within* a household — is
 * asked for explicitly with `...live`, because those are not the one lookup that repeated.
 */
export async function findLive<Delegate, Args extends Omit<Prisma.Args<Delegate, 'findFirst'>, 'where'>>(
  delegate: Delegate,
  id: string,
  missing: string,
  args?: Args,
): Promise<LiveRow<Delegate, Args>> {
  const query = { ...args, where: { id, ...live } } as Args & LiveWhere;
  const row = (await (delegate as { findFirst(args: typeof query): Promise<unknown> }).findFirst(query)) as
    | LiveRow<Delegate, Args>
    | null;
  if (!row) throw new AppError(404, missing, 'not_found');
  return row;
}
