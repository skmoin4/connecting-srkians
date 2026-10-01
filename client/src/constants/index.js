export const ROLES = {
  USER: 'USER',
  FAN_CLUB_ADMIN: 'FAN_CLUB_ADMIN',
  CITY_MODERATOR: 'CITY_MODERATOR',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_LABELS = {
  USER: 'SRKian',
  FAN_CLUB_ADMIN: 'Fan Club Admin',
  CITY_MODERATOR: 'City Moderator',
  STATE_ADMIN: 'State Admin',
  COUNTRY_ADMIN: 'Country Admin',
  SUPER_ADMIN: 'Super Admin',
};

export const EVENT_TYPES = {
  FDFS: 'FDFS',
  FAN_MEET: 'Fan Meet',
  BIRTHDAY_CELEBRATION: 'Birthday Celebration',
  MOVIE_SCREENING: 'Movie Screening',
  CHARITY: 'Charity',
  ONLINE_EVENT: 'Online Event',
  OTHER: 'Other',
};

export const EVENT_STATUS = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

export const REPORT_REASONS = {
  SPAM: 'Spam',
  IMPERSONATION: 'Impersonation',
  SCAM: 'Scam / fraud',
  INCORRECT_INFORMATION: 'Incorrect information',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  COPYRIGHT_CONCERN: 'Copyright concern',
  HARASSMENT: 'Harassment',
  OTHER: 'Other',
};

export const MEMBERSHIP_TYPES = {
  OPEN: 'Open — anyone can join',
  APPROVAL_REQUIRED: 'Approval required',
  CLOSED: 'Closed — not accepting members',
};

export const TBA = 'To Be Announced';

export const VERIFIED_TOOLTIP = 'Verified by the SRKians community platform.';

export const SITE_URL = (import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
