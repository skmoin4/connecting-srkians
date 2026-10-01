import * as userService from '../services/user.service.js';
import { myMemberships, myContactRequests } from '../services/fanClub.service.js';
import { userBadges } from '../services/badge.service.js';
import { pointsHistory } from '../services/points.service.js';
import { referralStats } from '../services/referral.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';

export const getProfile = asyncHandler(async (req, res) => ok(res, { profile: await userService.getPublicProfile(req.params.username, req.user) }));

export const updateMe = asyncHandler(async (req, res) => ok(res, { user: await userService.updateProfile(req.user._id, req.body) }, 'Profile updated'));

export const updateLocation = asyncHandler(async (req, res) =>
  ok(res, { user: await userService.updateLocation(req.user._id, req.body) }, 'Your city has been updated')
);

export const updatePrivacy = asyncHandler(async (req, res) => ok(res, { user: await userService.updatePrivacy(req.user._id, req.body) }, 'Privacy settings saved'));

export const updateNotificationPrefs = asyncHandler(async (req, res) =>
  ok(res, { user: await userService.updateNotificationPrefs(req.user._id, req.body) }, 'Notification preferences saved')
);

export const addFcmToken = asyncHandler(async (req, res) => {
  await userService.addFcmToken(req.user._id, req.body.token);
  ok(res, {}, 'Device registered for push notifications');
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  await userService.removeFcmToken(req.user._id, req.body.token);
  ok(res, {}, 'Device removed');
});

export const myFanClubs = asyncHandler(async (req, res) => ok(res, { memberships: await myMemberships(req.user._id) }));

export const myRegistrations = asyncHandler(async (req, res) => ok(res, await userService.myRegistrations(req.user._id)));

export const myBadges = asyncHandler(async (req, res) => {
  const [badges, history] = await Promise.all([userBadges(req.user._id), pointsHistory(req.user._id)]);
  ok(res, { badges, history });
});

export const myReferrals = asyncHandler(async (req, res) => ok(res, await referralStats(req.user._id)));

export const myContacts = asyncHandler(async (req, res) => ok(res, { requests: await myContactRequests(req.user._id) }));
