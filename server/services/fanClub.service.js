import {
  AdminContactRequest,
  Announcement,
  City,
  Event,
  FanClub,
  FanClubApplication,
  FanClubMember,
  FDFS,
  User,
} from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, idEq, isObjectId, uniqueSlug } from '../utils/helpers.js';
import { canModerateCity, isSuperAdmin } from '../middleware/rbac.js';
import { resolveLocation } from './location.service.js';
import { notifyUser, notifyUsers } from './notification.service.js';
import { awardPoints, revokePoints } from './points.service.js';
import { markReferralSuccessful } from './referral.service.js';
import { evaluateBadges } from './badge.service.js';

const PUBLIC_ADMIN_FIELDS = 'fullName username profilePhoto';

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

export const isClubOwner = (user, club) => Boolean(user && club && idEq(club.admin, user._id));

/** Club admin, a moderator of the club's city, or a super admin. */
export const canManageClub = (user, club) => Boolean(user && club && (isClubOwner(user, club) || canModerateCity(user, club.city)));

export async function getManagedClubOrThrow(user, clubId) {
  if (!isObjectId(clubId)) throw ApiError.badRequest('Invalid fan club');
  const club = await FanClub.findById(clubId);
  if (!club) throw ApiError.notFound('Fan club not found');
  if (!canManageClub(user, club)) throw ApiError.forbidden('You do not manage this fan club');
  return club;
}

// ---------------------------------------------------------------------------
// Serialization — contact privacy is enforced HERE, server-side.
// ---------------------------------------------------------------------------

/**
 * Removes private contact details unless the admin has opted in to show them.
 * Managers (club admin / moderators / super admin) see everything.
 */
export function serializeFanClub(club, viewer) {
  if (!club) return club;
  const c = typeof club.toObject === 'function' ? club.toObject() : { ...club };
  const manager = canManageClub(viewer, c);
  const vis = c.contactVisibility || {};

  if (!manager) {
    if (!vis.showInstagram) delete c.instagram;
    if (!vis.showWhatsApp) delete c.whatsappNumber;
    if (!vis.showPhone) delete c.phone;
    if (!vis.showWhatsAppGroup) delete c.whatsappGroupLink;
    delete c.verificationProof;
    delete c.additionalInfo;
    delete c.reviewNote;
    delete c.eventDefaults;
  }
  delete c.__v;
  c.isVerified = c.status === 'APPROVED';
  c.canManage = manager;
  return c;
}

// ---------------------------------------------------------------------------
// Public directory
// ---------------------------------------------------------------------------

export async function listFanClubs({ country, state, city, citySlug, q, sort, active, featured, skip, limit }, viewer) {
  const filter = { status: 'APPROVED' };
  if (country && isObjectId(country)) filter.country = country;
  if (state && isObjectId(state)) filter.state = state;
  if (city && isObjectId(city)) filter.city = city;
  if (citySlug) {
    const c = await City.findOne({ slug: citySlug }).select('_id').lean();
    filter.city = c?._id ?? null;
  }
  if (featured === 'true') filter.featured = true;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  if (active === 'true') {
    // "Active" = has an upcoming event or FDFS.
    const [evClubs, fdfsClubs] = await Promise.all([
      Event.distinct('fanClub', { status: 'UPCOMING', fanClub: { $ne: null } }),
      FDFS.distinct('fanClub', { status: 'UPCOMING' }),
    ]);
    filter._id = { $in: [...evClubs, ...fdfsClubs] };
  }

  const sortMap = {
    popular: { featured: -1, memberCount: -1, createdAt: -1 },
    newest: { approvedAt: -1, createdAt: -1 },
    largest: { memberCount: -1 },
    alphabetical: { name: 1 },
  };

  const [items, total] = await Promise.all([
    FanClub.find(filter)
      .sort(sortMap[sort] || sortMap.popular)
      .skip(skip)
      .limit(limit)
      .select('-verificationProof -additionalInfo -reviewNote -eventDefaults')
      .populate('city', 'name slug')
      .populate('state', 'name slug')
      .populate('country', 'name slug code')
      .populate('admin', PUBLIC_ADMIN_FIELDS)
      .lean(),
    FanClub.countDocuments(filter),
  ]);

  let memberships = new Map();
  if (viewer) {
    const rows = await FanClubMember.find({ user: viewer._id, fanClub: { $in: items.map((i) => i._id) } }).select('fanClub status').lean();
    memberships = new Map(rows.map((r) => [String(r.fanClub), r.status]));
  }

  return {
    items: items.map((c) => ({ ...serializeFanClub(c, viewer), myMembership: memberships.get(String(c._id)) || null })),
    total,
  };
}

