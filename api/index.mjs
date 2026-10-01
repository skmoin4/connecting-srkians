/**
 * Vercel serverless entry for the Express API.
 *
 * Unlike `server/server.js` there is no long-lived process here: each cold start boots the
 * app once and warm invocations reuse it, so the Mongo connection must survive across calls
 * (see `connectDB`, which is idempotent). Socket.io and the interval jobs are deliberately
 * absent — serverless functions cannot hold WebSockets or timers. `emitToUsers` no-ops when
 * sockets were never initialised, so notifications still persist; only live push is lost.
 * The jobs run from `api/cron.mjs` on a Vercel cron schedule instead.
 */
import { createApp } from '../server/app.js';
import { connectDB } from '../server/config/db.js';
import { logger } from '../server/utils/logger.js';

let booting = null;

const boot = async () => {
  await connectDB();
  return createApp();
};

export default async function handler(req, res) {
  try {
    booting = booting || boot();
    const app = await booting;
    return app(req, res);
  } catch (err) {
    logger.error('API boot failed:', err.message);
    booting = null; // don't cache a failed boot — the next request retries
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, message: 'Service unavailable' }));
  }
}
