import { Referral, User } from '../models/index.js';
import { POINT_RULES, REFERRAL_DAILY_REWARD_LIMIT, REFERRAL_SAME_IP_LIMIT } from '../constants/points.js';
import { awardPoints } from './points.service.js';
import { notifyUser } from './notification.service.js';
import { randomToken, sha256, startOfDay } from '../utils/helpers.js';

/** Builds a readable, unique code like SRK-MOIN123. */
export async function generateReferralCode(username) {
  const base = String(username || 'fan').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'FAN';
  for (let i = 0; i < 6; i++) {
    const suffix = i === 0 ? '' : randomToken(2).toUpperCase().slice(0, 3);
    const code = `SRK-${base}${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return `SRK-${base}${randomToken(3).toUpperCase()}`;
}

/** Links a newly registered user to their referrer. Blocks self-referral and IP farming. */
export async function attachReferral(newUser, code, ip) {
  if (!code) return null;
  const referrer = await User.findOne({ referralCode: String(code).toUpperCase().trim(), status: 'ACTIVE' }).select('_id email').lean();
  if (!referrer || String(referrer._id) === String(newUser._id)) return null;

  const ipHash = ip ? sha256(`${ip}:${referrer._id}`) : undefined;
  let status = 'REGISTERED';
  let rejectReason;
  if (ipHash) {
    const sameIp = await Referral.countDocuments({ referrer: referrer._id, ipHash });
    if (sameIp >= REFERRAL_SAME_IP_LIMIT) {
      status = 'REJECTED';
      rejectReason = 'Too many referrals from the same network';
    }
  }
  await User.updateOne({ _id: newUser._id }, { referredBy: referrer._id });
  return Referral.create({ referrer: referrer._id, referred: newUser._id, code: String(code).toUpperCase(), ipHash, status, rejectReason });
}

/**
 * A referral becomes SUCCESSFUL only after the referred user shows real participation (joins a
 * city, fan club, or event). Rewards are capped per referrer per day.
 */
export async function markReferralSuccessful(referredUserId) {
  const ref = await Referral.findOne({ referred: referredUserId, status: 'REGISTERED' });
  if (!ref) return null;
  const rewardedToday = await Referral.countDocuments({
    referrer: ref.referrer,
    status: 'SUCCESSFUL',
    rewardedAt: { $gte: startOfDay() },
  });
  if (rewardedToday >= REFERRAL_DAILY_REWARD_LIMIT) return null;

  ref.status = 'SUCCESSFUL';
  ref.rewardedAt = new Date();
  await ref.save();
  await awardPoints(ref.referrer, 'REFERRAL', { refId: String(referredUserId), refType: 'User' });
  await notifyUser(ref.referrer, {
    type: 'SYSTEM',
    title: 'Successful referral!',
    message: 'A SRKian you invited just joined the community. Points added to your profile.',
    link: '/referrals',
  });
  return ref;
}

export async function referralStats(userId) {
  const user = await User.findById(userId).select('referralCode referralClicks').lean();
  const [registrations, successful, recent] = await Promise.all([
    Referral.countDocuments({ referrer: userId, status: { $ne: 'REJECTED' } }),
    Referral.countDocuments({ referrer: userId, status: 'SUCCESSFUL' }),
    Referral.find({ referrer: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('referred', 'fullName username profilePhoto')
      .lean(),
  ]);
  return {
    code: user?.referralCode,
    clicks: user?.referralClicks || 0,
    registrations,
    successful,
    points: successful * POINT_RULES.REFERRAL,
    recent: recent.map((r) => ({ _id: r._id, status: r.status, createdAt: r.createdAt, user: r.referred })),
  };
}

export async function trackReferralClick(code) {
  await User.updateOne({ referralCode: String(code || '').toUpperCase() }, { $inc: { referralClicks: 1 } });
}