export async function getFanClubBySlug(slug, viewer) {
  const club = await FanClub.findOne({ slug: String(slug).toLowerCase() })
    .populate('city', 'name slug')
    .populate('state', 'name slug')
    .populate('country', 'name slug code')
    .populate('admin', PUBLIC_ADMIN_FIELDS)
    .lean();
  if (!club) throw ApiError.notFound('Fan club not found');
  // Unapproved clubs are visible only to their managers.
  if (club.status !== 'APPROVED' && !canManageClub(viewer, club)) {
    throw ApiError.notFound('Fan club not found');
  }

  const now = new Date(Date.now() - 86400000);
  const [events, fdfs, announcements, membership] = await Promise.all([
    Event.find({ fanClub: club._id, status: { $in: ['UPCOMING', 'ONGOING'] }, date: { $gte: now } })
      .sort({ date: 1 })
      .limit(6)
      .populate('city', 'name slug')
      .select('title slug date startTime venue eventType coverImage counts status city')
      .lean(),
    FDFS.find({ fanClub: club._id, status: { $in: ['UPCOMING', 'ONGOING'] } })
      .sort({ releaseDate: 1 })
      .limit(6)
      .populate('city', 'name slug')
      .select('movie slug releaseDate theatre showTime poster counts status city')
      .lean(),
    Announcement.find({ status: 'PUBLISHED', target: 'FAN_CLUB', fanClub: club._id })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(5)
      .select('title body link createdAt pinned')
      .lean(),
    viewer ? FanClubMember.findOne({ fanClub: club._id, user: viewer._id }).select('status role').lean() : null,
  ]);

  // serializeFanClub handles populated admin/city refs (idEq / canModerateCity accept docs or ids).
  return { ...serializeFanClub(club, viewer), events, fdfs, announcements, myMembership: membership };
}

// ---------------------------------------------------------------------------
// Registration & verification workflow
// ---------------------------------------------------------------------------

async function reviewers(cityId) {
  const users = await User.find({
    status: 'ACTIVE',
    $or: [{ role: ROLES.SUPER_ADMIN }, { role: ROLES.CITY_MODERATOR, moderatedCities: cityId }],
  })
    .select('_id')
    .lean();
  return users.map((u) => u._id);
}

export async function applyFanClub(user, data) {
  const loc = await resolveLocation(data.city, { stateId: data.state, countryId: data.country });

  const pendingCount = await FanClub.countDocuments({ admin: user._id, status: { $in: ['PENDING', 'CHANGES_REQUESTED'] } });
  if (pendingCount >= 3) throw ApiError.badRequest('You already have applications awaiting review.');

  const duplicate = await FanClub.exists({
    city: loc.city,
    name: { $regex: `^${escapeRegex(data.name)}$`, $options: 'i' },
    status: { $ne: 'REJECTED' },
  });
  if (duplicate) throw ApiError.conflict('A fan club with this name already exists in this city');

  const club = await FanClub.create({
    ...data,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    admin: user._id,
    slug: await uniqueSlug(FanClub, data.name),
    status: 'PENDING',
  });
  await FanClubApplication.create({
    fanClub: club._id,
    applicant: user._id,
    city: loc.city,
    status: 'PENDING',
    history: [{ action: 'SUBMIT', status: 'PENDING', by: user._id }],
  });

  notifyUsers(await reviewers(loc.city), {
    type: 'ADMIN',
    title: 'New fan club application',
    message: `${club.name} (${loc.cityDoc.name}) is awaiting verification.`,
    link: '/admin/fan-clubs?status=PENDING',
  });
  notifyUser(user._id, {
    type: 'FAN_CLUB',
    title: 'Application received — Pending verification',
    message: `We will review ${club.name} shortly.`,
    link: '/my-fan-club',
  });
  return serializeFanClub(club, user);
}

