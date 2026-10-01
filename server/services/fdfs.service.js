import { City, CityMembership, FanClub, FanClubMember, FDFS, FDFSParticipant, Announcement } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, idEq, isObjectId, randomToken, uniqueSlug } from '../utils/helpers.js';
import { canModerateCity, isSuperAdmin } from '../middleware/rbac.js';
import { canManageClub } from './fanClub.service.js';
import { makeParticipation } from './participation.service.js';
import { notifyUsers } from './notification.service.js';

export const fdfsParticipation = makeParticipation({
  Item: FDFS,
  Participant: FDFSParticipant,
  ref: 'fdfs',
  dateField: 'releaseDate',
  joinReason: 'FDFS_JOIN',
  attendReason: 'FDFS_ATTEND',
});

const POPULATE = [
  { path: 'city', select: 'name slug' },
  { path: 'state', select: 'name slug' },
  { path: 'country', select: 'name code' },
  { path: 'fanClub', select: 'name slug logo status admin' },
  { path: 'organizer', select: 'fullName username profilePhoto' },
];

export const canManageFdfs = (user, f) =>
  Boolean(user && f && (idEq(f.organizer, user._id) || canModerateCity(user, f.city) || (f.fanClub?.admin && idEq(f.fanClub.admin, user._id))));

async function loadManageable(user, id) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid FDFS');
  const f = await FDFS.findById(id).populate('fanClub', 'admin name slug').populate('city', 'name slug');
  if (!f) throw ApiError.notFound('FDFS not found');
  if (!canManageFdfs(user, { ...f.toObject(), city: f.city?._id })) throw ApiError.forbidden('You cannot manage this FDFS');
  return f;
}

export async function createFdfs(user, data) {
  const club = await FanClub.findById(data.fanClub).populate('city', 'name').lean();
  if (!club) throw ApiError.badRequest('Fan club not found');
  if (!canManageClub(user, { ...club, city: club.city._id })) throw ApiError.forbidden('You do not manage this fan club');
  if (club.status !== 'APPROVED') throw ApiError.badRequest('Only verified fan clubs can organise FDFS');

  const fdfs = await FDFS.create({
    ...data,
    fanClub: club._id,
    city: club.city._id,
    state: club.state,
    country: club.country,
    organizer: user._id,
    status: data.status || 'UPCOMING',
    whatsappGroupLink: data.whatsappGroupLink || club.eventDefaults?.whatsappGroupLink,
    slug: await uniqueSlug(FDFS, `${data.movie}-${club.city.name}`),
    checkInCode: randomToken(12),
  });

  if (fdfs.status === 'UPCOMING') {
    const [members, cityMembers] = await Promise.all([
      FanClubMember.find({ fanClub: club._id, status: 'ACTIVE' }).select('user').lean(),
      CityMembership.find({ city: club.city._id }).select('user').limit(5000).lean(),
    ]);
    notifyUsers(
      [...members, ...cityMembers].map((m) => m.user),
      {
        type: 'FDFS',
        title: `New FDFS announced in ${club.city.name}`,
        message: `${fdfs.movie} FDFS by ${club.name}. Registrations are ${fdfs.registrationOpen ? 'open' : 'coming soon'}.`,
        link: `/fdfs/${fdfs.slug}`,
      },
      { excludeUserId: user._id }
    );
  }
  return fdfs;
}

export async function listFdfs(q) {
  const { city, citySlug, state, country, movie, fanClub, when = 'upcoming', featured, skip, limit } = q;
  const filter = {};
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  if (when === 'past') {
    filter.releaseDate = { $lt: startOfToday };
    filter.status = { $ne: 'DRAFT' };
  } else if (when === 'all') filter.status = { $ne: 'DRAFT' };
  else {
    filter.status = { $in: ['UPCOMING', 'ONGOING'] };
    filter.releaseDate = { $gte: startOfToday };
  }
  if (city && isObjectId(city)) filter.city = city;
  if (citySlug) filter.city = (await City.findOne({ slug: citySlug }).select('_id').lean())?._id ?? null;
  if (state && isObjectId(state)) filter.state = state;
  if (country && isObjectId(country)) filter.country = country;
  if (fanClub && isObjectId(fanClub)) filter.fanClub = fanClub;
  if (movie) filter.movie = { $regex: escapeRegex(movie), $options: 'i' };
  if (featured === 'true') filter.featured = true;

  const [items, total, movies] = await Promise.all([
    FDFS.find(filter)
      .sort(when === 'past' ? { releaseDate: -1 } : { featured: -1, releaseDate: 1 })
      .skip(skip)
      .limit(limit)
      .populate(POPULATE)
      .select('-whatsappGroupLink -instructions')
      .lean(),
    FDFS.countDocuments(filter),
    FDFS.distinct('movie', { status: { $in: ['UPCOMING', 'ONGOING'] } }),
  ]);
  return { items: items.map(({ fanClub, ...f }) => ({ ...f, fanClub: fanClub && { _id: fanClub._id, name: fanClub.name, slug: fanClub.slug, logo: fanClub.logo } })), total, movies };
}

