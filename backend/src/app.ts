import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOrigins, env } from './config/env';
import { prisma } from './lib/prisma';
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
import { governanceRouter } from './routes/governance.routes';
import { reportRouter } from './routes/report.routes';
import { settingsRouter } from './routes/settings.routes';
import { adminRouter } from './routes/admin.routes';

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
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

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

  // `/api/admin/users` is mounted before `/api/admin` on purpose: Express matches in order, and the
  // users router is the more specific path. Reversing the two would let the admin router's guards
  // run first for account administration, which is not what either router documents.
  app.use('/api/admin/users', userRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api/members', memberRouter);
  app.use('/api/households', householdRouter);
  app.use('/api/ministries', ministryRouter);
  app.use('/api/services', serviceRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/communications', communicationsRouter);
  app.use('/api/governance', governanceRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/settings', settingsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
