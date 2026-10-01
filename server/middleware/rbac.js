import { ApiError } from '../utils/ApiError.js';
import { hasPermission, ROLES } from '../constants/roles.js';

/** Allows only the listed roles. SUPER_ADMIN always passes. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === ROLES.SUPER_ADMIN || roles.includes(req.user.role)) return next();
    return next(ApiError.forbidden());
  };

/** Permission-based guard driven by constants/roles.js ROLE_PERMISSIONS. */
export const requirePermission =
  (...permissions) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const allowed = permissions.every((p) => hasPermission(req.user.role, p));
    return allowed ? next() : next(ApiError.forbidden());
  };

export const isSuperAdmin = (user) => user?.role === ROLES.SUPER_ADMIN;

/** True when the user moderates the given city (or is a super admin). */
export const canModerateCity = (user, cityId) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (![ROLES.CITY_MODERATOR, ROLES.STATE_ADMIN, ROLES.COUNTRY_ADMIN].includes(user.role)) return false;
  return (user.moderatedCities || []).some((c) => String(c) === String(cityId?._id ?? cityId));
};

/** Mongo filter restricting a moderator to their assigned cities. Empty for super admins. */
export const cityScopeFilter = (user, field = 'city') =>
  isSuperAdmin(user) ? {} : { [field]: { $in: user.moderatedCities || [] } };
