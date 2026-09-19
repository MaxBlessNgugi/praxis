import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins, env, uploadBodyLimit } from './config/env';
import { prisma } from './lib/prisma';
import { assertStorageConfigured } from './lib/storage';
import { rateLimit } from './middleware/rateLimit';
import { requestLog } from './middleware/requestLog';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { memberRouter } from './routes/member.routes';
import { householdRouter } from './routes/household.routes';
import { serviceRouter } from './routes/service.routes';
import { financeRouter } from './routes/finance.routes';
import { communicationsRouter } from './routes/communications.routes';
import { ministryRouter } from './routes/ministry.routes';
import { groupRouter } from './routes/group.routes';
import { governanceRouter } from './routes/governance.routes';
import { reportRouter } from './routes/report.routes';
import { certificateRouter } from './routes/certificate.routes';
import { settingsRouter } from './routes/settings.routes';
import { adminRouter } from './routes/admin.routes';
import { fileRouter } from './routes/file.routes';
import { inventoryRouter } from './routes/inventory.routes';
import { billingRouter } from './routes/billing.routes';
import { vendorRouter } from './routes/vendor.routes';

/**
 * The application, with no `listen` in it.
 *
 * Separating the app from the server is what makes the app testable: a test can mount it and drive
 * it without binding a port, and `server.ts` keeps the one responsibility of owning the socket.
 *
 * Order matters and is deliberate. Security headers and CORS come first so they apply to every
 * response, including the ones that never reach a route. Parsing and route mounting sit in the
 * middle. The 404 handler is mounted *after* the routes so it only sees what they declined, and the
 * error handler is last because Express only treats a four-argument handler as an error handler.
 */
export function createApp(): Express {
  // A misconfigured storage driver should stop the process at boot, not on the first logo upload.
  assertStorageConfigured();

  const app = express();

  app.disable('x-powered-by');
  // Only believe `X-Forwarded-For` as far as the deployment says to. See `TRUST_PROXY_HOPS`.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }
  // First in the chain, so it sees every response — including the ones a middleware in front of the
  // routes produces. `trust proxy` above is what makes the client address in its line the real one.
  app.use(requestLog);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  // An upload arrives base64-encoded, so its body is a third larger than the file — that path gets a
  // taller ceiling than everything else, and gets it *first*. Order matters here: body-parser skips a
  // body it finds already parsed, so mounting the wide parser before the narrow one keeps the 1 MB
  // guard on every ordinary endpoint, where it is a useful limit rather than an obstacle to a logo.
  app.use('/api/files', express.json({ limit: uploadBodyLimit }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // A ceiling on the whole API, applied before any route so a new endpoint is protected by default
  // rather than by remembering. `/health` sits above it and stays unlimited, because a monitoring
  // poller being rate-limited is how a healthy service gets restarted.
  app.use(
    '/api',
    rateLimit({ name: 'api', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }),
  );

  /**
   * Liveness and readiness in one endpoint, because the parish deployment needs both answers and a
   * single poller is easier to keep honest than two. The database round trip is the point: a process
   * that is up but cannot reach Postgres is not serving anything.
   */
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'reachable', environment: env.NODE_ENV });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  // Auth is public at `/login` and guarded everywhere else; the admin router carries its own
  // `requireAuth` and `requireRole('admin')`, so an endpoint added to it is protected by default.
  app.use('/api/auth', authRouter);

  // A church's own billing, and the vendor's cross-church view. Neither is behind the subscription
  // gate below: one is how a lapsed church gets back, and the other is the tool that takes it there.
  app.use('/api/billing', billingRouter);
  app.use('/api/vendor', vendorRouter);

  // `/api/admin/users` is mounted before `/api/admin` on purpose: Express matches in order, and the
  // users router is the more specific path. Reversing the two would let the admin router's guards
  // run first for account administration, which is not what either router documents.
  app.use('/api/admin/users', userRouter);
  app.use('/api/admin', adminRouter);

  /**
   * The operating modules, each behind the subscription gate.
   *
   * Every router here mounts `requireAuth` and then `requireWritableSubscription`, in that order and
   * inside the router: the gate reads the church's subscription through the tenant-scoped client, so it
   * needs the church the request resolved to, and only `requireAuth` can have resolved it. A router
   * that forgot its half would fail with `tenant_context_missing` rather than quietly letting a lapsed
   * church write — loud is the right failure for a gate.
   *
   * Reads pass through it: a church that cannot open its own register over a bookkeeping slip is a
   * worse failure than an unbilled month. See `middleware/subscription.ts`.
   */
  app.use('/api/members', memberRouter);
  app.use('/api/households', householdRouter);
  app.use('/api/ministries', ministryRouter);
  app.use('/api/groups', groupRouter);
  app.use('/api/services', serviceRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/communications', communicationsRouter);
  app.use('/api/governance', governanceRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/certificates', certificateRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/files', fileRouter);
  app.use('/api/inventory', inventoryRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
