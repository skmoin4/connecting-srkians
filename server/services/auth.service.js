import { FanClub, FanClubMember, User, UserPoints, EventAttendee, FDFSParticipant, Event, FDFS } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { randomToken, sha256 } from '../utils/helpers.js';
import { resolveLocation, joinCity, leaveCityMembership } from './location.service.js';
import { generateReferralCode, attachReferral } from './referral.service.js';
import { evaluateBadges } from './badge.service.js';
import { sendMail, emailTemplates } from './email.service.js';
import { issueRefreshToken, revokeAllForUser, signAccessToken } from './token.service.js';
import { notifyUser } from './notification.service.js';

const ME_POPULATE = [
  { path: 'city', select: 'name slug' },
  { path: 'state', select: 'name slug' },
  { path: 'country', select: 'name slug code' },
  { path: 'moderatedCities', select: 'name slug' },
];

export async function getMe(userId) {
  const user = await User.findById(userId).populate(ME_POPULATE).lean();
  if (!user) throw ApiError.notFound('User not found');
  delete user.password;
  const managedClubs = await FanClub.find({ admin: userId, status: { $in: ['APPROVED', 'PENDING', 'CHANGES_REQUESTED', 'SUSPENDED'] } })
    .select('name slug status logo')
    .lean();
  return { ...user, managedClubs };
}

async function createSession(user, meta) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id, meta);
  return { accessToken, refreshToken };
}

async function sendVerificationEmail(user) {
  const token = randomToken(32);
  await User.updateOne(
    { _id: user._id },
    { emailVerifyTokenHash: sha256(token), emailVerifyExpires: new Date(Date.now() + 24 * 3600 * 1000) }
  );
  const tpl = emailTemplates.verifyEmail(user.fullName, `${env.clientUrl}/verify-email?token=${token}`);
  await sendMail({ to: user.email, ...tpl });
  return token;
}

export async function register(data, meta) {
  const loc = await resolveLocation(data.city, { stateId: data.state, countryId: data.country });

  const [emailTaken, usernameTaken] = await Promise.all([
    User.exists({ email: data.email }),
    User.exists({ username: data.username }),
  ]);
  if (emailTaken) throw new ApiError(409, 'An account with this email already exists', [{ field: 'email', message: 'Email already registered' }]);
  if (usernameTaken) throw new ApiError(409, 'This username is taken', [{ field: 'username', message: 'Username is taken' }]);

  const user = await User.create({
    fullName: data.fullName,
    username: data.username,
    email: data.email,
    password: data.password,
    bio: data.bio,
    favouriteMovie: data.favouriteMovie,
    favouriteDialogue: data.favouriteDialogue,
    instagram: data.instagram,
    referralCode: await generateReferralCode(data.username),
    lastLoginAt: new Date(),
  });

  await joinCity(user._id, loc.city); // sets location + member count + points
  if (data.referralCode) await attachReferral(user, data.referralCode, meta.ip).catch(() => null);
  await evaluateBadges(user._id).catch(() => {});
  await sendVerificationEmail(user).catch(() => {});
  notifyUser(
    user._id,
    {
      type: 'SYSTEM',
      title: `Welcome to the family, ${user.fullName.split(' ')[0]}!`,
      message: 'Explore your city, find your fan club and never miss an FDFS.',
      link: '/dashboard',
    },
    { force: true }
  );

  const session = await createSession(user, meta);
  return { user: await getMe(user._id), ...session };
}

export async function login({ identifier, password }, meta) {
  const id = identifier.toLowerCase();
  const user = await User.findOne(id.includes('@') ? { email: id } : { username: id }).select('+password');
  // Same message for unknown user and wrong password to prevent account enumeration.
  if (!user || user.status === 'DELETED' || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email/username or password');
  }
  if (user.status === 'SUSPENDED') throw ApiError.forbidden('Your account has been suspended. Contact support.');
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();
  const session = await createSession(user, meta);
  return { user: await getMe(user._id), ...session };
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email, status: 'ACTIVE' });
  // Always respond identically; only send when the account exists.
  if (!user) return;
  const token = randomToken(32);
  user.passwordResetTokenHash = sha256(token);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const tpl = emailTemplates.passwordReset(user.fullName, `${env.clientUrl}/reset-password?token=${token}`);
  await sendMail({ to: user.email, ...tpl });
  return env.isTest ? token : undefined;
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpires: { $gt: new Date() },
    status: 'ACTIVE',
  }).select('+passwordResetTokenHash +passwordResetExpires');
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');
  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  await revokeAllForUser(user._id);
  notifyUser(user._id, { type: 'SYSTEM', title: 'Your password was reset', message: 'If this was not you, contact support immediately.' }, { force: true });
}

export async function verifyEmail(token) {
  const user = await User.findOne({ emailVerifyTokenHash: sha256(token), emailVerifyExpires: { $gt: new Date() } });
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired');
  user.emailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
}

export async function resendVerification(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound();
  if (user.emailVerified) throw ApiError.badRequest('Email is already verified');
  await sendVerificationEmail(user);
}

export async function changePassword(userId, { currentPassword, newPassword }, meta) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  await user.save();
  await revokeAllForUser(user._id);
  return createSession(user, meta);
}

/**
 * Deletes the account by anonymising personal data (keeps referential integrity for events and
 * clubs). Admins of an active fan club must transfer/close it first.
 */
export async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(password))) throw ApiError.badRequest('Password is incorrect');
  if (await FanClub.exists({ admin: userId, status: { $in: ['APPROVED', 'PENDING'] } })) {
    throw ApiError.badRequest('You manage an active fan club. Contact the platform team to transfer ownership before deleting your account.');
  }

  const memberships = await FanClubMember.find({ user: userId, status: 'ACTIVE' }).lean();
  for (const m of memberships) {
    await FanClub.updateOne({ _id: m.fanClub, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
  }
  await FanClubMember.updateMany({ user: userId }, { status: 'LEFT' });

  // Release event/FDFS seats
  const eventRows = await EventAttendee.find({ user: userId, status: { $in: ['INTERESTED', 'GOING'] } }).lean();
  for (const r of eventRows) await Event.updateOne({ _id: r.event }, { $inc: { [`counts.${r.status.toLowerCase()}`]: -1 } });
  await EventAttendee.updateMany({ user: userId, status: { $in: ['INTERESTED', 'GOING'] } }, { status: 'CANCELLED' });
  const fdfsRows = await FDFSParticipant.find({ user: userId, status: { $in: ['INTERESTED', 'GOING'] } }).lean();
  for (const r of fdfsRows) await FDFS.updateOne({ _id: r.fdfs }, { $inc: { [`counts.${r.status.toLowerCase()}`]: -1 } });
  await FDFSParticipant.updateMany({ user: userId, status: { $in: ['INTERESTED', 'GOING'] } }, { status: 'CANCELLED' });

  await leaveCityMembership(userId);
  await UserPoints.deleteOne({ user: userId });
  await revokeAllForUser(userId);

  const suffix = String(user._id);
  user.set({
    status: 'DELETED',
    deletedAt: new Date(),
    fullName: 'Deleted SRKian',
    username: `deleted_${suffix}`,
    email: `deleted_${suffix}@deleted.invalid`,
    password: randomToken(32),
    bio: undefined,
    favouriteMovie: undefined,
    favouriteDialogue: undefined,
    instagram: undefined,
    phone: undefined,
    profilePhoto: undefined,
    fcmTokens: [],
    referralCode: undefined,
    city: undefined,
    state: undefined,
    country: undefined,
    privacy: { publicProfile: false },
  });
  await user.save();
}
