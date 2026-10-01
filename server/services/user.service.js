import { EventAttendee, FanClubMember, FDFSParticipant, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { idEq } from '../utils/helpers.js';
import { awardPoints } from './points.service.js';
import { userBadges } from './badge.service.js';
import { joinCity, resolveLocation } from './location.service.js';
import { getMe } from './auth.service.js';
import { deleteImage } from './upload.service.js';

/**
 * Public profile, filtered by the owner's privacy settings. Email, phone, tokens and other
 * private fields are never included.
 */
export async function getPublicProfile(username, viewer) {
  const user = await User.findOne({ username: String(username).toLowerCase(), status: 'ACTIVE' })
    .populate('city', 'name slug')
    .populate('state', 'name slug')
    .populate('country', 'name slug code')
    .lean();
  if (!user) throw ApiError.notFound('Profile not found');

  const isOwner = viewer && idEq(viewer._id, user._id);
  const privacy = user.privacy || {};
  if (!privacy.publicProfile && !isOwner) {
    return { username: user.username, fullName: user.fullName, profilePhoto: user.profilePhoto, isPrivate: true };
  }

  const [memberships, badges, attended, fdfsAttended] = await Promise.all([
    isOwner || privacy.showFanClubs
      ? FanClubMember.find({ user: user._id, status: 'ACTIVE' })
          .populate({ path: 'fanClub', select: 'name slug logo status', match: { status: 'APPROVED' } })
          .lean()
      : [],
    userBadges(user._id),
    isOwner || privacy.showEventAttendance
      ? EventAttendee.find({ user: user._id, status: 'ATTENDED' })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('event', 'title slug date eventType')
          .lean()
      : [],
    isOwner || privacy.showEventAttendance
      ? FDFSParticipant.find({ user: user._id, status: 'ATTENDED' }).populate('fdfs', 'movie slug releaseDate').lean()
      : [],
  ]);

  const showCity = isOwner || privacy.showCity;
  return {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    profilePhoto: user.profilePhoto,
    bio: user.bio,
    favouriteMovie: user.favouriteMovie,
    favouriteDialogue: user.favouriteDialogue,
    instagram: isOwner || privacy.showInstagram ? user.instagram : undefined,
    city: showCity ? user.city : undefined,
    state: showCity ? user.state : undefined,
    country: showCity ? user.country : undefined,
    role: user.role,
    joinedAt: user.createdAt,
    totalPoints: user.totalPoints,
    fanClubs: memberships.filter((m) => m.fanClub).map((m) => m.fanClub),
    badges: badges.map((b) => ({ ...b.badge, awardedAt: b.createdAt })),
    eventsAttended: attended.filter((a) => a.event).map((a) => a.event),
    fdfsAttended: fdfsAttended.filter((a) => a.fdfs).map((a) => a.fdfs),
    isOwner: Boolean(isOwner),
  };
}

export async function updateProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound();
  if (data.profilePhoto !== undefined && user.profilePhoto?.publicId && user.profilePhoto.publicId !== data.profilePhoto?.publicId) {
    deleteImage(user.profilePhoto);
  }
  Object.entries(data).forEach(([k, v]) => user.set(k, v === null ? undefined : v));
  if (!user.profileCompletedAt && user.isProfileComplete()) user.profileCompletedAt = new Date();
  await user.save();
  if (user.profileCompletedAt) await awardPoints(userId, 'PROFILE_COMPLETE', { refId: 'profile', refType: 'User' });
  return getMe(userId);
}

export async function updateLocation(userId, { country, state, city }) {
  await resolveLocation(city, { stateId: state, countryId: country });
  await joinCity(userId, city);
  return getMe(userId);
}

export async function updatePrivacy(userId, privacy) {
  const set = Object.fromEntries(Object.entries(privacy).map(([k, v]) => [`privacy.${k}`, v]));
  await User.updateOne({ _id: userId }, { $set: set });
  return getMe(userId);
}

export async function updateNotificationPrefs(userId, prefs) {
  const set = Object.fromEntries(Object.entries(prefs).map(([k, v]) => [`notificationPreferences.${k}`, v]));
  await User.updateOne({ _id: userId }, { $set: set });
  return getMe(userId);
}

export async function addFcmToken(userId, token) {
  await User.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } });
  // Keep at most 10 device tokens
  await User.updateOne({ _id: userId, 'fcmTokens.10': { $exists: true } }, { $push: { fcmTokens: { $each: [], $slice: -10 } } });
}

export async function removeFcmToken(userId, token) {
  await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
}

/** Dashboard summary for the logged-in user's "My events" page. */
export async function myRegistrations(userId) {
  const [events, fdfs] = await Promise.all([
    EventAttendee.find({ user: userId, status: { $ne: 'CANCELLED' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'event',
        select: 'title slug date startTime venue eventType coverImage status city fanClub',
        populate: [
          { path: 'city', select: 'name slug' },
          { path: 'fanClub', select: 'name slug' },
        ],
      })
      .lean(),
    FDFSParticipant.find({ user: userId, status: { $ne: 'CANCELLED' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: 'fdfs',
        select: 'movie slug releaseDate theatre showTime poster status city fanClub',
        populate: [
          { path: 'city', select: 'name slug' },
          { path: 'fanClub', select: 'name slug' },
        ],
      })
      .lean(),
  ]);
  return {
    events: events.filter((e) => e.event).map((e) => ({ status: e.status, registeredAt: e.createdAt, event: e.event })),
    fdfs: fdfs.filter((f) => f.fdfs).map((f) => ({ status: f.status, registeredAt: f.createdAt, fdfs: f.fdfs })),
  };
}
