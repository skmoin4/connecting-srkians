import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { randomToken } from '../utils/helpers.js';
import { awardPoints, revokePoints } from './points.service.js';
import { markReferralSuccessful } from './referral.service.js';
import { evaluateBadges } from './badge.service.js';

/**
 * Shared attendance engine for Events and FDFS. Guarantees:
 *  - one participant row per (item, user) (unique index)
 *  - counters stay consistent (decrement old status, increment new)
 *  - capacity enforced atomically on GOING
 *  - points awarded once and revoked on cancellation
 *
 * cfg = { Item, Participant, ref: 'event'|'fdfs', dateField, joinReason, attendReason, deadlineField? }
 */
export function makeParticipation(cfg) {
  const { Item, Participant, ref, dateField, joinReason, attendReason } = cfg;
  const countKey = (s) => (s ? `counts.${s.toLowerCase()}` : null);
  const COUNTED = ['INTERESTED', 'GOING', 'ATTENDED'];

  function registrationState(item) {
    if (item.status === 'CANCELLED') return { open: false, reason: 'This listing was cancelled' };
    if (item.status === 'COMPLETED') return { open: false, reason: 'This has already happened' };
    if (item.status === 'DRAFT') return { open: false, reason: 'Not yet published' };
    if (!item.registrationOpen) return { open: false, reason: 'Registrations are closed' };
    if (item.registrationDeadline && new Date(item.registrationDeadline) < new Date()) return { open: false, reason: 'Registration deadline has passed' };
    if (item.capacity && item.counts?.going >= item.capacity) return { open: false, reason: 'Fully booked', full: true };
    return { open: true };
  }

  async function adjustCounts(itemId, from, to) {
    const inc = {};
    if (from && COUNTED.includes(from)) inc[countKey(from)] = -1;
    if (to && COUNTED.includes(to)) inc[countKey(to)] = (inc[countKey(to)] || 0) + 1;
    if (Object.keys(inc).length) await Item.updateOne({ _id: itemId }, { $inc: inc });
  }

  /** INTERESTED | GOING | CANCELLED */
  async function setStatus(user, itemId, status) {
    const item = await Item.findById(itemId).lean();
    if (!item || item.status === 'DRAFT') throw ApiError.notFound();
    const existing = await Participant.findOne({ [ref]: itemId, user: user._id });
    const prev = existing?.status;

    if (prev === 'ATTENDED') throw ApiError.badRequest('Your attendance is already confirmed');
    if (prev === status) return { status, counts: item.counts };
    if (status !== 'CANCELLED' && ['CANCELLED', 'COMPLETED'].includes(item.status)) {
      throw ApiError.badRequest(registrationState(item).reason);
    }

    if (status === 'GOING') {
      const reg = registrationState(item);
      if (!reg.open) throw ApiError.badRequest(reg.reason);
      // Atomic capacity reservation
      if (item.capacity) {
        const reserved = await Item.updateOne(
          { _id: itemId, $expr: { $lt: ['$counts.going', '$capacity'] } },
          { $inc: { 'counts.going': 1 } }
        );
        if (!reserved.modifiedCount) throw ApiError.badRequest('Sorry, this is fully booked');
      }
    }
    if (status === 'CANCELLED' && !existing) throw ApiError.badRequest('You are not registered');

    if (existing) {
      existing.status = status;
      await existing.save();
    } else {
      await Participant.create({ [ref]: itemId, user: user._id, status });
    }

    // Counters (GOING increment may already be done by the capacity reservation)
    const inc = {};
    if (prev && COUNTED.includes(prev)) inc[countKey(prev)] = -1;
    if (COUNTED.includes(status) && !(status === 'GOING' && item.capacity)) inc[countKey(status)] = (inc[countKey(status)] || 0) + 1;
    if (Object.keys(inc).length) await Item.updateOne({ _id: itemId }, { $inc: inc });

    if (status === 'GOING') {
      await awardPoints(user._id, joinReason, { refId: String(itemId), refType: Item.modelName });
      markReferralSuccessful(user._id).catch(() => {});
    } else if (prev === 'GOING') {
      await revokePoints(user._id, joinReason, String(itemId));
    }
    const fresh = await Item.findById(itemId).select('counts').lean();
    return { status, counts: fresh.counts };
  }

  async function markAttended(itemId, userId) {
    const existing = await Participant.findOne({ [ref]: itemId, user: userId });
    if (existing?.status === 'ATTENDED') return { already: true };
    const prev = existing?.status;
    if (existing) {
      existing.set({ status: 'ATTENDED', checkedInAt: new Date() });
      await existing.save();
    } else {
      await Participant.create({ [ref]: itemId, user: userId, status: 'ATTENDED', checkedInAt: new Date() });
    }
    await adjustCounts(itemId, prev, 'ATTENDED');
    await awardPoints(userId, attendReason, { refId: String(itemId), refType: Item.modelName });
    evaluateBadges(userId).catch(() => {});
    return { already: false };
  }

  /** QR check-in: the QR encodes the item's secret check-in code. */
  async function checkIn(user, itemId, code) {
    const item = await Item.findById(itemId).select(`+checkInCode status ${dateField}`).lean();
    if (!item) throw ApiError.notFound();
    if (!item.checkInCode || item.checkInCode !== code) throw ApiError.badRequest('Invalid check-in code');
    if (['CANCELLED', 'DRAFT'].includes(item.status)) throw ApiError.badRequest('Check-in is not available');
    const opensAt = new Date(new Date(item[dateField]).getTime() - 24 * 3600 * 1000);
    if (new Date() < opensAt) throw ApiError.badRequest('Check-in opens 24 hours before the start');
    const res = await markAttended(itemId, user._id);
    if (res.already) throw ApiError.conflict('You have already checked in');
    return { status: 'ATTENDED' };
  }

  async function getCheckInCode(itemId, regenerate = false) {
    const item = await Item.findById(itemId).select('+checkInCode');
    if (!item) throw ApiError.notFound();
    if (!item.checkInCode || regenerate) {
      item.checkInCode = randomToken(12);
      await item.save();
    }
    return item.checkInCode;
  }

  async function listParticipants(itemId, { status, skip = 0, limit = 50 }) {
    const filter = { [ref]: itemId, ...(status ? { status } : { status: { $ne: 'CANCELLED' } }) };
    const [items, total, breakdown] = await Promise.all([
      Participant.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', select: 'fullName username profilePhoto city', populate: { path: 'city', select: 'name' } })
        .lean(),
      Participant.countDocuments(filter),
      Participant.aggregate([{ $match: { [ref]: new mongoose.Types.ObjectId(String(itemId)) } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    return { items, total, breakdown: Object.fromEntries(breakdown.map((b) => [b._id, b.count])) };
  }

  const participantIds = async (itemId, statuses = ['INTERESTED', 'GOING']) =>
    (await Participant.find({ [ref]: itemId, status: { $in: statuses } }).select('user').lean()).map((p) => p.user);

  const myStatus = async (itemId, userId) =>
    userId ? (await Participant.findOne({ [ref]: itemId, user: userId }).select('status').lean())?.status || null : null;

  return { registrationState, setStatus, markAttended, checkIn, getCheckInCode, listParticipants, participantIds, myStatus };
}
