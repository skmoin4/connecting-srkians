import * as adminService from '../services/admin.service.js';
import * as locationService from '../services/location.service.js';
import * as reportService from '../services/report.service.js';
import { changeFanClubStatus } from '../services/fanClub.service.js';
import { awardBadgeManually } from '../services/badge.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { eventParticipation } from '../services/event.service.js';
import { fdfsParticipation } from '../services/fdfs.service.js';
import { notifyUsers } from '../services/notification.service.js';
import { audit } from '../services/audit.service.js';
import { Event, FDFS } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';

const page = (req, opts) => parsePagination(req.query, { defaultLimit: 25, maxLimit: 100, ...opts });

export const dashboard = asyncHandler(async (req, res) => ok(res, await adminService.dashboard(req.user)));
export const analytics = asyncHandler(async (req, res) => ok(res, await adminService.analytics(req.user, req.query)));

// ---- Users ----
export const listUsers = asyncHandler(async (req, res) => {
  const p = page(req);
  const { items, total } = await adminService.listUsers({ ...req.query, ...p });
  paginated(res, { items, total, page: p.page, limit: p.limit });
});
export const getUser = asyncHandler(async (req, res) => ok(res, { user: await adminService.getUser(req.params.id) }));
export const updateUser = asyncHandler(async (req, res) => {
  const { user, changes } = await adminService.updateUser(req.user, req.params.id, req.body);
  audit(req, { action: 'USER_UPDATE', description: `Updated @${user.username}`, targetType: 'User', targetId: user._id, metadata: changes });
  ok(res, { user }, 'User updated');
});
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await adminService.deleteUser(req.user, req.params.id);
  audit(req, { action: 'USER_DELETE', description: `Deleted user ${req.params.id}`, targetType: 'User', targetId: user._id });
  ok(res, {}, 'User deleted');
});
export const awardPoints = asyncHandler(async (req, res) => {
  const result = await adminService.awardAdminPoints(req.user, req.params.id, req.body);
  audit(req, { action: 'POINTS_AWARD', description: `Awarded ${req.body.points} points`, targetType: 'User', targetId: req.params.id, metadata: req.body });
  ok(res, result, 'Points awarded');
});
export const moderators = asyncHandler(async (_req, res) => ok(res, { items: await adminService.listModerators() }));

// ---- Fan clubs ----
export const listFanClubs = asyncHandler(async (req, res) => {
  const p = page(req);
  const { items, total } = await adminService.listFanClubsAdmin(req.user, { ...req.query, ...p });
  paginated(res, { items, total, page: p.page, limit: p.limit });
});
export const fanClubStatus = asyncHandler(async (req, res) => {
  const club = await changeFanClubStatus(req.user, req.params.id, req.body);
  audit(req, {
    action: `FANCLUB_${req.body.action}`,
    description: `${req.user.username} ${req.body.action.toLowerCase().replace('_', ' ')} ${club.name}`,
    targetType: 'FanClub',
    targetId: club._id,
    metadata: { note: req.body.note, status: club.status },
  });
  ok(res, { fanClub: club }, `Fan club ${club.status.toLowerCase().replace('_', ' ')}`);
});
export const patchFanClub = asyncHandler(async (req, res) => {
  const club = await adminService.featureFanClub(req.user, req.params.id, req.body.featured);
  audit(req, { action: 'FANCLUB_FEATURE', description: `${club.featured ? 'Featured' : 'Unfeatured'} ${club.name}`, targetType: 'FanClub', targetId: club._id });
  ok(res, { fanClub: club }, 'Fan club updated');
});

// ---- Locations ----
const kindOf = (req) => req.params.kind;
export const listLocations = asyncHandler(async (req, res) => {
  const p = page(req, { maxLimit: 200 });
  const { items, total } = await locationService.adminListLocations(kindOf(req), { ...req.query, ...p });
  paginated(res, { items, total, page: p.page, limit: p.limit });
});
export const createLocation = (kind) =>
  asyncHandler(async (req, res) => {
    const fn = { countries: locationService.createCountry, states: locationService.createState, cities: locationService.createCity }[kind];
    const doc = await fn(req.body);
    audit(req, { action: 'LOCATION_CREATE', description: `Created ${kind.slice(0, -1)} ${doc.name}`, targetType: kind, targetId: doc._id });
    created(res, { item: doc }, 'Created');
  });
