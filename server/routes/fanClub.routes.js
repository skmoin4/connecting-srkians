import { Router } from 'express';
import * as c from '../controllers/fanClub.controller.js';
import * as misc from '../controllers/misc.controller.js';
import * as ev from '../controllers/event.controller.js';
import * as fd from '../controllers/fdfs.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS } from '../constants/roles.js';
import {
  applyFanClubSchema,
  collaborationSchema,
  collaborationUpdateSchema,
  contactAdminSchema,
  contactUpdateSchema,
  memberActionSchema,
  updateFanClubSchema,
} from '../validators/fanClub.validator.js';

/** Public + member endpoints: /api/v1/fan-clubs */
const pub = Router();
pub.get('/', optionalAuth, c.list);
pub.post('/apply', authenticate, writeLimiter, validate(applyFanClubSchema), c.apply);
pub.get('/:slug', optionalAuth, c.getBySlug);
pub.patch('/:id', authenticate, validate(updateFanClubSchema), c.update); // ownership checked in service
pub.post('/:id/join', authenticate, requirePermission(PERMISSIONS.FANCLUB_JOIN), c.join);
pub.delete('/:id/leave', authenticate, c.leave);
pub.post('/:id/contact', authenticate, writeLimiter, validate(contactAdminSchema), c.contact);

/**
 * Club-manager endpoints: /api/v1/fan-club
 * Role checks here are coarse; per-club ownership is always re-verified in the service layer.
 */
const mgr = Router();
mgr.use(authenticate);
mgr.get('/managed', c.managed); // any user: lists their own applications/clubs
mgr.get('/contact-requests', requirePermission(PERMISSIONS.FANCLUB_MANAGE_OWN), c.contactRequests);
mgr.patch('/contact-requests/:id', requirePermission(PERMISSIONS.FANCLUB_MANAGE_OWN), validate(contactUpdateSchema), c.updateContactRequest);
mgr.get('/events', requirePermission(PERMISSIONS.EVENT_CREATE), ev.managed);
mgr.get('/fdfs', requirePermission(PERMISSIONS.FDFS_CREATE), fd.managed);
mgr.get('/announcements', requirePermission(PERMISSIONS.ANNOUNCEMENT_CREATE), misc.managedAnnouncements);
mgr.get('/:id/dashboard', requirePermission(PERMISSIONS.FANCLUB_MANAGE_OWN), c.dashboard);
mgr.get('/:id/members', requirePermission(PERMISSIONS.FANCLUB_MANAGE_OWN), c.members);
mgr.patch('/:id/members/:memberId', requirePermission(PERMISSIONS.FANCLUB_MANAGE_OWN), validate(memberActionSchema), c.memberAction);

/** Private admin network: /api/v1/network */
const network = Router();
network.use(authenticate, requirePermission(PERMISSIONS.ADMIN_NETWORK_ACCESS));
network.get('/directory', misc.adminDirectory);
network.get('/collaborations', misc.listCollaborations);
network.post('/collaborations', writeLimiter, validate(collaborationSchema), misc.sendCollaboration);
network.patch('/collaborations/:id', validate(collaborationUpdateSchema), misc.respondCollaboration);

export { pub as fanClubRoutes, mgr as fanClubManagerRoutes, network as networkRoutes };
