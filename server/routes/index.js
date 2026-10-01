import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import cityRoutes, { countryRoutes, stateRoutes } from './location.routes.js';
import { fanClubRoutes, fanClubManagerRoutes, networkRoutes } from './fanClub.routes.js';
import { eventRoutes, fdfsRoutes } from './event.routes.js';
import adminRoutes from './admin.routes.js';
import * as misc from '../controllers/misc.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS } from '../constants/roles.js';
import { announcementSchema, announcementUpdateSchema, reportSchema } from '../validators/misc.validator.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ success: true, message: 'OK', data: { uptime: process.uptime() } }));

api.use('/auth', authRoutes);
api.use('/users', userRoutes);
api.use('/countries', countryRoutes);
api.use('/states', stateRoutes);
api.use('/cities', cityRoutes);
api.use('/fan-clubs', fanClubRoutes);
api.use('/fan-club', fanClubManagerRoutes);
api.use('/network', networkRoutes);
api.use('/events', eventRoutes);
api.use('/fdfs', fdfsRoutes);
api.use('/admin', adminRoutes);

// Notifications
api.get('/notifications', authenticate, misc.listNotifications);
api.get('/notifications/unread-count', authenticate, misc.unreadCount);
api.patch('/notifications/read-all', authenticate, misc.markAllRead);
api.patch('/notifications/:id/read', authenticate, misc.markRead);
api.delete('/notifications/:id', authenticate, misc.deleteNotification);

// Announcements
api.get('/announcements', optionalAuth, misc.listAnnouncements);
api.post('/announcements', authenticate, requirePermission(PERMISSIONS.ANNOUNCEMENT_CREATE), validate(announcementSchema), misc.createAnnouncement);
api.patch('/announcements/:id', authenticate, validate(announcementUpdateSchema), misc.updateAnnouncement);
api.delete('/announcements/:id', authenticate, misc.deleteAnnouncement);

// Reports
api.post('/reports', authenticate, writeLimiter, requirePermission(PERMISSIONS.REPORT_CREATE), validate(reportSchema), misc.createReport);

// Community / discovery
api.get('/stats', misc.stats);
api.get('/discover', optionalAuth, misc.discover);
api.get('/search', misc.search);
api.get('/search/suggestions', misc.suggestions);
api.get('/leaderboard', misc.leaderboard);
api.get('/badges', misc.badges);
api.get('/settings/public', misc.settings);
api.post('/referrals/click', writeLimiter, misc.referralClick);

// Uploads (authenticated; validated MIME/extension/size/magic bytes)
api.post('/uploads/image', authenticate, writeLimiter, uploadImage('image'), misc.upload);

export default api;
