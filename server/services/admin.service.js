import {
  AdminContactRequest,
  AuditLog,
  Badge,
  City,
  CityMembership,
  Country,
  Event,
  EventAttendee,
  FanClub,
  FanClubApplication,
  FDFS,
  FDFSParticipant,
  Referral,
  Report,
  State,
  User,
} from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, idEq, isObjectId, startOfDay } from '../utils/helpers.js';
import { cityScopeFilter, isSuperAdmin } from '../middleware/rbac.js';
import { serializeFanClub } from './fanClub.service.js';
import { revokeAllForUser } from './token.service.js';
import { notifyUser } from './notification.service.js';
import { awardPoints } from './points.service.js';

const DAY = 86400000;

export async function dashboard(actor) {
  const scope = cityScopeFilter(actor);
  const today = startOfDay();
  const since30 = new Date(Date.now() - 30 * DAY);
  const userScope = isSuperAdmin(actor) ? {} : { city: { $in: actor.moderatedCities || [] } };
  const [
    totalUsers,
    activeUsers,
    countries,
    states,
    cities,
    fanClubs,
    pendingFanClubs,
    events,
    upcomingEvents,
    upcomingFdfs,
    openReports,
    contactRequests,
    recentApplications,
    recentReports,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: 'DELETED' }, ...userScope }),
    User.countDocuments({ status: 'ACTIVE', lastActiveAt: { $gte: since30 }, ...userScope }),
    Country.countDocuments({ status: 'ACTIVE' }),
    State.countDocuments({ status: 'ACTIVE' }),
    City.countDocuments(isSuperAdmin(actor) ? { status: 'ACTIVE' } : { _id: { $in: actor.moderatedCities || [] } }),
    FanClub.countDocuments({ status: 'APPROVED', ...scope }),
    FanClub.countDocuments({ status: 'PENDING', ...scope }),
    Event.countDocuments({ ...scope }),
    Event.countDocuments({ status: 'UPCOMING', date: { $gte: today }, ...scope }),
    FDFS.countDocuments({ status: 'UPCOMING', ...scope }),
    Report.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] }, ...scope }),
    AdminContactRequest.countDocuments({ status: 'NEW' }),
    FanClub.find({ status: 'PENDING', ...scope }).sort({ createdAt: -1 }).limit(5).populate('city', 'name').populate('admin', 'fullName username').select('name slug city admin createdAt').lean(),
    Report.find({ status: 'PENDING', ...scope }).sort({ createdAt: -1 }).limit(5).select('targetType targetLabel reason createdAt').lean(),
  ]);
  return {
    cards: { totalUsers, activeUsers, countries, states, cities, fanClubs, pendingFanClubs, events, upcomingEvents, upcomingFdfs, openReports, contactRequests },
    recentApplications,
    recentReports,
  };
}

