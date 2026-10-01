import { City, Event, EventAttendee, FanClub, FanClubMember, CityMembership, Announcement } from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, idEq, isObjectId, randomToken, uniqueSlug } from '../utils/helpers.js';
import { canModerateCity, isSuperAdmin } from '../middleware/rbac.js';
import { resolveLocation } from './location.service.js';
import { canManageClub } from './fanClub.service.js';
import { makeParticipation } from './participation.service.js';
import { notifyUsers } from './notification.service.js';

export const eventParticipation = makeParticipation({
  Item: Event,
  Participant: EventAttendee,
  ref: 'event',
  dateField: 'date',
  joinReason: 'JOIN_EVENT',
  attendReason: 'ATTEND_EVENT',
});

const LIST_POPULATE = [
  { path: 'city', select: 'name slug' },
  { path: 'state', select: 'name slug' },
  { path: 'country', select: 'name code' },
  { path: 'fanClub', select: 'name slug logo status' },
  { path: 'organizer', select: 'fullName username profilePhoto' },
];

export const canManageEvent = (user, event) =>
  Boolean(
    user &&
      event &&
      (idEq(event.organizer, user._id) ||
        canModerateCity(user, event.city) ||
        (event.fanClub && event.fanClub.admin && idEq(event.fanClub.admin, user._id)))
  );

async function loadManageable(user, id) {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid event');
  const event = await Event.findById(id).populate('fanClub', 'admin name slug');
  if (!event) throw ApiError.notFound('Event not found');
  if (!canManageEvent(user, event)) throw ApiError.forbidden('You cannot manage this event');
  return event;
}

/** Users to notify about a new event: the club's members, else the city's community. */
async function audienceFor(event) {
  if (event.fanClub) {
    const rows = await FanClubMember.find({ fanClub: event.fanClub._id ?? event.fanClub, status: 'ACTIVE' }).select('user').lean();
    return rows.map((r) => r.user);
  }
  const rows = await CityMembership.find({ city: event.city }).select('user').limit(5000).lean();
  return rows.map((r) => r.user);
}

export async function createEvent(user, data) {
  let club = null;
  if (data.fanClub) {
    club = await FanClub.findById(data.fanClub).lean();
    if (!club) throw ApiError.badRequest('Fan club not found');
    if (!canManageClub(user, club)) throw ApiError.forbidden('You do not manage this fan club');
    if (club.status !== 'APPROVED') throw ApiError.badRequest('Only verified fan clubs can create events');
  } else if (!isSuperAdmin(user) && !canModerateCity(user, data.city)) {
    throw ApiError.forbidden('Events must be organised by a verified fan club');
  }
  const loc = await resolveLocation(data.city);
  const event = await Event.create({
    ...data,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    fanClub: club?._id,
    organizer: user._id,
    status: data.status || 'UPCOMING',
    slug: await uniqueSlug(Event, `${data.title}-${loc.cityDoc.name}`),
    checkInCode: randomToken(12),
  });

  if (event.status === 'UPCOMING') {
    notifyUsers(
      await audienceFor(event),
      {
        type: 'EVENT',
        title: club ? `New event by ${club.name}` : `New event in ${loc.cityDoc.name}`,
        message: `${event.title} — ${event.date.toDateString()}`,
        link: `/events/${event.slug}`,
      },
      { excludeUserId: user._id }
    );
  }
  return event;
}

