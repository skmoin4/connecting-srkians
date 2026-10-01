import { PointsTransaction, User, UserPoints } from '../models/index.js';
import { POINT_RULES } from '../constants/points.js';
import { logger } from '../utils/logger.js';

/**
 * Awards points idempotently: a (user, reason, refId) combination can only be awarded once,
 * enforced by a unique index. Returns the points awarded (0 if duplicate/failed).
 */
export async function awardPoints(userId, reason, { refId, refType, points, note, awardedBy } = {}) {
  const value = points ?? POINT_RULES[reason];
  if (!value) return 0;
  try {
    await PointsTransaction.create({
      user: userId,
      reason,
      points: value,
      refId: refId ? String(refId) : undefined,
      refType,
      note,
      awardedBy,
    });
  } catch (err) {
    if (err.code === 11000) return 0; // already awarded
    logger.warn('awardPoints failed', err.message);
    return 0;
  }
  const user = await User.findByIdAndUpdate(userId, { $inc: { totalPoints: value } }, { new: true })
    .select('city state country totalPoints')
    .lean();
  await UserPoints.updateOne(
    { user: userId },
    { $set: { total: user?.totalPoints ?? value, city: user?.city, state: user?.state, country: user?.country } },
    { upsert: true }
  );
  // Lazy import avoids a circular dependency (badge service reads points).
  const { evaluateBadges } = await import('./badge.service.js');
  evaluateBadges(userId).catch(() => {});
  return value;
}

/** Revokes a previously awarded idempotent award (e.g. user cancels event registration). */
export async function revokePoints(userId, reason, refId) {
  const tx = await PointsTransaction.findOneAndDelete({ user: userId, reason, refId: String(refId) });
  if (!tx) return 0;
  const user = await User.findByIdAndUpdate(userId, { $inc: { totalPoints: -tx.points } }, { new: true }).select('totalPoints').lean();
  await UserPoints.updateOne({ user: userId }, { $set: { total: user?.totalPoints ?? 0 } });
  return tx.points;
}

/** Keeps the leaderboard row's location in sync after a user changes city. */
export async function syncPointsLocation(user) {
  await UserPoints.updateOne(
    { user: user._id },
    { $set: { city: user.city, state: user.state, country: user.country }, $setOnInsert: { total: user.totalPoints || 0 } },
    { upsert: true }
  );
}

export const pointsHistory = (userId, limit = 50) =>
  PointsTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
