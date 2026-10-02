import { Badge, Moment, UserBadge } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { isObjectId } from '../utils/helpers.js';
import { notifyUser } from './notification.service.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Resolves a recurring day/month to its occurrence nearest `now`. A moment in late December is
 * still "live" on 1 January when its window spans the year boundary, so both the current and the
 * adjacent years are considered and the closest occurrence wins.
 */
function occurrence(moment, now) {
  const year = now.getUTCFullYear();
  const candidates = [year - 1, year, year + 1]
    .map((y) => Date.UTC(y, moment.month - 1, moment.day))
    // Feb 29 in a common year rolls into March; drop those so the date stays truthful.
    .filter((t) => new Date(t).getUTCDate() === moment.day);
  return candidates.reduce((best, t) => (Math.abs(t - now.getTime()) < Math.abs(best - now.getTime()) ? t : best));
}

/** Decorates a moment with the dates the UI needs: when it next falls and whether it is live now. */
export function decorate(moment, now = new Date()) {
  const at = occurrence(moment, now);
  const window = (moment.windowDays || 0) * DAY;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const live = Math.abs(at - startOfToday) <= window;
  const daysAway = Math.round((at - startOfToday) / DAY);
  return {
    ...moment,
    date: new Date(at).toISOString(),
    live,
    daysAway,
    // "30 years of DDLJ" — only meaningful once we know when it started.
    years: moment.sinceYear ? new Date(at).getUTCFullYear() - moment.sinceYear : undefined,
  };
}

export async function listMoments({ activeOnly = true } = {}) {
  const moments = await Moment.find(activeOnly ? { active: true } : {})
    .populate('badge', 'code name icon tier')
    .populate('movie', 'title slug poster')
    .lean();
  const now = new Date();
  return moments
    .map((m) => decorate(m, now))
    // Live moments first, then whichever is coming up soonest.
    .sort((a, b) => Number(b.live) - Number(a.live) || (a.daysAway < 0 ? 1 : 0) - (b.daysAway < 0 ? 1 : 0) || a.daysAway - b.daysAway);
}

/** Moments being celebrated right now — drives the homepage banner and the badge award below. */
export async function liveMoments() {
  return (await listMoments()).filter((m) => m.live);
}

export async function createMoment(data) {
  return Moment.create(data);
}

export async function updateMoment(id, data) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid moment');
  const moment = await Moment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!moment) throw ApiError.notFound('Moment not found');
  return moment;
}

export async function deleteMoment(id) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid moment');
  const moment = await Moment.findByIdAndDelete(id);
  if (!moment) throw ApiError.notFound('Moment not found');
  return moment;
}

/**
 * Awards the badges of every live moment to a user who just turned up to something.
 *
 * Called when attendance is confirmed, not when someone registers — the points rules only reward
 * verified participation, and a commemorative badge should mean the same thing.
 */
export async function awardMomentBadges(userId) {
  const live = (await liveMoments()).filter((m) => m.badge);
  const awarded = [];
  for (const moment of live) {
    try {
      const created = await UserBadge.create({ user: userId, badge: moment.badge._id });
      if (created) {
        awarded.push(moment.badge);
        const badge = await Badge.findById(moment.badge._id).select('name description').lean();
        await notifyUser(userId, {
          type: 'SYSTEM',
          title: `Badge unlocked: ${badge?.name || moment.badge.name}`,
          message: badge?.description || `Earned during ${moment.title}.`,
          link: '/my-badges',
        });
      }
    } catch {
      /* duplicate — the user already has this year's badge */
    }
  }
  return awarded;
}
