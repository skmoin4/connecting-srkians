import mongoose from 'mongoose';
import { City, Country, Event, FanClub, FanClubMember, FDFS, State, User, UserPoints } from '../models/index.js';
import { escapeRegex, isObjectId } from '../utils/helpers.js';

/** Homepage statistics — every number is a live database count. */
export async function platformStats() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [srkians, cities, states, countries, fanClubs, upcomingEvents, upcomingFdfs] = await Promise.all([
    User.countDocuments({ status: 'ACTIVE' }),
    City.countDocuments({ status: 'ACTIVE' }),
    State.countDocuments({ status: 'ACTIVE' }),
    Country.countDocuments({ status: 'ACTIVE' }),
    FanClub.countDocuments({ status: 'APPROVED' }),
    Event.countDocuments({ status: { $in: ['UPCOMING', 'ONGOING'] }, date: { $gte: today } }),
    FDFS.countDocuments({ status: { $in: ['UPCOMING', 'ONGOING'] }, releaseDate: { $gte: today } }),
  ]);
  return { srkians, cities, states, countries, fanClubs, upcomingEvents, upcomingFdfs };
}

export async function discover(viewer) {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const cityPop = [{ path: 'state', select: 'name slug' }, { path: 'country', select: 'name code' }];
  const [popularCities, newCities, featuredClubs, events, fdfs] = await Promise.all([
    City.find({ status: 'ACTIVE' }).sort({ featured: -1, memberCount: -1 }).limit(8).populate(cityPop).select('-announcement').lean(),
    City.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(6).populate(cityPop).select('-announcement').lean(),
    FanClub.find({ status: 'APPROVED' })
      .sort({ featured: -1, memberCount: -1 })
      .limit(8)
      .populate('city', 'name slug')
      .populate('state', 'name')
      .select('name slug logo coverImage memberCount city state featured status')
      .lean(),
    Event.find({ status: { $in: ['UPCOMING', 'ONGOING'] }, date: { $gte: today } })
      .sort({ featured: -1, date: 1 })
      .limit(6)
      .populate('city', 'name slug')
      .populate('fanClub', 'name slug')
      .select('title slug date startTime venue eventType coverImage counts city fanClub status')
      .lean(),
    FDFS.find({ status: { $in: ['UPCOMING', 'ONGOING'] }, releaseDate: { $gte: today } })
      .sort({ featured: -1, releaseDate: 1 })
      .limit(6)
      .populate('city', 'name slug')
      .populate('fanClub', 'name slug')
      .select('movie slug releaseDate theatre showTime poster counts city fanClub status')
      .lean(),
  ]);

  // Fan clubs in the viewer's city first, then the rest of their state.
  let nearYou = [];
  if (viewer?.state) {
    nearYou = await FanClub.find({ status: 'APPROVED', state: viewer.state })
      .populate('city', 'name slug')
      .select('name slug logo memberCount city status')
      .limit(30)
      .lean();
    nearYou = nearYou
      .sort((a, b) => (String(b.city?._id) === String(viewer.city)) - (String(a.city?._id) === String(viewer.city)) || b.memberCount - a.memberCount)
      .slice(0, 8);
  }
  const mark = (c) => ({ ...c, isVerified: c.status === 'APPROVED' });
  return { popularCities, newCities, featuredClubs: featuredClubs.map(mark), events, fdfs, nearYou: nearYou.map(mark) };
}

