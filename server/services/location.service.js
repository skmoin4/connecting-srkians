import {
  City,
  CityMembership,
  Country,
  Event,
  FanClub,
  FDFS,
  State,
  User,
  Announcement,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, isObjectId, uniqueSlug } from '../utils/helpers.js';
import { canModerateCity } from '../middleware/rbac.js';
import { awardPoints, syncPointsLocation } from './points.service.js';
import { evaluateBadges } from './badge.service.js';

const LOC_FIELDS = 'name slug';

/**
 * Resolves a city id to its full, active City → State → Country chain. Optional expected state /
 * country ids are cross-checked so clients can't submit inconsistent locations.
 */
export async function resolveLocation(cityId, { stateId, countryId, allowDisabled = false } = {}) {
  if (!isObjectId(cityId)) throw ApiError.badRequest('Invalid city');
  const city = await City.findById(cityId).populate('state', 'name slug status').populate('country', 'name slug code status').lean();
  if (!city) throw ApiError.badRequest('City not found');
  if (!allowDisabled && (city.status !== 'ACTIVE' || city.state?.status !== 'ACTIVE' || city.country?.status !== 'ACTIVE')) {
    throw ApiError.badRequest('This city is not currently available');
  }
  if (stateId && String(city.state._id) !== String(stateId)) throw ApiError.badRequest('City does not belong to the selected state');
  if (countryId && String(city.country._id) !== String(countryId)) throw ApiError.badRequest('City does not belong to the selected country');
  return { city: city._id, state: city.state._id, country: city.country._id, cityDoc: city };
}

// ---------- Public reads ----------

export const listCountries = () => Country.find({ status: 'ACTIVE' }).sort({ name: 1 }).select('name code slug').lean();

export function listStates(countryId) {
  const filter = { status: 'ACTIVE' };
  if (countryId && isObjectId(countryId)) filter.country = countryId;
  return State.find(filter).sort({ name: 1 }).select('name slug country').lean();
}

export async function listCities({ country, state, q, featured, sort, skip, limit }) {
  const filter = { status: 'ACTIVE' };
  if (country && isObjectId(country)) filter.country = country;
  if (state && isObjectId(state)) filter.state = state;
  if (featured === 'true') filter.featured = true;
  if (q) filter.name = { $regex: `^${escapeRegex(q)}`, $options: 'i' };

  const sortMap = {
    popular: { memberCount: -1, fanClubCount: -1, name: 1 },
    name: { name: 1 },
    newest: { createdAt: -1 },
  };
  const [items, total] = await Promise.all([
    City.find(filter)
      .sort(sortMap[sort] || sortMap.popular)
      .skip(skip)
      .limit(limit)
      .populate('state', LOC_FIELDS)
      .populate('country', 'name slug code')
      .select('-announcement')
      .lean(),
    City.countDocuments(filter),
  ]);
  return { items, total };
}

/** Autocomplete: prefix match first, then contains match. */
export async function searchCities(q, limit = 8) {
  if (!q || q.trim().length < 1) return [];
  const safe = escapeRegex(q.trim());
  const base = { status: 'ACTIVE' };
  const prefix = await City.find({ ...base, name: { $regex: `^${safe}`, $options: 'i' } })
    .sort({ memberCount: -1 })
    .limit(limit)
    .populate('state', LOC_FIELDS)
    .populate('country', 'name slug code')
    .select('name slug state country memberCount fanClubCount')
    .lean();
  if (prefix.length >= limit) return prefix;
  const contains = await City.find({
    ...base,
    _id: { $nin: prefix.map((c) => c._id) },
    name: { $regex: safe, $options: 'i' },
  })
    .limit(limit - prefix.length)
    .populate('state', LOC_FIELDS)
    .populate('country', 'name slug code')
    .select('name slug state country memberCount fanClubCount')
    .lean();
  return [...prefix, ...contains];
}

export async function getCityBySlug(slug, viewer) {
  const city = await City.findOne({ slug: String(slug).toLowerCase(), status: 'ACTIVE' })
    .populate('state', LOC_FIELDS)
    .populate('country', 'name slug code')
    .lean();
  if (!city) throw ApiError.notFound('City not found');

  const now = new Date();
  const [fanClubs, events, fdfs, moderators, announcements, verifiedCount, upcomingEvents, upcomingFdfs] = await Promise.all([
    FanClub.find({ city: city._id, status: 'APPROVED' })
      .sort({ featured: -1, memberCount: -1 })
      .limit(12)
      .populate('admin', 'fullName username profilePhoto')
      .select('name slug logo coverImage memberCount status featured instagram contactVisibility admin adminName')
      .lean(),
    Event.find({ city: city._id, status: { $in: ['UPCOMING', 'ONGOING'] }, date: { $gte: new Date(now.getTime() - 86400000) } })
      .sort({ date: 1 })
      .limit(6)
      .populate('fanClub', 'name slug')
      .select('title slug date startTime venue eventType coverImage counts fanClub status')
      .lean(),
    FDFS.find({ city: city._id, status: { $in: ['UPCOMING', 'ONGOING'] } })
      .sort({ releaseDate: 1 })
      .limit(6)
      .populate('fanClub', 'name slug')
      .select('movie slug releaseDate theatre showTime poster counts fanClub status')
      .lean(),
    User.find({ role: 'CITY_MODERATOR', moderatedCities: city._id, status: 'ACTIVE' })
      .select('fullName username profilePhoto')
      .limit(10)
      .lean(),
    Announcement.find({ status: 'PUBLISHED', target: 'CITY', city: city._id })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(5)
      .select('title body link createdAt pinned')
      .lean(),
    FanClub.countDocuments({ city: city._id, status: 'APPROVED' }),
    Event.countDocuments({ city: city._id, status: 'UPCOMING' }),
    FDFS.countDocuments({ city: city._id, status: 'UPCOMING' }),
  ]);

  let isMember = false;
  if (viewer) isMember = Boolean(await CityMembership.exists({ user: viewer._id, city: city._id }));

  // The invite link goes to members and city moderators only — a public page would leak it to
  // anyone, and a WhatsApp invite can't be revoked per person once it is out.
  const canSeeGroup = isMember || canModerateCity(viewer, city._id);
  const { whatsappGroupLink, ...publicCity } = city;

  return {
    city: { ...publicCity, whatsappGroupLink: canSeeGroup ? whatsappGroupLink : undefined, hasWhatsappGroup: Boolean(whatsappGroupLink) },
    stats: {
      members: city.memberCount,
      fanClubs: verifiedCount,
      upcomingEvents,
      upcomingFdfs,
    },
    fanClubs: fanClubs.map(({ contactVisibility, instagram, ...c }) => ({
      ...c,
      instagram: contactVisibility?.showInstagram ? instagram : undefined,
      isVerified: c.status === 'APPROVED',
    })),
    events,
    fdfs,
    moderators,
    announcements,
    isMember,
  };
}

