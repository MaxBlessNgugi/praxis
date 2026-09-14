import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

/**
 * The process: bind the port, and give in-flight work a chance to finish before exiting.
 *
 * The shutdown path is not decoration. A parish office machine gets rebooted, and a `kill` that
 * abandons an open transaction is how a giving ledger ends up with a half-written entry. Closing
 * the HTTP server first stops new requests, then Prisma releases its connections, then the process
 * exits — with a deadline so a stuck connection cannot hang a reboot forever.
 */
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Praxis API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — closing the server`);

  const deadline = setTimeout(() => {
    console.error('Shutdown took longer than 10s; exiting anyway');
    process.exit(1);
  }, 10_000);
  deadline.unref();

  server.close(async (closeError) => {
    if (closeError) console.error('HTTP server did not close cleanly', closeError);
    await prisma.$disconnect();
    clearTimeout(deadline);
    console.log('Shutdown complete');
    process.exit(closeError ? 1 : 0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
