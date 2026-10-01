import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { randomToken, sha256 } from '../utils/helpers.js';
import { ApiError } from '../utils/ApiError.js';

export const REFRESH_COOKIE = 'srk_rt';
const REUSE_GRACE_MS = Number(process.env.REFRESH_REUSE_GRACE_MS ?? 10000);

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
    issuer: 'srkians',
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret, { issuer: 'srkians' });

/** Refresh tokens are opaque random strings; only their SHA-256 hash is stored. */
export async function issueRefreshToken(userId, meta = {}, family = randomToken(16)) {
  const raw = `${randomToken(40)}.${sha256(env.jwt.refreshSecret + userId).slice(0, 12)}`;
  await RefreshToken.create({
    user: userId,
    tokenHash: sha256(raw),
    family,
    expiresAt: new Date(Date.now() + env.jwt.refreshExpiresDays * 86400000),
    userAgent: meta.userAgent?.slice(0, 250),
    ip: meta.ip,
  });
  return raw;
}

/** Rotates a refresh token. Reuse of an already-rotated token revokes the entire family. */
export async function rotateRefreshToken(raw, meta = {}) {
  if (!raw) throw ApiError.unauthorized('No refresh token');
  const doc = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!doc) throw ApiError.unauthorized('Invalid refresh token');

  if (doc.revokedAt) {
    // Concurrent refreshes (two tabs) present the same token within moments of each other. Inside
    // the grace window the browser already holds the newer cookie, so reject without nuking the family.
    const justRotated = doc.replacedBy && Date.now() - doc.revokedAt.getTime() < REUSE_GRACE_MS;
    if (justRotated) throw new ApiError(409, 'Session was just refreshed. Retry with the latest token.');
    await RefreshToken.updateMany({ family: doc.family, revokedAt: null }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Refresh token reuse detected. Please sign in again.');
  }
  if (doc.expiresAt < new Date()) throw ApiError.unauthorized('Refresh token expired');

  const next = await issueRefreshToken(doc.user, meta, doc.family);
  doc.revokedAt = new Date();
  doc.replacedBy = sha256(next);
  await doc.save();
  return { userId: doc.user, refreshToken: next };
}

export async function revokeRefreshToken(raw) {
  if (!raw) return;
  await RefreshToken.updateOne({ tokenHash: sha256(raw), revokedAt: null }, { revokedAt: new Date() });
}

export async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/api/v1/auth',
  maxAge: env.jwt.refreshExpiresDays * 86400000,
});