const UPDATABLE = [
  'name',
  'description',
  'adminName',
  'logo',
  'coverImage',
  'instagram',
  'whatsappNumber',
  'phone',
  'whatsappGroupLink',
  'telegramLink',
  'website',
  'foundedDate',
  'approxMemberCount',
  'verificationProof',
  'additionalInfo',
  'contactVisibility',
  'membershipType',
  'eventDefaults',
];

export async function updateFanClub(user, clubId, data) {
  const club = await getManagedClubOrThrow(user, clubId);
  if (club.status === 'SUSPENDED' && !isSuperAdmin(user)) throw ApiError.forbidden('This fan club is suspended');
  const renamed = data.name && data.name !== club.name;

  for (const key of UPDATABLE) {
    if (data[key] === undefined) continue;
    if (key === 'contactVisibility' || key === 'eventDefaults') {
      club.set(key, { ...(club[key]?.toObject?.() ?? club[key] ?? {}), ...data[key] });
    } else {
      club.set(key, data[key] === '' ? undefined : data[key]);
    }
  }
  if (renamed) club.slug = await uniqueSlug(FanClub, data.name, club._id);

  // Re-submission after "request changes" puts the club back in the review queue.
  if (club.status === 'CHANGES_REQUESTED' && isClubOwner(user, club)) {
    club.status = 'PENDING';
    await FanClubApplication.updateOne(
      { fanClub: club._id },
      { status: 'PENDING', $push: { history: { action: 'RESUBMIT', status: 'PENDING', by: user._id } } }
    );
    notifyUsers(await reviewers(club.city), {
      type: 'ADMIN',
      title: 'Fan club application updated',
      message: `${club.name} was updated and is ready for review.`,
      link: '/admin/fan-clubs?status=PENDING',
    });
  }
  await club.save();
  return serializeFanClub(club, user);
}

const TRANSITIONS = {
  APPROVE: { from: ['PENDING', 'CHANGES_REQUESTED', 'REJECTED'], to: 'APPROVED' },
  REJECT: { from: ['PENDING', 'CHANGES_REQUESTED'], to: 'REJECTED' },
  REQUEST_CHANGES: { from: ['PENDING'], to: 'CHANGES_REQUESTED' },
  SUSPEND: { from: ['APPROVED'], to: 'SUSPENDED' },
  RESTORE: { from: ['SUSPENDED'], to: 'APPROVED' },
};

const STATUS_MESSAGES = {
  APPROVED: (n) => ({ title: 'Your fan club has been approved!', message: `${n} is now a Verified Fan Club on the platform.` }),
  REJECTED: (n) => ({ title: 'Fan club application not approved', message: `${n} could not be verified.` }),
  CHANGES_REQUESTED: (n) => ({ title: 'Changes requested for your fan club', message: `Please update ${n} and resubmit.` }),
  SUSPENDED: (n) => ({ title: 'Your fan club has been suspended', message: `${n} is temporarily hidden from the directory.` }),
};

