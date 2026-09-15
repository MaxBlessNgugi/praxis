import { Prisma, PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { tenantId } from './tenant';

/**
 * The process-wide client, unscoped.
 *
 * Nothing in a request should reach for this: it reads across every church. Two things legitimately
 * do, and both are named below — signing in, where the church is not known yet, and the scripts in
 * `tools/`, which are run deliberately by an operator.
 */
const globalForPrisma = globalThis as unknown as { praxisBasePrisma?: PrismaClient };

export const basePrisma =
  globalForPrisma.praxisBasePrisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProduction) globalForPrisma.praxisBasePrisma = basePrisma;

/**
 * The models that belong to a church, and the relations that can reach them.
 *
 * Read from Prisma's own metadata rather than written out by hand: a list in a source file is a list
 * that drifts the first time somebody adds a table. A model is tenant-owned exactly when it carries
 * an `organizationId`, which is now the schema's own statement of the rule.
 */
const TENANT_MODELS: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === 'organizationId'))
    .map((model) => model.name),
);

/** model → (relation field → the model it points at), derived from the schema. */
const CHILD_RELATIONS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    new Map(
      model.fields
        .filter((field) => field.kind === 'object' && field.type !== model.name)
        .map((field) => [field.name, field.type]),
    ),
  ]),
);

/** Operations whose arguments carry a `where` the church has to be folded into. */
const SCOPED_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

/**
 * Attach the church to a create payload, including the rows created in the same statement.
 *
 * `prisma.household.create({ data: { members: { create: [...] } } })` is one call that writes two
 * tables, and an argument-level hook only sees the outer one. Walking the payload is what stops a
 * nested row arriving with no church on it — which the database would then refuse, loudly, at
 * whichever call site happened to be first.
 */
function stamp(organizationId: string | undefined, model: string, payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map((row) => stamp(organizationId, model, row));
  if (!payload || typeof payload !== 'object') return payload;

  const row = { ...(payload as Record<string, unknown>) };
  if (TENANT_MODELS.has(model)) row.organizationId = requireTenantFor(organizationId, `${model} create`);

  for (const [field, target] of CHILD_RELATIONS.get(model) ?? []) {
    const value = row[field];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const relation: Record<string, unknown> = { ...(value as Record<string, unknown>) };

    if (relation.create !== undefined) relation.create = stamp(organizationId, target, relation.create);
    if (relation.createMany !== undefined && typeof relation.createMany === 'object') {
      const many = relation.createMany as { data?: unknown };
      relation.createMany = { ...many, data: stamp(organizationId, target, many.data) };
    }
    if (relation.connectOrCreate !== undefined && typeof relation.connectOrCreate === 'object') {
      const connectOrCreate = relation.connectOrCreate as { create?: unknown };
      relation.connectOrCreate = { ...connectOrCreate, create: stamp(organizationId, target, connectOrCreate.create) };
    }
    if (relation.upsert !== undefined && typeof relation.upsert === 'object') {
      const upsert = relation.upsert as { create?: unknown };
      relation.upsert = { ...upsert, create: stamp(organizationId, target, upsert.create) };
    }
    row[field] = relation;
  }

  return row;
}

/**
 * The church this call must run as, or a refusal.
 *
 * A query that reaches a church's rows without a church context is not a query to guess at — it is
 * one that would either read across parishes or write a row nobody owns, so it fails here instead.
 */
function requireTenantFor(organizationId: string | undefined, what: string): string {
  if (!organizationId) {
    throw new AppError(500, `${what} ran without an organisation context`, 'tenant_context_missing');
  }
  return organizationId;
}

/** Fold one church into one call's arguments. */
function scopeArguments(
  organizationId: string | undefined,
  model: string,
  operation: string,
  args: unknown,
  tenantOwned: boolean,
): unknown {
  const next: Record<string, unknown> = { ...(args as Record<string, unknown>) };
  if (tenantOwned && SCOPED_OPERATIONS.has(operation)) {
    next.where = {
      ...((next.where as Record<string, unknown>) ?? {}),
      organizationId: requireTenantFor(organizationId, `${model}.${operation}`),
    };
  }
  if (operation === 'create') next.data = stamp(organizationId, model, next.data);
  if (operation === 'createMany') next.data = stamp(organizationId, model, next.data);
  if (operation === 'upsert') next.create = stamp(organizationId, model, next.create);
  return next;
}

