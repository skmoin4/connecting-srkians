import { http, unwrap } from './client.js';

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const get = (url, params) => unwrap(http.get(url, { params: clean(params) }));
const post = (url, body) => unwrap(http.post(url, body));
const patch = (url, body) => unwrap(http.patch(url, body));
const del = (url, body) => unwrap(http.delete(url, { data: body }));

export const authApi = {
  register: (b) => post('/auth/register', b),
  login: (b) => post('/auth/login', b),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  forgot: (b) => post('/auth/forgot-password', b),
  reset: (b) => post('/auth/reset-password', b),
  verifyEmail: (b) => post('/auth/verify-email', b),
  resendVerification: () => post('/auth/resend-verification'),
  changePassword: (b) => post('/auth/change-password', b),
  deleteAccount: (b) => del('/users/me', b),
};

export const userApi = {
  profile: (username) => get(`/users/${username}`),
  update: (b) => patch('/users/me', b),
  updateLocation: (b) => patch('/users/me/location', b),
  updatePrivacy: (b) => patch('/users/me/privacy', b),
  updateNotificationPrefs: (b) => patch('/users/me/notification-preferences', b),
  myFanClubs: () => get('/users/me/fan-clubs'),
  myRegistrations: () => get('/users/me/registrations'),
  myBadges: () => get('/users/me/badges'),
  myReferrals: () => get('/users/me/referrals'),
  myContactRequests: () => get('/users/me/contact-requests'),
};

export const locationApi = {
  countries: () => get('/countries'),
  states: (country) => get('/states', { country }),
  cities: (params) => get('/cities', params),
  search: (q) => get('/cities/search', { q }),
  city: (slug) => get(`/cities/${slug}`),
  join: (id) => post(`/cities/${id}/join`),
};

export const fanClubApi = {
  list: (params) => get('/fan-clubs', params),
  get: (slug) => get(`/fan-clubs/${slug}`),
  apply: (b) => post('/fan-clubs/apply', b),
  update: (id, b) => patch(`/fan-clubs/${id}`, b),
  join: (id) => post(`/fan-clubs/${id}/join`),
  leave: (id) => del(`/fan-clubs/${id}/leave`),
  contact: (id, b) => post(`/fan-clubs/${id}/contact`, b),
  // manager
  managed: () => get('/fan-club/managed'),
  dashboard: (id) => get(`/fan-club/${id}/dashboard`),
  members: (id, params) => get(`/fan-club/${id}/members`, params),
  memberAction: (id, memberId, action) => patch(`/fan-club/${id}/members/${memberId}`, { action }),
  contactRequests: (params) => get('/fan-club/contact-requests', params),
  updateContactRequest: (id, b) => patch(`/fan-club/contact-requests/${id}`, b),
  events: (params) => get('/fan-club/events', params),
  fdfs: (params) => get('/fan-club/fdfs', params),
  announcements: (params) => get('/fan-club/announcements', params),
};

export const networkApi = {
  directory: (params) => get('/network/directory', params),
  collaborations: (params) => get('/network/collaborations', params),
  send: (b) => post('/network/collaborations', b),
  respond: (id, b) => patch(`/network/collaborations/${id}`, b),
};

export const eventApi = {
  list: (params) => get('/events', params),
  get: (slug) => get(`/events/${slug}`),
  create: (b) => post('/events', b),
  update: (id, b) => patch(`/events/${id}`, b),
  attendance: (id, status) => post(`/events/${id}/attendance`, { status }),
  attendees: (id, params) => get(`/events/${id}/attendees`, params),
  markAttended: (id, userId) => post(`/events/${id}/attendees/${userId}/attended`),
  checkInCode: (id, regenerate) => get(`/events/${id}/check-in-code`, { regenerate }),
  checkIn: (id, code) => post(`/events/${id}/check-in`, { code }),
};

export const fdfsApi = {
  list: (params) => get('/fdfs', params),
  get: (slug) => get(`/fdfs/${slug}`),
  create: (b) => post('/fdfs', b),
  update: (id, b) => patch(`/fdfs/${id}`, b),
  join: (id, status) => post(`/fdfs/${id}/join`, { status }),
  participants: (id, params) => get(`/fdfs/${id}/participants`, params),
  markAttended: (id, userId) => post(`/fdfs/${id}/participants/${userId}/attended`),
  checkInCode: (id, regenerate) => get(`/fdfs/${id}/check-in-code`, { regenerate }),
  checkIn: (id, code) => post(`/fdfs/${id}/check-in`, { code }),
};

export const notificationApi = {
  list: (params) => get('/notifications', params),
  unread: () => get('/notifications/unread-count'),
  read: (id) => patch(`/notifications/${id}/read`),
  readAll: () => patch('/notifications/read-all'),
  remove: (id) => del(`/notifications/${id}`),
};

export const announcementApi = {
  list: (params) => get('/announcements', params),
  create: (b) => post('/announcements', b),
  update: (id, b) => patch(`/announcements/${id}`, b),
  remove: (id) => del(`/announcements/${id}`),
};

export const communityApi = {
  stats: () => get('/stats'),
  discover: () => get('/discover'),
  search: (params) => get('/search', params),
  suggestions: (q) => get('/search/suggestions', { q }),
  leaderboard: (params) => get('/leaderboard', params),
  badges: () => get('/badges'),
  settings: () => get('/settings/public'),
  report: (b) => post('/reports', b),
  referralClick: (code) => post('/referrals/click', { code }),
};

export const uploadApi = {
  image: (file, folder) => {
    const fd = new FormData();
    fd.append('image', file);
    return unwrap(http.post('/uploads/image', fd, { params: { folder }, headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};

export const adminApi = {
  dashboard: () => get('/admin/dashboard'),
  analytics: (params) => get('/admin/analytics', params),
  users: (params) => get('/admin/users', params),
  user: (id) => get(`/admin/users/${id}`),
  updateUser: (id, b) => patch(`/admin/users/${id}`, b),
  deleteUser: (id) => del(`/admin/users/${id}`),
  awardPoints: (id, b) => post(`/admin/users/${id}/points`, b),
  moderators: () => get('/admin/moderators'),
  fanClubs: (params) => get('/admin/fan-clubs', params),
  fanClubStatus: (id, b) => patch(`/admin/fan-clubs/${id}/status`, b),
  patchFanClub: (id, b) => patch(`/admin/fan-clubs/${id}`, b),
  locations: (kind, params) => get(`/admin/${kind}`, params),
  createLocation: (kind, b) => post(`/admin/${kind}`, b),
  updateLocation: (kind, id, b) => patch(`/admin/${kind}/${id}`, b),
  deleteLocation: (kind, id) => del(`/admin/${kind}/${id}`),
  events: (params) => get('/admin/events', params),
  patchEvent: (id, b) => patch(`/admin/events/${id}`, b),
  fdfs: (params) => get('/admin/fdfs', params),
  patchFdfs: (id, b) => patch(`/admin/fdfs/${id}`, b),
  reports: (params) => get('/admin/reports', params),
  updateReport: (id, b) => patch(`/admin/reports/${id}`, b),
  auditLogs: (params) => get('/admin/audit-logs', params),
  badges: () => get('/admin/badges'),
  createBadge: (b) => post('/admin/badges', b),
  updateBadge: (id, b) => patch(`/admin/badges/${id}`, b),
  awardBadge: (id, userId) => post(`/admin/badges/${id}/award`, { userId }),
  settings: () => get('/admin/settings'),
  updateSettings: (b) => patch('/admin/settings', b),
};
