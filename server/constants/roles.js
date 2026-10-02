export const ROLES = Object.freeze({
  USER: 'USER',
  FAN_CLUB_ADMIN: 'FAN_CLUB_ADMIN',
  CITY_MODERATOR: 'CITY_MODERATOR',
  // Reserved for future geographic tiers; the RBAC map already accepts them.
  STATE_ADMIN: 'STATE_ADMIN',
  COUNTRY_ADMIN: 'COUNTRY_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

export const ASSIGNABLE_ROLES = [ROLES.USER, ROLES.FAN_CLUB_ADMIN, ROLES.CITY_MODERATOR, ROLES.SUPER_ADMIN];

export const PERMISSIONS = Object.freeze({
  PROFILE_MANAGE: 'profile:manage',
  FANCLUB_JOIN: 'fanclub:join',
  EVENT_JOIN: 'event:join',
  REPORT_CREATE: 'report:create',

  FANCLUB_MANAGE_OWN: 'fanclub:manage_own',
  EVENT_CREATE: 'event:create',
  FDFS_CREATE: 'fdfs:create',
  ANNOUNCEMENT_CREATE: 'announcement:create',
  ADMIN_NETWORK_ACCESS: 'admin_network:access',

  CITY_MODERATE: 'city:moderate',
  REPORT_REVIEW: 'report:review',
  FANCLUB_REVIEW: 'fanclub:review',

  USER_MANAGE: 'user:manage',
  LOCATION_MANAGE: 'location:manage',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_VIEW: 'audit:view',
  ANALYTICS_VIEW: 'analytics:view',
  BADGE_MANAGE: 'badge:manage',
  MOVIE_MANAGE: 'movie:manage',
  POINTS_AWARD: 'points:award',
});

const P = PERMISSIONS;
const USER_PERMS = [P.PROFILE_MANAGE, P.FANCLUB_JOIN, P.EVENT_JOIN, P.REPORT_CREATE];
const CLUB_ADMIN_PERMS = [
  ...USER_PERMS,
  P.FANCLUB_MANAGE_OWN,
  P.EVENT_CREATE,
  P.FDFS_CREATE,
  P.ANNOUNCEMENT_CREATE,
  P.ADMIN_NETWORK_ACCESS,
];
const MODERATOR_PERMS = [...CLUB_ADMIN_PERMS, P.CITY_MODERATE, P.REPORT_REVIEW, P.FANCLUB_REVIEW, P.ANALYTICS_VIEW];

/**
 * Default role → permission mapping. Seeded into the Role collection; the in-memory copy is the
 * authoritative source for request-time checks so authorization never depends on client input.
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: USER_PERMS,
  [ROLES.FAN_CLUB_ADMIN]: CLUB_ADMIN_PERMS,
  [ROLES.CITY_MODERATOR]: MODERATOR_PERMS,
  [ROLES.STATE_ADMIN]: MODERATOR_PERMS,
  [ROLES.COUNTRY_ADMIN]: MODERATOR_PERMS,
  [ROLES.SUPER_ADMIN]: Object.values(P),
});

export const hasPermission = (role, permission) => (ROLE_PERMISSIONS[role] || []).includes(permission);