/** The operations that write rows, and so must not run without a church to write them into. */
const WRITE_OPERATIONS = new Set(['create', 'createMany', 'createManyAndReturn', 'upsert']);

/**
 * Attach one church to every model operation.
 *
 * The church is captured in a closure rather than read from the request's context *inside* the hook.
 * That is not a style choice: Prisma runs these hooks in its own request pipeline, outside the async
 * context of the caller, so a per-request store is not reliably visible there. Read at the moment a
 * query is built — which the proxy below does, in the caller's context — it always is.
 */
function tenantExtension(organizationId: string) {
  return {
    name: 'tenant',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          const tenantOwned = TENANT_MODELS.has(model);
          // A write is inspected even on a global model, because a church's row can be created
          // *through* one: `user.create({ data: { memberships: { create: … } } })` writes an
          // OrganizationMember without ever naming that model. Reading a global model, or writing one
          // on its own, has no church rows in it and is left alone — which is what keeps signing in
          // (a `User` write, before any church is known) working.
          if (!tenantOwned && !WRITE_OPERATIONS.has(operation)) return query(args);
          return query(scopeArguments(organizationId, model, operation, args, tenantOwned));
        },
      },
    },
  };
}

type ScopedClient = ReturnType<typeof buildClient>;

const scopedClients = new Map<string, ScopedClient>();

function buildClient(organizationId: string) {
  return basePrisma.$extends(tenantExtension(organizationId));
}

/**
 * The client for one church, built once and kept.
 *
 * For the few places that act for a church they can name themselves rather than inherit one —
 * signing in, and the seed. Everything else should use `prisma` and let the request decide.
 */
export function clientFor(organizationId: string): ScopedClient {
  let client = scopedClients.get(organizationId);
  if (!client) {
    client = buildClient(organizationId);
    scopedClients.set(organizationId, client);
  }
  return client;
}

/**
 * The client every service uses: `prisma.member.findMany()` reads this church's members, and
 * `prisma.member.create()` writes to this church, without either call site saying so.
 *
 * Enforcement lives in one place on purpose. The cross-tenant leak this prevents is not a bug you
 * notice in testing — it is one bright morning when a parish office sees another parish's giving
 * records — so it must not depend on 190 hand-written filters being right. A query that reaches a
 * church's rows with no church in context is refused rather than run unscoped.
 *
 * `$`-methods (`$queryRaw`, `$transaction`, the health check) pass through unscoped when there is no
 * context, because raw SQL and a connection probe have no model to attach a church to; raw SQL that
 * touches a church's table is expected to filter itself, and the one place that does says so.
 */
/** The delegate name Prisma gives a model: `Member` is reached as `prisma.member`. */
const MODEL_FOR_DELEGATE: ReadonlyMap<string, string> = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name.charAt(0).toLowerCase() + model.name.slice(1), model.name]),
);

/** Fetch a property from a client, bound to it: `prisma.$queryRaw` reads `this`, and `this` is the proxy. */
function from(client: object, property: string | symbol): unknown {
  const value = Reflect.get(client, property) as unknown;
  return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
}

export const prisma = new Proxy({} as ScopedClient, {
  get(_target, property) {
    const organizationId = tenantId();
    if (organizationId) return from(clientFor(organizationId), property);

    const model = typeof property === 'string' ? MODEL_FOR_DELEGATE.get(property) : undefined;
    // Without a church, two things are still reachable and both are deliberate: a table that belongs
    // to no church (accounts, roles, the organisations themselves), and a raw client method
    // (`$queryRaw` for the health check, a transaction around global rows). A church's rows are not.
    if ((model && !TENANT_MODELS.has(model)) || (typeof property === 'string' && property.startsWith('$'))) {
      return from(basePrisma, property);
    }
    throw new AppError(
      500,
      `prisma.${String(property)} was reached without an organisation context`,
      'tenant_context_missing',
    );
  },
});

/**
 * The handle a helper takes when it may be called inside a transaction.
 *
 * Deliberately not `Prisma.TransactionClient`: that is the *base* client's transaction type, and this
 * service runs on the tenant-scoped one, so a helper typed against the base client refuses the scoped
 * transaction it is actually handed — and the fix for that is never to reach for the unscoped client.
 */
export type Db = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

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