export async function getFdfsBySlug(slug, viewer) {
  const f = await FDFS.findOne({ slug: String(slug).toLowerCase() }).populate(POPULATE).lean();
  if (!f) throw ApiError.notFound('FDFS not found');
  const canManage = canManageFdfs(viewer, { ...f, city: f.city?._id });
  if (f.status === 'DRAFT' && !canManage) throw ApiError.notFound('FDFS not found');
  const myStatus = await fdfsParticipation.myStatus(f._id, viewer?._id);
  const registered = ['INTERESTED', 'GOING', 'ATTENDED'].includes(myStatus);
  const announcements = await Announcement.find({ status: 'PUBLISHED', target: 'FDFS', fdfs: f._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title body createdAt')
    .lean();
  return {
    ...f,
    fanClub: f.fanClub && { _id: f.fanClub._id, name: f.fanClub.name, slug: f.fanClub.slug, logo: f.fanClub.logo, isVerified: f.fanClub.status === 'APPROVED' },
    whatsappGroupLink: canManage || registered ? f.whatsappGroupLink : undefined,
    hasWhatsappGroup: Boolean(f.whatsappGroupLink),
    myStatus,
    canManage,
    registration: fdfsParticipation.registrationState(f),
    announcements,
  };
}

const DETAIL_FIELDS = { theatre: 'theatre', theatreAddress: 'theatre', showTime: 'show time', meetingPoint: 'meeting point', meetingTime: 'meeting time', releaseDate: 'date' };

export async function updateFdfs(user, id, data) {
  const f = await loadManageable(user, id);
  const changed = [...new Set(Object.keys(DETAIL_FIELDS).filter((k) => data[k] !== undefined && String(data[k]) !== String(f[k] ?? '')).map((k) => DETAIL_FIELDS[k]))];
  const regChanged = data.registrationOpen !== undefined && data.registrationOpen !== f.registrationOpen;
  const wasCancelled = f.status === 'CANCELLED';
  Object.entries(data).forEach(([k, v]) => f.set(k, v === '' ? undefined : v));
  await f.save();

  const participants = await fdfsParticipation.participantIds(f._id);
  if (!wasCancelled && f.status === 'CANCELLED') {
    notifyUsers(participants, { type: 'FDFS', title: `${f.movie} FDFS cancelled`, message: `The ${f.city.name} FDFS was cancelled by the organiser.`, link: `/fdfs/${f.slug}` });
  } else if (changed.length) {
    notifyUsers(participants, {
      type: 'FDFS',
      title: `${f.movie} FDFS ${changed.join(', ')} updated`,
      message: `Check the latest ${changed.join(', ')} details for ${f.city.name}.`,
      link: `/fdfs/${f.slug}`,
    });
  } else if (regChanged && f.registrationOpen) {
    const members = await FanClubMember.find({ fanClub: f.fanClub._id, status: 'ACTIVE' }).select('user').lean();
    notifyUsers(members.map((m) => m.user), {
      type: 'FDFS',
      title: `${f.movie} FDFS registrations are now open`,
      message: `Join ${f.fanClub.name} for the ${f.city.name} FDFS.`,
      link: `/fdfs/${f.slug}`,
    });
  }
  return f;
}

export const joinFdfs = (user, id, status) => {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid FDFS');
  return fdfsParticipation.setStatus(user, id, status);
};

export async function listParticipants(user, id, q) {
  await loadManageable(user, id);
  return fdfsParticipation.listParticipants(id, q);
}

export async function markParticipantAttended(user, id, userId) {
  await loadManageable(user, id);
  return fdfsParticipation.markAttended(id, userId);
}

export async function getCheckIn(user, id, regenerate) {
  const f = await loadManageable(user, id);
  return { code: await fdfsParticipation.getCheckInCode(f._id, regenerate), slug: f.slug, id: f._id };
}

export const checkIn = (user, id, code) => fdfsParticipation.checkIn(user, id, code);

export async function managedFdfs(user, { fanClub, skip = 0, limit = 50 }) {
  const filter = {};
  if (fanClub) {
    const club = await FanClub.findById(fanClub).lean();
    if (!canManageClub(user, club)) throw ApiError.forbidden();
    filter.fanClub = fanClub;
  } else if (!isSuperAdmin(user)) {
    const clubs = await FanClub.find({ admin: user._id }).select('_id').lean();
    filter.$or = [{ organizer: user._id }, { fanClub: { $in: clubs.map((c) => c._id) } }];
  }
  const [items, total] = await Promise.all([
    FDFS.find(filter).sort({ releaseDate: -1 }).skip(skip).limit(limit).populate(POPULATE).lean(),
    FDFS.countDocuments(filter),
  ]);
  return { items, total };
}