// ---------- City membership ----------

/** Sets the user's primary city (joining its community). Maintains city member counters. */
export async function joinCity(userId, cityId) {
  const loc = await resolveLocation(cityId);
  const existing = await CityMembership.findOne({ user: userId }).lean();
  if (existing && String(existing.city) === String(loc.city)) {
    return { alreadyMember: true, city: loc.cityDoc, whatsappGroupLink: loc.cityDoc.whatsappGroupLink };
  }
  if (existing) {
    await CityMembership.updateOne({ _id: existing._id }, { city: loc.city, joinedAt: new Date() });
    await City.updateOne({ _id: existing.city, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
  } else {
    await CityMembership.create({ user: userId, city: loc.city });
  }
  await City.updateOne({ _id: loc.city }, { $inc: { memberCount: 1 } });
  const user = await User.findByIdAndUpdate(userId, { city: loc.city, state: loc.state, country: loc.country }, { new: true }).lean();
  await syncPointsLocation(user);
  await awardPoints(userId, 'JOIN_CITY', { refId: 'first-city', refType: 'City' });
  evaluateBadges(userId).catch(() => {});
  return { alreadyMember: false, city: loc.cityDoc, whatsappGroupLink: loc.cityDoc.whatsappGroupLink };
}

export async function leaveCityMembership(userId) {
  const existing = await CityMembership.findOneAndDelete({ user: userId }).lean();
  if (existing) await City.updateOne({ _id: existing.city, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
}

// ---------- Admin management ----------

export async function adminListLocations(kind, { q, status, country, state, skip, limit }) {
  const Model = { countries: Country, states: State, cities: City }[kind];
  const filter = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (status) filter.status = status;
  if (country && isObjectId(country) && kind !== 'countries') filter.country = country;
  if (state && isObjectId(state) && kind === 'cities') filter.state = state;
  let query = Model.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  if (kind !== 'countries') query = query.populate('country', 'name code');
  if (kind === 'cities') query = query.populate('state', 'name');
  const [items, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);
  return { items, total };
}

export async function createCountry(data) {
  const slug = await uniqueSlug(Country, data.name);
  return Country.create({ ...data, slug });
}

export async function createState(data) {
  const country = await Country.findById(data.country).lean();
  if (!country) throw ApiError.badRequest('Country not found');
  const slug = await uniqueSlug(State, `${data.name}-${country.code}`);
  return State.create({ ...data, slug });
}

export async function createCity(data) {
  const state = await State.findById(data.state).lean();
  if (!state) throw ApiError.badRequest('State not found');
  if (await City.exists({ state: state._id, name: { $regex: `^${escapeRegex(data.name)}$`, $options: 'i' } })) {
    throw ApiError.conflict('This city already exists in the selected state');
  }
  const slug = await uniqueSlug(City, data.name);
  return City.create({ ...data, country: state.country, slug });
}

export async function updateLocation(kind, id, data) {
  const Model = { countries: Country, states: State, cities: City }[kind];
  const doc = await Model.findById(id);
  if (!doc) throw ApiError.notFound();
  Object.assign(doc, data);
  await doc.save();
  return doc;
}

/**
 * Locations are never hard-deleted when relational data exists — they are disabled (archived)
 * instead, which hides them from public discovery while keeping history intact.
 */
export async function deleteOrDisableLocation(kind, id) {
  const Model = { countries: Country, states: State, cities: City }[kind];
  const field = { countries: 'country', states: 'state', cities: 'city' }[kind];
  const doc = await Model.findById(id);
  if (!doc) throw ApiError.notFound();
  const refs = await Promise.all([
    User.exists({ [field]: id }),
    FanClub.exists({ [field]: id }),
    Event.exists({ [field]: id }),
    kind !== 'cities' ? City.exists({ [field]: id }) : null,
    kind === 'countries' ? State.exists({ country: id }) : null,
  ]);
  if (refs.some(Boolean)) {
    doc.status = 'DISABLED';
    await doc.save();
    return { archived: true, doc };
  }
  await doc.deleteOne();
  return { deleted: true };
}
