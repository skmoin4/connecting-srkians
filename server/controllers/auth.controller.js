import * as authService from '../services/auth.service.js';
import { REFRESH_COOKIE, refreshCookieOptions, rotateRefreshToken, revokeRefreshToken, signAccessToken } from '../services/token.service.js';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body, meta(req));
  setRefreshCookie(res, refreshToken);
  created(res, { user, accessToken }, 'Welcome to the SRKian family!');
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, meta(req));
  setRefreshCookie(res, refreshToken);
  ok(res, { user, accessToken }, 'Signed in');
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  try {
    const { userId, refreshToken } = await rotateRefreshToken(raw, meta(req));
    const user = await User.findById(userId).select('role status').lean();
    if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Account is not active');
    setRefreshCookie(res, refreshToken);
    ok(res, { accessToken: signAccessToken(user) }, 'Token refreshed');
  } catch (err) {
    if (err.statusCode !== 409) clearRefreshCookie(res); // 409 = benign concurrent refresh
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  ok(res, {}, 'Signed out');
});

export const me = asyncHandler(async (req, res) => ok(res, { user: await authService.getMe(req.user._id) }));

export const forgotPassword = asyncHandler(async (req, res) => {
  const devToken = await authService.forgotPassword(req.body.email);
  ok(res, devToken ? { devToken } : {}, 'If an account exists for that email, a reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ok(res, {}, 'Password updated. Please sign in with your new password.');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  ok(res, {}, 'Email verified');
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user._id);
  ok(res, {}, 'Verification email sent');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.changePassword(req.user._id, req.body, meta(req));
  setRefreshCookie(res, refreshToken);
  ok(res, { accessToken }, 'Password changed. Other sessions were signed out.');
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user._id, req.body.password);
  clearRefreshCookie(res);
  ok(res, {}, 'Your account has been deleted');
});
