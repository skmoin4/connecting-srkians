import * as notificationService from '../services/notification.service.js';
import * as announcementService from '../services/announcement.service.js';
import * as reportService from '../services/report.service.js';
import * as networkService from '../services/network.service.js';
import * as community from '../services/community.service.js';
import { getSettingsCached, publicSettings } from '../services/settings.service.js';
import { uploadImageBuffer } from '../services/upload.service.js';
import { trackReferralClick } from '../services/referral.service.js';
import { Badge, City, Event, FanClub, FDFS, Movie } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

// ---------------- Notifications ----------------
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const r = await notificationService.listNotifications(req.user._id, { page, limit, skip, unreadOnly: req.query.unread === 'true' });
  ok(res, { items: r.items, unread: r.unread, pagination: { page, limit, total: r.total, pages: Math.ceil(r.total / limit) || 1 } });
});
export const unreadCount = asyncHandler(async (req, res) => ok(res, { unread: await notificationService.unreadCount(req.user._id) }));
export const markRead = asyncHandler(async (req, res) => {
  const n = await notificationService.markRead(req.user._id, req.params.id);
  if (!n) throw ApiError.notFound('Notification not found');
  ok(res, { notification: n });
});
export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  ok(res, {}, 'All notifications marked as read');
});
export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user._id, req.params.id);
  ok(res, {}, 'Notification deleted');
});

// ---------------- Announcements ----------------
export const listAnnouncements = asyncHandler(async (req, res) => ok(res, { items: await announcementService.listAnnouncements(req.query, req.user) }));
export const managedAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const { items, total } = await announcementService.managedAnnouncements(req.user, { fanClub: req.query.fanClub, skip, limit });
  paginated(res, { items, total, page, limit });
});
export const createAnnouncement = asyncHandler(async (req, res) =>
  created(res, { announcement: await announcementService.createAnnouncement(req.user, req.body) }, 'Announcement published')
);
export const updateAnnouncement = asyncHandler(async (req, res) =>
  ok(res, { announcement: await announcementService.updateAnnouncement(req.user, req.params.id, req.body) }, 'Announcement updated')
);
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  await announcementService.deleteAnnouncement(req.user, req.params.id);
  ok(res, {}, 'Announcement deleted');
});

// ---------------- Reports ----------------
export const createReport = asyncHandler(async (req, res) => {
  const r = await reportService.createReport(req.user, req.body);
  created(res, { report: { _id: r._id, status: r.status } }, 'Report submitted. Thank you for keeping the community safe.');
});

// ---------------- Admin network ----------------
export const adminDirectory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24 });
  const { items, total } = await networkService.adminDirectory({ ...req.query, skip, limit });
  paginated(res, { items, total, page, limit });
});
export const sendCollaboration = asyncHandler(async (req, res) =>
  created(res, { collaboration: await networkService.sendCollaboration(req.user, req.body) }, 'Collaboration request sent')
);
export const listCollaborations = asyncHandler(async (req, res) =>
  ok(res, { items: await networkService.listCollaborations(req.user, { box: req.query.box, status: req.query.status }) })
);
export const respondCollaboration = asyncHandler(async (req, res) =>
  ok(res, { collaboration: await networkService.respondCollaboration(req.user, req.params.id, req.body) }, 'Collaboration updated')
);

// ---------------- Community ----------------
export const stats = asyncHandler(async (_req, res) => ok(res, await community.platformStats()));
export const discover = asyncHandler(async (req, res) => ok(res, await community.discover(req.user)));
export const search = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 30 });
  ok(res, await community.globalSearch({ q: req.query.q, type: req.query.type, page, limit }));
});
export const suggestions = asyncHandler(async (req, res) => ok(res, { items: await community.suggestions(req.query.q) }));
export const leaderboard = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const { items, total } = await community.leaderboard({ scope: req.query.scope, id: req.query.id, skip, limit });
  paginated(res, { items, total, page, limit });
});
export const cityRace = asyncHandler(async (req, res) => ok(res, await community.cityRace({ limit: req.query.limit })));
export const badges = asyncHandler(async (_req, res) =>
  ok(res, { items: await Badge.find({ active: true }).select('code name description icon tier rule.type rule.threshold').lean() })
);
export const settings = asyncHandler(async (_req, res) => ok(res, { settings: publicSettings(await getSettingsCached()) }));
export const referralClick = asyncHandler(async (req, res) => {
  await trackReferralClick(req.body.code);
  ok(res, {});
});

// ---------------- Uploads ----------------
const FOLDERS = ['avatars', 'fan-clubs', 'events', 'fdfs', 'cities', 'branding', 'verification'];
export const upload = asyncHandler(async (req, res) => {
  const folder = FOLDERS.includes(req.query.folder) ? req.query.folder : 'misc';
  const image = await uploadImageBuffer(req.file, folder);
  created(res, { image }, 'Image uploaded');
});

// ---------------- SEO: sitemap ----------------
export const sitemap = asyncHandler(async (_req, res) => {
  const base = env.clientUrl.split(',')[0].replace(/\/$/, '');
  const [cities, clubs, events, fdfs, movies] = await Promise.all([
    City.find({ status: 'ACTIVE' }).select('slug updatedAt').lean(),
    FanClub.find({ status: 'APPROVED' }).select('slug updatedAt').lean(),
    Event.find({ status: { $in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } }).select('slug updatedAt').limit(5000).lean(),
    FDFS.find({ status: { $in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } }).select('slug updatedAt').limit(5000).lean(),
    Movie.find({ status: { $ne: 'CANCELLED' } }).select('slug updatedAt').limit(500).lean(),
  ]);
  const staticPaths = ['/', '/about', '/discover', '/cities', '/fan-clubs', '/events', '/fdfs', '/movies', '/leaderboard', '/privacy', '/terms', '/community-guidelines', '/copyright', '/contact'];
  const url = (loc, lastmod, priority = '0.6') =>
    `<url><loc>${base}${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}<priority>${priority}</priority></url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticPaths.map((p) => url(p, null, p === '/' ? '1.0' : '0.7')),
    ...cities.map((c) => url(`/cities/${c.slug}`, c.updatedAt, '0.9')),
    ...clubs.map((c) => url(`/fan-clubs/${c.slug}`, c.updatedAt, '0.8')),
    ...events.map((e) => url(`/events/${e.slug}`, e.updatedAt)),
    ...fdfs.map((f) => url(`/fdfs/${f.slug}`, f.updatedAt, '0.8')),
    ...movies.map((m) => url(`/movies/${m.slug}`, m.updatedAt, '0.8')),
    '</urlset>',
  ].join('');
  res.type('application/xml').send(xml);
});
