import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startJobs, stopJobs } from './jobs/index.js';
import { logger } from './utils/logger.js';

export async function startServer({ mongoUri, onShutdown } = {}) {
  await connectDB(mongoUri);
  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startJobs();

  await new Promise((resolve) => server.listen(env.port, resolve));
  logger.info(`SRKians API listening on http://localhost:${env.port} (${env.nodeEnv})`);

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    stopJobs();
    server.close(async () => {
      await disconnectDB();
      if (onShutdown) await onShutdown();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => logger.error('Unhandled rejection', err));
  return server;
}