const dailySeries = async (Model, match, days, dateField = 'createdAt') => {
  const since = new Date(Date.now() - days * DAY);
  const rows = await Model.aggregate([
    { $match: { ...match, [dateField]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  // Fill gaps so charts have a continuous axis.
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    out.push({ date: d, count: map.get(d) || 0 });
  }
  return out;
};

export async function analytics(actor, { days = 30 }) {
  const d = Math.min(Math.max(Number(days) || 30, 7), 365);
  const scope = cityScopeFilter(actor);
  const userScope = isSuperAdmin(actor) ? {} : { city: { $in: actor.moderatedCities || [] } };
  const today = startOfDay();
  const week = new Date(Date.now() - 7 * DAY);
  const month = new Date(Date.now() - 30 * DAY);

  const [usersToday, usersWeek, usersMonth, userGrowth, cityGrowth, clubGrowth, eventRegs, fdfsRegs, referralGrowth] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: today }, ...userScope }),
    User.countDocuments({ createdAt: { $gte: week }, ...userScope }),
    User.countDocuments({ createdAt: { $gte: month }, ...userScope }),
    dailySeries(User, userScope, d),
    dailySeries(CityMembership, isSuperAdmin(actor) ? {} : { city: { $in: actor.moderatedCities || [] } }, d),
    dailySeries(FanClub, { status: 'APPROVED', ...scope }, d, 'approvedAt'),
    dailySeries(EventAttendee, { status: { $in: ['GOING', 'ATTENDED'] } }, d),
    dailySeries(FDFSParticipant, { status: { $in: ['GOING', 'ATTENDED'] } }, d),
    dailySeries(Referral, { status: { $ne: 'REJECTED' } }, d),
  ]);

  // "Most active cities" is based on real activity: new members + event/FDFS registrations (last 30 days).
  const [memberActivity, eventActivity, fdfsActivity] = await Promise.all([
    CityMembership.aggregate([{ $match: { createdAt: { $gte: month } } }, { $group: { _id: '$city', n: { $sum: 1 } } }]),
    EventAttendee.aggregate([
      { $match: { createdAt: { $gte: month }, status: { $ne: 'CANCELLED' } } },
      { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'e' } },
      { $unwind: '$e' },
      { $group: { _id: '$e.city', n: { $sum: 1 } } },
    ]),
    FDFSParticipant.aggregate([
      { $match: { createdAt: { $gte: month }, status: { $ne: 'CANCELLED' } } },
      { $lookup: { from: 'fdfs', localField: 'fdfs', foreignField: '_id', as: 'f' } },
      { $unwind: '$f' },
      { $group: { _id: '$f.city', n: { $sum: 1 } } },
    ]),
  ]);
  const activity = new Map();
  for (const r of [...memberActivity, ...eventActivity, ...fdfsActivity]) activity.set(String(r._id), (activity.get(String(r._id)) || 0) + r.n);
  const activeIds = [...activity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const cityDocs = await City.find({
    $and: [{ _id: { $in: activeIds.map(([id]) => id) } }, isSuperAdmin(actor) ? {} : { _id: { $in: actor.moderatedCities || [] } }],
  })
    .select('name slug memberCount')
    .lean();
  const cityMap = new Map(cityDocs.map((c) => [String(c._id), c]));
  const mostActiveCities = activeIds.filter(([id]) => cityMap.has(id)).map(([id, n]) => ({ ...cityMap.get(id), activity: n }));

  const [topCities, topFanClubs, fdfsTotals, pendingFanClubs, totalCities, totalFanClubs, upcomingEvents] = await Promise.all([
    City.find(isSuperAdmin(actor) ? { status: 'ACTIVE' } : { _id: { $in: actor.moderatedCities || [] } }).sort({ memberCount: -1 }).limit(10).select('name slug memberCount fanClubCount').lean(),
    FanClub.find({ status: 'APPROVED', ...scope }).sort({ memberCount: -1 }).limit(10).populate('city', 'name').select('name slug memberCount city').lean(),
    FDFS.aggregate([{ $match: scope }, { $group: { _id: null, going: { $sum: '$counts.going' }, interested: { $sum: '$counts.interested' }, attended: { $sum: '$counts.attended' } } }]),
    FanClub.countDocuments({ status: 'PENDING', ...scope }),
    City.countDocuments({ status: 'ACTIVE' }),
    FanClub.countDocuments({ status: 'APPROVED', ...scope }),
    Event.countDocuments({ status: 'UPCOMING', ...scope }),
  ]);

  return {
    summary: {
      usersToday,
      usersWeek,
      usersMonth,
      totalCities,
      totalFanClubs,
      pendingFanClubs,
      upcomingEvents,
      fdfsParticipation: fdfsTotals[0] || { going: 0, interested: 0, attended: 0 },
    },
    series: { userGrowth, cityGrowth, clubGrowth, eventRegistrations: eventRegs, fdfsParticipation: fdfsRegs, referralGrowth },
    topCities,
    topFanClubs,
    mostActiveCities,
  };
}

// ----------------------------- Users -----------------------------

export async function listUsers({ q, role, status, city, skip, limit }) {
  const filter = { status: { $ne: 'DELETED' } };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ fullName: rx }, { username: rx }, { email: rx }];
  }
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (city && isObjectId(city)) filter.city = city;
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('fullName username email role status city moderatedCities totalPoints createdAt lastActiveAt profilePhoto emailVerified isDemo')
      .populate('city', 'name')
      .populate('moderatedCities', 'name')
      .lean(),
    User.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getUser(id) {
  const user = await User.findById(id).populate('city state country moderatedCities', 'name').lean();
  if (!user) throw ApiError.notFound('User not found');
  const clubs = await FanClub.find({ admin: id }).select('name slug status').lean();
  return { ...user, managedClubs: clubs };
}

export async function updateUser(actor, id, data) {
  if (idEq(actor._id, id) && (data.role || data.status)) throw ApiError.badRequest('You cannot change your own role or status');
  const user = await User.findById(id);
  if (!user || user.status === 'DELETED') throw ApiError.notFound('User not found');

  const changes = {};
  if (data.role && data.role !== user.role) {
    changes.role = { from: user.role, to: data.role };
    user.role = data.role;
    if (data.role !== ROLES.CITY_MODERATOR && !data.moderatedCities) user.moderatedCities = [];
  }
  if (data.moderatedCities) {
    const count = await City.countDocuments({ _id: { $in: data.moderatedCities } });
    if (count !== data.moderatedCities.length) throw ApiError.badRequest('One or more cities are invalid');
    changes.moderatedCities = data.moderatedCities;
    user.moderatedCities = data.moderatedCities;
  }
  if (data.status && data.status !== user.status) {
    changes.status = { from: user.status, to: data.status };
    user.status = data.status;
    if (data.status === 'SUSPENDED') await revokeAllForUser(user._id);
  }
  await user.save();
  if (changes.role) {
    notifyUser(user._id, { type: 'ADMIN', title: 'Your account role was updated', message: `New role: ${user.role.replace(/_/g, ' ')}` }, { force: true });
  }
  return { user, changes };
}

