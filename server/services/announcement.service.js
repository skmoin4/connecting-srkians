import {
  Announcement,
  City,
  CityMembership,
  Event,
  EventAttendee,
  FanClub,
  FanClubMember,
  FDFS,
  FDFSParticipant,
  User,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { isObjectId } from '../utils/helpers.js';
import { canModerateCity, isSuperAdmin } from '../middleware/rbac.js';
import { canManageClub } from './fanClub.service.js';
import { canManageEvent } from './event.service.js';
import { canManageFdfs } from './fdfs.service.js';
import { notifyUsers } from './notification.service.js';

/**
 * Who may publish to which target:
 *  GLOBAL/COUNTRY/STATE → super admin
 *  CITY → super admin or that city's moderator
 *  FAN_CLUB/EVENT/FDFS → whoever manages that club/event/FDFS
 */
async function authorizeTarget(user, data) {
  switch (data.target) {
    case 'GLOBAL':
    case 'COUNTRY':
    case 'STATE':
      if (!isSuperAdmin(user)) throw ApiError.forbidden('Only super admins can publish this announcement');
      return {};
    case 'CITY': {
      if (!canModerateCity(user, data.city)) throw ApiError.forbidden('You cannot publish announcements for this city');
      const city = await City.findById(data.city).lean();
      if (!city) throw ApiError.badRequest('City not found');
      return { city: city._id, state: city.state, country: city.country };
    }
    case 'FAN_CLUB': {
      const club = await FanClub.findById(data.fanClub).lean();
      if (!club || !canManageClub(user, club)) throw ApiError.forbidden('You do not manage this fan club');
      return { fanClub: club._id, city: club.city };
    }
    case 'EVENT': {
      const ev = await Event.findById(data.event).populate('fanClub', 'admin').lean();
      if (!ev || !canManageEvent(user, ev)) throw ApiError.forbidden('You cannot manage this event');
      return { event: ev._id, city: ev.city, fanClub: ev.fanClub?._id };
    }
    case 'FDFS': {
      const f = await FDFS.findById(data.fdfs).populate('fanClub', 'admin').lean();
      if (!f || !canManageFdfs(user, f)) throw ApiError.forbidden('You cannot manage this FDFS');
      return { fdfs: f._id, city: f.city, fanClub: f.fanClub?._id };
    }
    default:
      throw ApiError.badRequest('Invalid target');
  }
}

async function recipients(a) {
  const cap = 5000;
  const ids = (rows) => rows.map((r) => r.user ?? r._id);
  switch (a.target) {
    case 'GLOBAL':
      return ids(await User.find({ status: 'ACTIVE' }).select('_id').limit(cap).lean());
    case 'COUNTRY':
      return ids(await User.find({ status: 'ACTIVE', country: a.country }).select('_id').limit(cap).lean());
    case 'STATE':
      return ids(await User.find({ status: 'ACTIVE', state: a.state }).select('_id').limit(cap).lean());
    case 'CITY':
      return ids(await CityMembership.find({ city: a.city }).select('user').limit(cap).lean());
    case 'FAN_CLUB':
      return ids(await FanClubMember.find({ fanClub: a.fanClub, status: 'ACTIVE' }).select('user').limit(cap).lean());
    case 'EVENT':
      return ids(await EventAttendee.find({ event: a.event, status: { $in: ['INTERESTED', 'GOING'] } }).select('user').lean());
    case 'FDFS':
      return ids(await FDFSParticipant.find({ fdfs: a.fdfs, status: { $in: ['INTERESTED', 'GOING'] } }).select('user').lean());
    default:
      return [];
  }
}

export async function createAnnouncement(user, data) {
  const scope = await authorizeTarget(user, data);
  const { notify, ...rest } = data;
  const a = await Announcement.create({ ...rest, ...scope, author: user._id });
  if (notify !== false) {
    notifyUsers(await recipients(a), {
      type: a.target === 'FDFS' ? 'FDFS' : a.target === 'EVENT' ? 'EVENT' : a.target === 'FAN_CLUB' ? 'FAN_CLUB' : 'ANNOUNCEMENT',
      title: a.title,
      message: a.body?.slice(0, 200),
      link: a.link || '/dashboard',
    }, { excludeUserId: user._id });
  }
  return a;
}

export async function updateAnnouncement(user, id, data) {
  const a = await Announcement.findById(id);
  if (!a) throw ApiError.notFound('Announcement not found');
  await authorizeTarget(user, a.toObject());
  Object.assign(a, data);
  await a.save();
  return a;
}

export async function deleteAnnouncement(user, id) {
  const a = await Announcement.findById(id);
  if (!a) throw ApiError.notFound('Announcement not found');
  await authorizeTarget(user, a.toObject());
  await a.deleteOne();
}

/**
 * Public/personal feed of announcements (NOT a social feed — admin-published notices only).
 * With no filters and a logged-in user: global + their country/state/city + their clubs.
 */
export async function listAnnouncements({ target, city, fanClub, event, fdfs, limit = 20 }, viewer) {
  const now = new Date();
  const base = { status: 'PUBLISHED', $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }] };
  let scope;
  if (fanClub && isObjectId(fanClub)) scope = { target: 'FAN_CLUB', fanClub };
  else if (event && isObjectId(event)) scope = { target: 'EVENT', event };
  else if (fdfs && isObjectId(fdfs)) scope = { target: 'FDFS', fdfs };
  else if (city && isObjectId(city)) scope = { $or: [{ target: 'GLOBAL' }, { target: 'CITY', city }] };
  else if (target === 'GLOBAL') scope = { target: 'GLOBAL' };
  else if (viewer) {
    const clubs = await FanClubMember.find({ user: viewer._id, status: 'ACTIVE' }).select('fanClub').lean();
    scope = {
      $or: [
        { target: 'GLOBAL' },
        viewer.country && { target: 'COUNTRY', country: viewer.country },
        viewer.state && { target: 'STATE', state: viewer.state },
        viewer.city && { target: 'CITY', city: viewer.city },
        clubs.length && { target: 'FAN_CLUB', fanClub: { $in: clubs.map((c) => c.fanClub) } },
      ].filter(Boolean),
    };
  } else scope = { target: 'GLOBAL' };

  base.$and.push(scope);
  return Announcement.find(base)
    .sort({ pinned: -1, createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .populate('author', 'fullName username')
    .populate('fanClub', 'name slug')
    .populate('city', 'name slug')
    .lean();
}

/** Announcements the user authored or can manage (dashboard). */
export async function managedAnnouncements(user, { fanClub, skip = 0, limit = 50 }) {
  const filter = {};
  if (fanClub) {
    const club = await FanClub.findById(fanClub).lean();
    if (!canManageClub(user, club)) throw ApiError.forbidden();
    filter.fanClub = fanClub;
  } else if (!isSuperAdmin(user)) {
    filter.$or = [{ author: user._id }, ...(user.moderatedCities?.length ? [{ city: { $in: user.moderatedCities } }] : [])];
  }
  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'fullName username').populate('city', 'name').populate('fanClub', 'name').lean(),
    Announcement.countDocuments(filter),
  ]);
  return { items, total };
}