/** Global search across cities, fan clubs, public users, events and FDFS. */
export async function globalSearch({ q, type, page = 1, limit = 10 }) {
  const term = String(q || '').trim();
  if (term.length < 2) return { cities: [], fanClubs: [], users: [], events: [], fdfs: [], total: 0 };
  const rx = { $regex: escapeRegex(term), $options: 'i' };
  const skip = (page - 1) * limit;
  const want = (t) => !type || type === 'all' || type === t;

  const tasks = {
    cities: want('cities')
      ? City.find({ status: 'ACTIVE', name: rx }).sort({ memberCount: -1 }).skip(skip).limit(limit).populate('state', 'name').populate('country', 'name code').select('name slug state country memberCount fanClubCount').lean()
      : [],
    fanClubs: want('fanClubs')
      ? FanClub.find({ status: 'APPROVED', name: rx }).sort({ memberCount: -1 }).skip(skip).limit(limit).populate('city', 'name slug').select('name slug logo city memberCount status').lean()
      : [],
    users: want('users')
      ? User.find({ status: 'ACTIVE', 'privacy.publicProfile': true, $or: [{ fullName: rx }, { username: rx }] })
          .skip(skip)
          .limit(limit)
          .select('fullName username profilePhoto')
          .lean()
      : [],
    events: want('events')
      ? Event.find({ status: { $in: ['UPCOMING', 'ONGOING', 'COMPLETED'] }, title: rx }).sort({ date: -1 }).skip(skip).limit(limit).populate('city', 'name slug').select('title slug date eventType city status').lean()
      : [],
    fdfs: want('fdfs')
      ? FDFS.find({ status: { $ne: 'DRAFT' }, $or: [{ movie: rx }, { theatre: rx }] }).sort({ releaseDate: -1 }).skip(skip).limit(limit).populate('city', 'name slug').populate('fanClub', 'name').select('movie slug releaseDate city fanClub status').lean()
      : [],
  };
  const keys = Object.keys(tasks);
  const results = await Promise.all(Object.values(tasks));
  const out = Object.fromEntries(keys.map((k, i) => [k, results[i]]));
  out.fanClubs = out.fanClubs.map((c) => ({ ...c, isVerified: true }));
  out.total = results.reduce((s, r) => s + r.length, 0);
  return out;
}

/** Quick suggestions for the header search box. */
export async function suggestions(q) {
  const term = String(q || '').trim();
  if (term.length < 1) return [];
  const rx = { $regex: `^${escapeRegex(term)}`, $options: 'i' };
  const [cities, clubs, fdfs] = await Promise.all([
    City.find({ status: 'ACTIVE', name: rx }).limit(4).populate('state', 'name').select('name slug state').lean(),
    FanClub.find({ status: 'APPROVED', name: { $regex: escapeRegex(term), $options: 'i' } }).limit(4).select('name slug').lean(),
    FDFS.find({ status: { $in: ['UPCOMING', 'ONGOING'] }, movie: rx }).limit(3).populate('city', 'name').select('movie slug city').lean(),
  ]);
  return [
    ...cities.map((c) => ({ type: 'city', label: c.name, sub: c.state?.name, href: `/cities/${c.slug}` })),
    ...clubs.map((c) => ({ type: 'fanClub', label: c.name, sub: 'Fan club', href: `/fan-clubs/${c.slug}` })),
    ...fdfs.map((f) => ({ type: 'fdfs', label: `${f.movie} FDFS`, sub: f.city?.name, href: `/fdfs/${f.slug}` })),
  ];
}

export async function leaderboard({ scope = 'global', id, skip = 0, limit = 50 }) {
  const filter = { total: { $gt: 0 } };
  if (scope === 'country' && isObjectId(id)) filter.country = new mongoose.Types.ObjectId(id);
  if (scope === 'state' && isObjectId(id)) filter.state = new mongoose.Types.ObjectId(id);
  if (scope === 'city' && isObjectId(id)) filter.city = new mongoose.Types.ObjectId(id);
  if (scope === 'fanClub' && isObjectId(id)) {
    const members = await FanClubMember.find({ fanClub: id, status: 'ACTIVE' }).select('user').lean();
    filter.user = { $in: members.map((m) => m.user) };
  }
  const [rows, total] = await Promise.all([
    UserPoints.find(filter)
      .sort({ total: -1, updatedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'fullName username profilePhoto status privacy city', populate: { path: 'city', select: 'name slug' } })
      .lean(),
    UserPoints.countDocuments(filter),
  ]);
  const items = rows
    .filter((r) => r.user && r.user.status === 'ACTIVE')
    .map((r, i) => {
      const priv = r.user.privacy?.publicProfile !== false;
      return {
        rank: skip + i + 1,
        points: r.total,
        user: priv
          ? { _id: r.user._id, fullName: r.user.fullName, username: r.user.username, profilePhoto: r.user.profilePhoto, city: r.user.privacy?.showCity !== false ? r.user.city : undefined }
          : { fullName: 'Private SRKian' },
      };
    });
  return { items, total };
}