export async function deleteUser(actor, id) {
  if (idEq(actor._id, id)) throw ApiError.badRequest('You cannot delete your own account here');
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (await FanClub.exists({ admin: id, status: 'APPROVED' })) throw ApiError.badRequest('User manages a verified fan club. Suspend the club or reassign it first.');
  await revokeAllForUser(id);
  user.set({ status: 'DELETED', deletedAt: new Date(), email: `deleted_${id}@deleted.invalid`, username: `deleted_${id}`, fullName: 'Deleted SRKian', referralCode: undefined });
  await user.save();
  return user;
}

export async function awardAdminPoints(actor, userId, { points, note }) {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound('User not found');
  const reason = 'ADMIN_AWARD';
  // Unique refId per award so repeated manual awards are allowed but individually tracked.
  const awarded = await awardPoints(userId, reason, { points, note, awardedBy: actor._id, refId: `admin-${Date.now()}`, refType: 'Admin' });
  notifyUser(userId, { type: 'SYSTEM', title: `${points > 0 ? '+' : ''}${points} community points`, message: note, link: '/my-badges' });
  return { awarded };
}

// ----------------------------- Fan clubs -----------------------------

export async function listFanClubsAdmin(actor, { status, q, city, featured, skip, limit }) {
  const filter = { ...cityScopeFilter(actor) };
  if (status) filter.status = status;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (city && isObjectId(city)) filter.city = city;
  if (featured === 'true') filter.featured = true;
  const [items, total] = await Promise.all([
    FanClub.find(filter)
      .sort({ status: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('city', 'name slug')
      .populate('state', 'name')
      .populate('admin', 'fullName username email')
      .lean(),
    FanClub.countDocuments(filter),
  ]);
  const apps = await FanClubApplication.find({ fanClub: { $in: items.map((i) => i._id) } })
    .populate('history.by', 'fullName username')
    .lean();
  const appMap = new Map(apps.map((a) => [String(a.fanClub), a.history]));
  return { items: items.map((c) => ({ ...serializeFanClub(c, actor), history: appMap.get(String(c._id)) || [] })), total };
}

export async function featureFanClub(actor, id, featured) {
  const club = await FanClub.findOne({ _id: id, ...cityScopeFilter(actor) });
  if (!club) throw ApiError.notFound('Fan club not found');
  club.featured = featured;
  await club.save();
  return club;
}

// ----------------------------- Events / FDFS -----------------------------

export async function listEventsAdmin(actor, Model, { status, q, city, skip, limit }) {
  const filter = { ...cityScopeFilter(actor) };
  if (status) filter.status = status;
  if (city && isObjectId(city)) filter.city = city;
  if (q) filter[Model === FDFS ? 'movie' : 'title'] = { $regex: escapeRegex(q), $options: 'i' };
  const [items, total] = await Promise.all([
    Model.find(filter)
      .sort(Model === FDFS ? { releaseDate: -1 } : { date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('city', 'name slug')
      .populate('fanClub', 'name slug')
      .populate('organizer', 'fullName username')
      .lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total };
}

export async function patchEventAdmin(actor, Model, id, data) {
  const doc = await Model.findOne({ _id: id, ...cityScopeFilter(actor) });
  if (!doc) throw ApiError.notFound();
  const wasCancelled = doc.status === 'CANCELLED';
  Object.assign(doc, data);
  await doc.save();
  return { doc, cancelledNow: !wasCancelled && doc.status === 'CANCELLED' };
}

// ----------------------------- Audit / badges -----------------------------

export async function listAuditLogs({ q, action, targetType, skip, limit }) {
  const filter = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (q) filter.$or = [{ description: { $regex: escapeRegex(q), $options: 'i' } }, { actorName: { $regex: escapeRegex(q), $options: 'i' } }];
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total };
}

export const listBadges = () => Badge.find().sort({ createdAt: 1 }).populate('rule.city', 'name').lean();
export const createBadge = (data) => Badge.create(data);
export async function updateBadge(id, data) {
  const b = await Badge.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!b) throw ApiError.notFound('Badge not found');
  return b;
}

export async function listModerators() {
  return User.find({ role: ROLES.CITY_MODERATOR, status: { $ne: 'DELETED' } })
    .select('fullName username email moderatedCities status')
    .populate('moderatedCities', 'name slug')
    .lean();
}
