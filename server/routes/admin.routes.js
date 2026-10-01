import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS, ROLES } from '../constants/roles.js';
import { fanClubStatusSchema, adminFanClubPatchSchema } from '../validators/fanClub.validator.js';
import { adminEventPatchSchema } from '../validators/event.validator.js';
import {
  adminUserPatchSchema,
  awardPointsSchema,
  badgeAwardSchema,
  badgeSchema,
  citySchema,
  cityUpdateSchema,
  countrySchema,
  reportUpdateSchema,
  settingsSchema,
  stateSchema,
} from '../validators/misc.validator.js';

const r = Router();
const P = PERMISSIONS;
const superOnly = requireRole(ROLES.SUPER_ADMIN);

// Everyone here must at least be a moderator; super-admin-only routes add `superOnly`.
// Moderators are additionally scoped to their assigned cities inside each service.
r.use(authenticate, requirePermission(P.CITY_MODERATE));

r.get('/dashboard', c.dashboard);
r.get('/analytics', requirePermission(P.ANALYTICS_VIEW), c.analytics);

r.get('/users', superOnly, c.listUsers);
r.get('/users/:id', superOnly, c.getUser);
r.patch('/users/:id', superOnly, validate(adminUserPatchSchema), c.updateUser);
r.delete('/users/:id', superOnly, c.deleteUser);
r.post('/users/:id/points', superOnly, validate(awardPointsSchema), c.awardPoints);
r.get('/moderators', superOnly, c.moderators);

r.get('/fan-clubs', requirePermission(P.FANCLUB_REVIEW), c.listFanClubs);
r.patch('/fan-clubs/:id/status', requirePermission(P.FANCLUB_REVIEW), validate(fanClubStatusSchema), c.fanClubStatus);
r.patch('/fan-clubs/:id', requirePermission(P.FANCLUB_REVIEW), validate(adminFanClubPatchSchema), c.patchFanClub);

// Locations — super admin only
const locSchemas = {
  countries: [countrySchema, countrySchema.partial()],
  states: [stateSchema, stateSchema.partial().omit({ country: true })],
  cities: [citySchema, cityUpdateSchema],
};
for (const [kind, [createSchema, updateSchema]] of Object.entries(locSchemas)) {
  r.get(`/${kind}`, superOnly, (req, _res, next) => ((req.params.kind = kind), next()), c.listLocations);
  r.post(`/${kind}`, superOnly, validate(createSchema), c.createLocation(kind));
  r.patch(`/${kind}/:id`, superOnly, validate(updateSchema), c.updateLocation(kind));
  r.delete(`/${kind}/:id`, superOnly, c.deleteLocation(kind));
}

r.get('/events', c.events.list);
r.patch('/events/:id', validate(adminEventPatchSchema), c.events.patch);
r.get('/fdfs', c.fdfs.list);
r.patch('/fdfs/:id', validate(adminEventPatchSchema), c.fdfs.patch);

r.get('/reports', requirePermission(P.REPORT_REVIEW), c.listReports);
r.patch('/reports/:id', requirePermission(P.REPORT_REVIEW), validate(reportUpdateSchema), c.updateReport);

r.get('/audit-logs', superOnly, c.auditLogs);

r.get('/badges', superOnly, c.listBadges);
r.post('/badges', superOnly, validate(badgeSchema), c.createBadge);
r.patch('/badges/:id', superOnly, validate(badgeSchema.partial()), c.updateBadge);
r.post('/badges/:id/award', superOnly, validate(badgeAwardSchema), c.awardBadge);

r.get('/settings', superOnly, c.getSettingsCtrl);
r.patch('/settings', superOnly, validate(settingsSchema), c.updateSettingsCtrl);

export default r;
