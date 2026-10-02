import { Event, EventAttendee, FDFS, FDFSParticipant } from '../models/index.js';
import { notifyUsers } from '../services/notification.service.js';
import { syncMovieStatuses } from '../services/movie.service.js';
import { logger } from '../utils/logger.js';

const timers = [];
const HOUR = 3600 * 1000;

/**
 * Keeps event/FDFS statuses in sync with time:
 *  UPCOMING → ONGOING on the day, ONGOING/UPCOMING → COMPLETED after the day ends.
 */
export async function syncStatuses() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * HOUR);

  for (const [Model, field] of [
    [Event, 'date'],
    [FDFS, 'releaseDate'],
  ]) {
    await Model.updateMany({ status: 'UPCOMING', [field]: { $gte: todayStart, $lt: tomorrowStart } }, { status: 'ONGOING' });
    await Model.updateMany({ status: { $in: ['UPCOMING', 'ONGOING'] }, [field]: { $lt: todayStart } }, { status: 'COMPLETED' });
  }

  await syncMovieStatuses();
}

/** "Your event starts tomorrow" reminders — sent once per listing. */
export async function sendReminders() {
  const from = new Date(Date.now() + 12 * HOUR);
  const to = new Date(Date.now() + 36 * HOUR);

  const events = await Event.find({ status: 'UPCOMING', date: { $gte: from, $lte: to }, reminderSentAt: null }).select('title slug').lean();
  for (const e of events) {
    const rows = await EventAttendee.find({ event: e._id, status: { $in: ['GOING', 'INTERESTED'] } }).select('user').lean();
    await notifyUsers(rows.map((r) => r.user), { type: 'EVENT', title: 'Your event starts tomorrow', message: e.title, link: `/events/${e.slug}` });
    await Event.updateOne({ _id: e._id }, { reminderSentAt: new Date() });
  }

  const fdfs = await FDFS.find({ status: 'UPCOMING', releaseDate: { $gte: from, $lte: to }, reminderSentAt: null }).select('movie slug').lean();
  for (const f of fdfs) {
    const rows = await FDFSParticipant.find({ fdfs: f._id, status: { $in: ['GOING', 'INTERESTED'] } }).select('user').lean();
    await notifyUsers(rows.map((r) => r.user), { type: 'FDFS', title: `${f.movie} FDFS is tomorrow!`, message: 'Check the meeting point and show time.', link: `/fdfs/${f.slug}` });
    await FDFS.updateOne({ _id: f._id }, { reminderSentAt: new Date() });
  }
}

const safe = (name, fn) => async () => {
  try {
    await fn();
  } catch (err) {
    logger.warn(`Job ${name} failed:`, err.message);
  }
};

export function startJobs() {
  if (process.env.DISABLE_JOBS === 'true') return;
  const status = safe('syncStatuses', syncStatuses);
  const reminders = safe('sendReminders', sendReminders);
  setTimeout(status, 5000).unref();
  timers.push(setInterval(status, 15 * 60 * 1000));
  timers.push(setInterval(reminders, HOUR));
  timers.forEach((t) => t.unref());
}

export function stopJobs() {
  timers.splice(0).forEach(clearInterval);
}
