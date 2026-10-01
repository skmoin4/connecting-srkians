import {
  Badge,
  EventAttendee,
  FanClubMember,
  FDFSParticipant,
  Referral,
  User,
  UserBadge,
} from '../models/index.js';
import { notifyUser } from './notification.service.js';

/**
 * Evaluates all active rule-based badges for a user and awards any newly earned ones.
 * Rules are configured by admins on the Badge model (type + threshold [+ city]).
 */
export async function evaluateBadges(userId) {
  const [user, badges, owned] = await Promise.all([
    User.findById(userId).select('city totalPoints createdAt').lean(),
    Badge.find({ active: true, 'rule.type': { $ne: 'MANUAL' } }).lean(),
    UserBadge.find({ user: userId }).select('badge').lean(),
  ]);
  if (!user) return [];
  const ownedSet = new Set(owned.map((b) => String(b.badge)));
  const pending = badges.filter((b) => !ownedSet.has(String(b._id)));
  if (!pending.length) return [];

  const needs = new Set(pending.map((b) => b.rule.type));
  const counts = {};
  if (needs.has('FANCLUB_MEMBER')) counts.FANCLUB_MEMBER = await FanClubMember.countDocuments({ user: userId, status: 'ACTIVE' });
  if (needs.has('EVENTS_ATTENDED')) counts.EVENTS_ATTENDED = await EventAttendee.countDocuments({ user: userId, status: 'ATTENDED' });
  if (needs.has('FDFS_ATTENDED'))
    counts.FDFS_ATTENDED = await FDFSParticipant.countDocuments({ user: userId, status: { $in: ['ATTENDED'] } });
  if (needs.has('REFERRALS')) counts.REFERRALS = await Referral.countDocuments({ referrer: userId, status: 'SUCCESSFUL' });

  const earned = pending.filter((b) => {
    const t = b.rule.threshold ?? 1;
    switch (b.rule.type) {
      case 'JOINED':
        return true;
      case 'CITY_MEMBER':
        return b.rule.city ? String(user.city) === String(b.rule.city) : Boolean(user.city);
      case 'POINTS':
        return (user.totalPoints || 0) >= t;
      default:
        return (counts[b.rule.type] || 0) >= t;
    }
  });

  for (const badge of earned) {
    try {
      await UserBadge.create({ user: userId, badge: badge._id });
      await notifyUser(userId, {
        type: 'SYSTEM',
        title: `Badge unlocked: ${badge.name}`,
        message: badge.description,
        link: '/my-badges',
      });
    } catch {
      /* duplicate — already awarded concurrently */
    }
  }
  return earned;
}

export async function awardBadgeManually(userId, badgeId, awardedBy) {
  const badge = await Badge.findById(badgeId).lean();
  if (!badge) return null;
  const ub = await UserBadge.findOneAndUpdate(
    { user: userId, badge: badgeId },
    { $setOnInsert: { awardedBy } },
    { upsert: true, new: true }
  );
  await notifyUser(userId, { type: 'SYSTEM', title: `Badge awarded: ${badge.name}`, message: badge.description, link: '/my-badges' });
  return ub;
}

export const userBadges = (userId) =>
  UserBadge.find({ user: userId }).populate('badge', 'code name description icon tier').sort({ createdAt: -1 }).lean();