export const updateLocation = (kind) =>
  asyncHandler(async (req, res) => {
    const doc = await locationService.updateLocation(kind, req.params.id, req.body);
    audit(req, { action: 'LOCATION_UPDATE', description: `Updated ${doc.name}`, targetType: kind, targetId: doc._id, metadata: req.body });
    ok(res, { item: doc }, 'Updated');
  });
export const deleteLocation = (kind) =>
  asyncHandler(async (req, res) => {
    const result = await locationService.deleteOrDisableLocation(kind, req.params.id);
    audit(req, { action: result.archived ? 'LOCATION_DISABLE' : 'LOCATION_DELETE', targetType: kind, targetId: req.params.id });
    ok(res, result, result.archived ? 'Location has linked data, so it was disabled instead of deleted' : 'Deleted');
  });

// ---- Events & FDFS ----
const eventLike = (Model, label) => ({
  list: asyncHandler(async (req, res) => {
    const p = page(req);
    const { items, total } = await adminService.listEventsAdmin(req.user, Model, { ...req.query, ...p });
    paginated(res, { items, total, page: p.page, limit: p.limit });
  }),
  patch: asyncHandler(async (req, res) => {
    const { doc, cancelledNow } = await adminService.patchEventAdmin(req.user, Model, req.params.id, req.body);
    const name = doc.title || `${doc.movie} FDFS`;
    if (cancelledNow) {
      const participation = Model === FDFS ? fdfsParticipation : eventParticipation;
      notifyUsers(await participation.participantIds(doc._id), {
        type: Model === FDFS ? 'FDFS' : 'EVENT',
        title: `${name} was cancelled`,
        message: 'This listing was cancelled by the platform moderators.',
        link: `/${Model === FDFS ? 'fdfs' : 'events'}/${doc.slug}`,
      });
    }
    audit(req, { action: `${label}_UPDATE`, description: `Updated ${name}`, targetType: label, targetId: doc._id, metadata: req.body });
    ok(res, { item: doc }, 'Updated');
  }),
});
export const events = eventLike(Event, 'EVENT');
export const fdfs = eventLike(FDFS, 'FDFS');

// ---- Reports ----
export const listReports = asyncHandler(async (req, res) => {
  const p = page(req);
  const { items, total } = await reportService.listReports(req.user, { ...req.query, ...p });
  paginated(res, { items, total, page: p.page, limit: p.limit });
});
export const updateReport = asyncHandler(async (req, res) => {
  const report = await reportService.updateReport(req.user, req.params.id, req.body);
  audit(req, { action: 'REPORT_UPDATE', description: `Report ${report.status.toLowerCase()} — ${report.targetLabel}`, targetType: 'Report', targetId: report._id, metadata: req.body });
  ok(res, { report }, 'Report updated');
});

// ---- Audit logs ----
export const auditLogs = asyncHandler(async (req, res) => {
  const p = page(req, { defaultLimit: 50 });
  const { items, total } = await adminService.listAuditLogs({ ...req.query, ...p });
  paginated(res, { items, total, page: p.page, limit: p.limit });
});

// ---- Badges ----
export const listBadges = asyncHandler(async (_req, res) => ok(res, { items: await adminService.listBadges() }));
export const createBadge = asyncHandler(async (req, res) => {
  const b = await adminService.createBadge(req.body);
  audit(req, { action: 'BADGE_CREATE', description: `Created badge ${b.name}`, targetType: 'Badge', targetId: b._id });
  created(res, { badge: b });
});
export const updateBadge = asyncHandler(async (req, res) => {
  const b = await adminService.updateBadge(req.params.id, req.body);
  audit(req, { action: 'BADGE_UPDATE', description: `Updated badge ${b.name}`, targetType: 'Badge', targetId: b._id });
  ok(res, { badge: b });
});
export const awardBadge = asyncHandler(async (req, res) => {
  await awardBadgeManually(req.body.userId, req.params.id, req.user._id);
  audit(req, { action: 'BADGE_AWARD', targetType: 'Badge', targetId: req.params.id, metadata: { userId: req.body.userId } });
  ok(res, {}, 'Badge awarded');
});

// ---- Settings ----
export const getSettingsCtrl = asyncHandler(async (_req, res) => ok(res, { settings: await getSettings() }));
export const updateSettingsCtrl = asyncHandler(async (req, res) => {
  const settings = await updateSettings(req.body);
  audit(req, { action: 'SETTINGS_UPDATE', description: 'Updated site settings', targetType: 'SiteSetting', metadata: { fields: Object.keys(req.body) } });
  ok(res, { settings }, 'Settings saved');
});
