export const USER_STATUS = ['ACTIVE', 'SUSPENDED', 'DELETED'];
export const LOCATION_STATUS = ['ACTIVE', 'DISABLED'];

export const FANCLUB_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CHANGES_REQUESTED'];
export const FANCLUB_ACTIONS = ['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND', 'RESTORE'];
export const MEMBERSHIP_TYPES = ['OPEN', 'APPROVAL_REQUIRED', 'CLOSED'];
export const MEMBER_STATUS = ['PENDING', 'ACTIVE', 'REJECTED', 'LEFT', 'REMOVED'];

export const CONTACT_STATUS = ['NEW', 'READ', 'RESPONDED', 'CLOSED'];

export const EVENT_TYPES = [
  'FDFS',
  'FAN_MEET',
  'BIRTHDAY_CELEBRATION',
  'MOVIE_SCREENING',
  'CHARITY',
  'ONLINE_EVENT',
  'OTHER',
];
export const EVENT_STATUS = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
export const ATTENDANCE_STATUS = ['INTERESTED', 'GOING', 'ATTENDED', 'CANCELLED'];

export const NOTIFICATION_TYPES = ['EVENT', 'FDFS', 'FAN_CLUB', 'CONTACT', 'ADMIN', 'SYSTEM', 'ANNOUNCEMENT'];

// Maps notification types to the user preference key that controls them.
export const NOTIFICATION_PREF_KEY = {
  EVENT: 'events',
  FDFS: 'fdfs',
  FAN_CLUB: 'fanClub',
  CONTACT: 'adminMessages',
  ADMIN: 'adminMessages',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'city',
};

export const ANNOUNCEMENT_TARGETS = ['GLOBAL', 'COUNTRY', 'STATE', 'CITY', 'FAN_CLUB', 'EVENT', 'FDFS'];

export const REPORT_TARGETS = ['FAN_CLUB', 'EVENT', 'FDFS', 'USER', 'ADMIN_CONTACT'];
export const REPORT_REASONS = [
  'SPAM',
  'IMPERSONATION',
  'SCAM',
  'INCORRECT_INFORMATION',
  'INAPPROPRIATE_CONTENT',
  'COPYRIGHT_CONCERN',
  'HARASSMENT',
  'OTHER',
];
export const REPORT_STATUS = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

export const COLLAB_STATUS = ['PENDING', 'ACCEPTED', 'REJECTED', 'CLOSED'];

export const REFERRAL_STATUS = ['REGISTERED', 'SUCCESSFUL', 'REJECTED'];

export const BADGE_RULES = [
  'JOINED', // awarded on registration
  'CITY_MEMBER', // joined a specific city (rule.city) or any city
  'FANCLUB_MEMBER',
  'EVENTS_ATTENDED',
  'FDFS_ATTENDED',
  'REFERRALS',
  'POINTS',
  'MANUAL',
];