export async function listEvents(q, viewer) {
  const { city, citySlug, state, country, eventType, fanClub, from, to, when = 'upcoming', search, featured, skip, limit } = q;
  const filter = {};
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  if (when === 'past') {
    filter.status = { $in: ['COMPLETED', 'ONGOING', 'UPCOMING'] };
    filter.date = { $lt: startOfToday };
  } else if (when === 'all') {
    filter.status = { $ne: 'DRAFT' };
  } else {
    filter.status = { $in: ['UPCOMING', 'ONGOING'] };
    filter.date = { $gte: startOfToday };
  }
  if (city && isObjectId(city)) filter.city = city;
  if (citySlug) filter.city = (await City.findOne({ slug: citySlug }).select('_id').lean())?._id ?? null;
  if (state && isObjectId(state)) filter.state = state;
  if (country && isObjectId(country)) filter.country = country;
  if (fanClub && isObjectId(fanClub)) filter.fanClub = fanClub;
  if (eventType) filter.eventType = eventType;
  if (featured === 'true') filter.featured = true;
  if (from || to) {
    filter.date = { ...(filter.date || {}) };
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

  const sort = when === 'past' ? { date: -1 } : { featured: -1, date: 1 };
  const [items, total] = await Promise.all([
    Event.find(filter).sort(sort).skip(skip).limit(limit).populate(LIST_POPULATE).select('-whatsappGroupLink -contactInfo').lean(),
    Event.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getEventBySlug(slug, viewer) {
  const event = await Event.findOne({ slug: String(slug).toLowerCase() })
    .populate([...LIST_POPULATE.filter((p) => p.path !== 'fanClub'), { path: 'fanClub', select: 'name slug logo status admin' }])
    .lean();
  if (!event) throw ApiError.notFound('Event not found');
  const canManage = canManageEvent(viewer, event);
  if (event.status === 'DRAFT' && !canManage) throw ApiError.notFound('Event not found');

  const myStatus = await eventParticipation.myStatus(event._id, viewer?._id);
  const registered = ['INTERESTED', 'GOING', 'ATTENDED'].includes(myStatus);
  const announcements = await Announcement.find({ status: 'PUBLISHED', target: 'EVENT', event: event._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title body createdAt')
    .lean();

  // WhatsApp group is shared only with registered attendees and organisers.
  const out = { ...event, whatsappGroupLink: canManage || registered ? event.whatsappGroupLink : undefined };
  out.hasWhatsappGroup = Boolean(event.whatsappGroupLink);
  if (out.fanClub) out.fanClub = { _id: out.fanClub._id, name: out.fanClub.name, slug: out.fanClub.slug, logo: out.fanClub.logo, isVerified: out.fanClub.status === 'APPROVED' };
  return { ...out, myStatus, canManage, registration: eventParticipation.registrationState(event), announcements };
}

const NOTIFY_ON_CHANGE = ['date', 'startTime', 'venue', 'address'];

export async function updateEvent(user, id, data) {
  const event = await loadManageable(user, id);
  const changed = NOTIFY_ON_CHANGE.filter((k) => data[k] !== undefined && String(data[k]) !== String(event[k] ?? ''));
  const wasCancelled = event.status === 'CANCELLED';
  if (data.title && data.title !== event.title) event.slug = await uniqueSlug(Event, `${data.title}`, event._id);
  Object.entries(data).forEach(([k, v]) => event.set(k, v === '' ? undefined : v));
  await event.save();

  const ids = await eventParticipation.participantIds(event._id);
  if (!wasCancelled && event.status === 'CANCELLED') {
    notifyUsers(ids, { type: 'EVENT', title: `Event cancelled: ${event.title}`, message: 'The organiser cancelled this event.', link: `/events/${event.slug}` });
  } else if (changed.length) {
    notifyUsers(ids, { type: 'EVENT', title: `${event.title} was updated`, message: `Updated: ${changed.join(', ')}`, link: `/events/${event.slug}` });
  }
  return event;
}

export const setAttendance = async (user, id, status) => {
  if (!isObjectId(id)) throw ApiError.badRequest('Invalid event');
  return eventParticipation.setStatus(user, id, status);
};

export async function listAttendees(user, id, q) {
  await loadManageable(user, id);
  return eventParticipation.listParticipants(id, q);
}

export async function markAttendeeAttended(user, id, userId) {
  await loadManageable(user, id);
  return eventParticipation.markAttended(id, userId);
}

export async function getCheckIn(user, id, regenerate) {
  const event = await loadManageable(user, id);
  return { code: await eventParticipation.getCheckInCode(event._id, regenerate), slug: event.slug, id: event._id };
}

export const checkIn = (user, id, code) => eventParticipation.checkIn(user, id, code);

/** Events the user can manage (dashboard listing). */
export async function managedEvents(user, { fanClub, skip = 0, limit = 50 }) {
  const filter = {};
  if (fanClub) {
    const club = await FanClub.findById(fanClub).lean();
    if (!canManageClub(user, club)) throw ApiError.forbidden();
    filter.fanClub = fanClub;
  } else if (user.role === ROLES.SUPER_ADMIN) {
    // all
  } else {
    const clubs = await FanClub.find({ admin: user._id }).select('_id').lean();
    filter.$or = [{ organizer: user._id }, { fanClub: { $in: clubs.map((c) => c._id) } }];
  }
  const [items, total] = await Promise.all([
    Event.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate(LIST_POPULATE).lean(),
    Event.countDocuments(filter),
  ]);
  return { items, total };
}

/** iCalendar export for "Add to calendar". */
export function toICS(event) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const start = new Date(event.date);
  if (event.startTime) {
    const [h, m] = event.startTime.split(':').map(Number);
    start.setHours(h, m, 0, 0);
  }
  const end = new Date(start);
  if (event.endTime) {
    const [h, m] = event.endTime.split(':').map(Number);
    end.setHours(h, m, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
  } else end.setHours(end.getHours() + 3);
  const esc = (s = '') => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SRKians//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event._id}@srkians`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc((event.description || '').slice(0, 500))}`,
    `LOCATION:${esc([event.venue, event.address].filter(Boolean).join(', ') || 'To Be Announced')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