/** Moderation workflow. Only super admins and moderators of the club's city may call this. */
export async function changeFanClubStatus(actor, clubId, { action, note }) {
  const club = await FanClub.findById(clubId);
  if (!club) throw ApiError.notFound('Fan club not found');
  if (!canModerateCity(actor, club.city)) throw ApiError.forbidden('You cannot moderate fan clubs in this city');

  const t = TRANSITIONS[action];
  if (!t.from.includes(club.status)) throw ApiError.badRequest(`Cannot ${action.toLowerCase().replace('_', ' ')} a ${club.status.toLowerCase()} fan club`);

  const wasApproved = club.status === 'APPROVED';
  club.status = t.to;
  club.reviewNote = note || undefined;
  if (t.to === 'APPROVED' && !club.approvedAt) club.approvedAt = new Date();
  await club.save();

  const isApproved = club.status === 'APPROVED';
  if (!wasApproved && isApproved) {
    await City.updateOne({ _id: club.city }, { $inc: { fanClubCount: 1 } });
    // Promote the applicant and make them the club's admin member.
    await User.updateOne({ _id: club.admin, role: ROLES.USER }, { role: ROLES.FAN_CLUB_ADMIN });
    const existing = await FanClubMember.findOne({ fanClub: club._id, user: club.admin });
    if (!existing) {
      await FanClubMember.create({ fanClub: club._id, user: club.admin, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() });
      await FanClub.updateOne({ _id: club._id }, { $inc: { memberCount: 1 } });
    } else if (existing.status !== 'ACTIVE' || existing.role !== 'ADMIN') {
      const inc = existing.status === 'ACTIVE' ? 0 : 1;
      existing.set({ role: 'ADMIN', status: 'ACTIVE', joinedAt: existing.joinedAt || new Date() });
      await existing.save();
      if (inc) await FanClub.updateOne({ _id: club._id }, { $inc: { memberCount: 1 } });
    }
  } else if (wasApproved && !isApproved) {
    await City.updateOne({ _id: club.city, fanClubCount: { $gt: 0 } }, { $inc: { fanClubCount: -1 } });
  }

  await FanClubApplication.updateOne(
    { fanClub: club._id },
    { status: club.status, $push: { history: { action, status: club.status, note, by: actor._id } } },
    { upsert: true, setDefaultsOnInsert: true }
  ).catch(() => {});

  const msg = STATUS_MESSAGES[club.status];
  if (msg) {
    const m = msg(club.name);
    notifyUser(club.admin, { type: 'FAN_CLUB', ...m, message: note ? `${m.message} Note: ${note}` : m.message, link: '/my-fan-club' }, { force: true });
  }
  return club;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function joinFanClub(user, clubId) {
  const club = await FanClub.findById(clubId).lean();
  if (!club || club.status !== 'APPROVED') throw ApiError.notFound('Fan club not found');
  if (club.membershipType === 'CLOSED') throw ApiError.forbidden('This fan club is not accepting new members right now');

  const existing = await FanClubMember.findOne({ fanClub: club._id, user: user._id });
  if (existing?.status === 'ACTIVE') throw ApiError.conflict('You are already a member of this fan club');
  if (existing?.status === 'PENDING') throw ApiError.conflict('Your membership request is awaiting approval');
  if (existing?.status === 'REMOVED') throw ApiError.forbidden('You were removed from this fan club. Contact the admin.');

  const status = club.membershipType === 'APPROVAL_REQUIRED' ? 'PENDING' : 'ACTIVE';
  let member;
  if (existing) {
    existing.set({ status, joinedAt: status === 'ACTIVE' ? new Date() : undefined, role: 'MEMBER' });
    member = await existing.save();
  } else {
    member = await FanClubMember.create({ fanClub: club._id, user: user._id, status, joinedAt: status === 'ACTIVE' ? new Date() : undefined });
  }

  if (status === 'ACTIVE') {
    await FanClub.updateOne({ _id: club._id }, { $inc: { memberCount: 1 } });
    await awardPoints(user._id, 'JOIN_VERIFIED_FANCLUB', { refId: String(club._id), refType: 'FanClub' });
    markReferralSuccessful(user._id).catch(() => {});
    evaluateBadges(user._id).catch(() => {});
  }
  notifyUser(club.admin, {
    type: 'FAN_CLUB',
    title: status === 'ACTIVE' ? 'New member joined' : 'New membership request',
    message: `${user.fullName} ${status === 'ACTIVE' ? 'joined' : 'wants to join'} ${club.name}.`,
    link: '/fan-club/members',
  });
  return { status: member.status };
}

export async function leaveFanClub(user, clubId) {
  const club = await FanClub.findById(clubId).lean();
  if (!club) throw ApiError.notFound('Fan club not found');
  if (idEq(club.admin, user._id)) throw ApiError.badRequest('Club admins cannot leave their own fan club');
  const member = await FanClubMember.findOne({ fanClub: clubId, user: user._id, status: { $in: ['ACTIVE', 'PENDING'] } });
  if (!member) throw ApiError.badRequest('You are not a member of this fan club');
  const wasActive = member.status === 'ACTIVE';
  member.status = 'LEFT';
  await member.save();
  if (wasActive) {
    await FanClub.updateOne({ _id: clubId, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
    await revokePoints(user._id, 'JOIN_VERIFIED_FANCLUB', String(clubId));
  }
  return { status: 'LEFT' };
}

export async function listMembers(manager, clubId, { status = 'ACTIVE', q, skip, limit }) {
  const club = await getManagedClubOrThrow(manager, clubId);
  const filter = { fanClub: club._id, status };
  if (q) {
    const users = await User.find({
      $or: [{ fullName: { $regex: escapeRegex(q), $options: 'i' } }, { username: { $regex: escapeRegex(q), $options: 'i' } }],
    })
      .select('_id')
      .limit(500)
      .lean();
    filter.user = { $in: users.map((u) => u._id) };
  }
  const [items, total] = await Promise.all([
    FanClubMember.find(filter)
      .sort({ role: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'fullName username profilePhoto instagram city', populate: { path: 'city', select: 'name' } })
      .lean(),
    FanClubMember.countDocuments(filter),
  ]);
  return { items, total };
}

export async function memberAction(manager, clubId, memberId, action) {
  const club = await getManagedClubOrThrow(manager, clubId);
  const member = await FanClubMember.findOne({ _id: memberId, fanClub: club._id });
  if (!member) throw ApiError.notFound('Member not found');
  if (member.role === 'ADMIN') throw ApiError.badRequest('The club admin cannot be modified here');

  if (action === 'APPROVE') {
    if (member.status !== 'PENDING') throw ApiError.badRequest('Only pending requests can be approved');
    member.set({ status: 'ACTIVE', joinedAt: new Date() });
    await member.save();
    await FanClub.updateOne({ _id: club._id }, { $inc: { memberCount: 1 } });
    await awardPoints(member.user, 'JOIN_VERIFIED_FANCLUB', { refId: String(club._id), refType: 'FanClub' });
    markReferralSuccessful(member.user).catch(() => {});
    notifyUser(member.user, { type: 'FAN_CLUB', title: `Welcome to ${club.name}!`, message: 'Your membership request was approved.', link: `/fan-clubs/${club.slug}` });
  } else if (action === 'REJECT') {
    if (member.status !== 'PENDING') throw ApiError.badRequest('Only pending requests can be rejected');
    member.status = 'REJECTED';
    await member.save();
  } else if (action === 'REMOVE') {
    const wasActive = member.status === 'ACTIVE';
    member.status = 'REMOVED';
    await member.save();
    if (wasActive) {
      await FanClub.updateOne({ _id: club._id, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
      await revokePoints(member.user, 'JOIN_VERIFIED_FANCLUB', String(club._id));
    }
  }
  return member;
}

export async function myMemberships(userId) {
  const rows = await FanClubMember.find({ user: userId, status: { $in: ['ACTIVE', 'PENDING'] } })
    .populate({
      path: 'fanClub',
      select: 'name slug logo coverImage status memberCount city admin',
      populate: [
        { path: 'city', select: 'name slug' },
        { path: 'admin', select: PUBLIC_ADMIN_FIELDS },
      ],
    })
    .lean();
  return rows.filter((r) => r.fanClub).map((r) => ({ status: r.status, role: r.role, joinedAt: r.joinedAt, fanClub: r.fanClub }));
}

export async function managedClubs(user) {
  const clubs = await FanClub.find({ admin: user._id }).populate('city', 'name slug').sort({ createdAt: -1 }).lean();
  const apps = await FanClubApplication.find({ fanClub: { $in: clubs.map((c) => c._id) } }).select('fanClub history').lean();
  const appMap = new Map(apps.map((a) => [String(a.fanClub), a.history]));
  return clubs.map((c) => ({ ...serializeFanClub(c, user), history: appMap.get(String(c._id)) || [] }));
}

// ---------------------------------------------------------------------------
// Contact admin (keeps personal phone numbers private)
// ---------------------------------------------------------------------------

export async function contactAdmin(user, clubId, data) {
  const club = await FanClub.findById(clubId).lean();
  if (!club || club.status !== 'APPROVED') throw ApiError.notFound('Fan club not found');
  const recent = await AdminContactRequest.countDocuments({
    fanClub: clubId,
    fromUser: user._id,
    createdAt: { $gte: new Date(Date.now() - 86400000) },
  });
  if (recent >= 3) throw new ApiError(429, 'You have reached the daily limit for contacting this fan club');

  const request = await AdminContactRequest.create({ ...data, fanClub: clubId, fromUser: user._id });
  notifyUser(club.admin, {
    type: 'CONTACT',
    title: 'New contact request',
    message: `${data.name}: ${data.subject}`,
    link: '/fan-club/contact-requests',
  });
  return request;
}

export async function listContactRequests(manager, { clubId, status, skip, limit }) {
  let clubIds;
  if (clubId) {
    await getManagedClubOrThrow(manager, clubId);
    clubIds = [clubId];
  } else {
    clubIds = (await FanClub.find({ admin: manager._id }).select('_id').lean()).map((c) => c._id);
  }
  const filter = { fanClub: { $in: clubIds } };
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    AdminContactRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUser', 'fullName username profilePhoto')
      .populate('fanClub', 'name slug')
      .lean(),
    AdminContactRequest.countDocuments(filter),
  ]);
  return { items, total };
}

export async function updateContactRequest(manager, id, { status, response }) {
  const reqDoc = await AdminContactRequest.findById(id);
  if (!reqDoc) throw ApiError.notFound('Contact request not found');
  const club = await getManagedClubOrThrow(manager, reqDoc.fanClub);
  if (response) {
    reqDoc.response = response;
    reqDoc.respondedBy = manager._id;
    reqDoc.respondedAt = new Date();
    reqDoc.status = 'RESPONDED';
    notifyUser(reqDoc.fromUser, {
      type: 'CONTACT',
      title: 'Your contact request received a response',
      message: `${club.name}: ${response.slice(0, 140)}`,
      link: '/dashboard?tab=messages',
    });
  }
  if (status) reqDoc.status = status;
  await reqDoc.save();
  return reqDoc;
}

export const myContactRequests = (userId) =>
  AdminContactRequest.find({ fromUser: userId }).sort({ createdAt: -1 }).limit(50).populate('fanClub', 'name slug logo').lean();

// ---------------------------------------------------------------------------
// Club dashboard
// ---------------------------------------------------------------------------

export async function clubDashboard(manager, clubId) {
  const club = await getManagedClubOrThrow(manager, clubId);
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [members, pending, newMembers30, upcomingEvents, upcomingFdfs, openContacts, recentMembers, fdfsGoing, eventGoing] = await Promise.all([
    FanClubMember.countDocuments({ fanClub: club._id, status: 'ACTIVE' }),
    FanClubMember.countDocuments({ fanClub: club._id, status: 'PENDING' }),
    FanClubMember.countDocuments({ fanClub: club._id, status: 'ACTIVE', joinedAt: { $gte: since30 } }),
    Event.find({ fanClub: club._id, status: 'UPCOMING' }).sort({ date: 1 }).limit(5).select('title slug date counts status').lean(),
    FDFS.find({ fanClub: club._id, status: 'UPCOMING' }).sort({ releaseDate: 1 }).limit(5).select('movie slug releaseDate counts status registrationOpen').lean(),
    AdminContactRequest.countDocuments({ fanClub: club._id, status: 'NEW' }),
    FanClubMember.find({ fanClub: club._id, status: 'ACTIVE' })
      .sort({ joinedAt: -1 })
      .limit(8)
      .populate('user', 'fullName username profilePhoto')
      .lean(),
    FDFS.aggregate([{ $match: { fanClub: club._id } }, { $group: { _id: null, going: { $sum: '$counts.going' }, attended: { $sum: '$counts.attended' } } }]),
    Event.aggregate([{ $match: { fanClub: club._id } }, { $group: { _id: null, going: { $sum: '$counts.going' }, attended: { $sum: '$counts.attended' } } }]),
  ]);

  const growth = await FanClubMember.aggregate([
    { $match: { fanClub: club._id, status: 'ACTIVE', joinedAt: { $gte: since30 } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    club: serializeFanClub(club, manager),
    stats: {
      members,
      pendingRequests: pending,
      newMembers30,
      upcomingEvents: upcomingEvents.length,
      upcomingFdfs: upcomingFdfs.length,
      openContactRequests: openContacts,
      fdfsGoing: fdfsGoing[0]?.going || 0,
      fdfsAttended: fdfsGoing[0]?.attended || 0,
      eventGoing: eventGoing[0]?.going || 0,
      eventAttended: eventGoing[0]?.attended || 0,
    },
    upcomingEvents,
    upcomingFdfs,
    recentMembers: recentMembers.filter((m) => m.user),
    growth,
  };
}
