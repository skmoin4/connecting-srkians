import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';

const ACTIVE_TOUCH_MS = 10 * 60 * 1000;

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub)
    .select('fullName username email role status city state country moderatedCities passwordChangedAt lastActiveAt profilePhoto')
    .lean();
  if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Account is not active');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw ApiError.unauthorized('Password was changed. Please sign in again.');
  }

  // Cheap "active users" signal without a write on every request.
  if (!user.lastActiveAt || Date.now() - new Date(user.lastActiveAt).getTime() > ACTIVE_TOUCH_MS) {
    User.updateOne({ _id: user._id }, { lastActiveAt: new Date() }).catch(() => {});
  }
  return user;
}

/** Requires a valid access token. */
export const authenticate = async (req, _res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Attaches req.user when a valid token is present; otherwise continues anonymously. */
export const optionalAuth = async (req, _res, next) => {
  try {
    req.user = (await resolveUser(req)) || null;
  } catch {
    req.user = null;
  }
  next();
};
