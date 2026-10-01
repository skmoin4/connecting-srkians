/**
 * Replacement for the setInterval jobs in `server/jobs/index.js`, which cannot run in a
 * serverless deployment. Vercel Cron calls this on the schedule in vercel.json.
 */
import { connectDB } from '../server/config/db.js';
import { syncStatuses, sendReminders } from '../server/jobs/index.js';
import { logger } from '../server/utils/logger.js';

export default async function handler(req, res) {
  // Vercel signs its own cron calls; CRON_SECRET additionally blocks public hits.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    return res.end('Unauthorized');
  }

  try {
    await connectDB();
    await syncStatuses();
    await sendReminders();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, ranAt: new Date().toISOString() }));
  } catch (err) {
    logger.error('Cron run failed:', err.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, message: err.message }));
  }
}
