import * as fanClubService from '../services/fanClub.service.js';
import { audit } from '../services/audit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const { items, total } = await fanClubService.listFanClubs({ ...req.query, skip, limit }, req.user);
  paginated(res, { items, total, page, limit });
});

export const getBySlug = asyncHandler(async (req, res) => ok(res, { fanClub: await fanClubService.getFanClubBySlug(req.params.slug, req.user) }));

export const apply = asyncHandler(async (req, res) => {
  const club = await fanClubService.applyFanClub(req.user, req.body);
  audit(req, { action: 'FANCLUB_APPLY', description: `${req.user.username} applied for ${club.name}`, targetType: 'FanClub', targetId: club._id });
  created(res, { fanClub: club }, 'Application submitted — pending verification');
});

export const update = asyncHandler(async (req, res) => {
  const club = await fanClubService.updateFanClub(req.user, req.params.id, req.body);
  ok(res, { fanClub: club }, 'Fan club updated');
});

export const join = asyncHandler(async (req, res) => {
  const result = await fanClubService.joinFanClub(req.user, req.params.id);
  ok(res, result, result.status === 'ACTIVE' ? 'Welcome to the club!' : 'Membership request sent to the admin');
});

export const leave = asyncHandler(async (req, res) => ok(res, await fanClubService.leaveFanClub(req.user, req.params.id), 'You left the fan club'));

export const contact = asyncHandler(async (req, res) => {
  const request = await fanClubService.contactAdmin(req.user, req.params.id, req.body);
  created(res, { request: { _id: request._id, status: request.status } }, 'Your message was sent to the fan club admin');
});

// ---- Manager endpoints (/fan-club/...) ----

export const managed = asyncHandler(async (req, res) => ok(res, { clubs: await fanClubService.managedClubs(req.user) }));

export const dashboard = asyncHandler(async (req, res) => ok(res, await fanClubService.clubDashboard(req.user, req.params.id)));

export const members = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const { items, total } = await fanClubService.listMembers(req.user, req.params.id, { status: req.query.status || 'ACTIVE', q: req.query.q, skip, limit });
  paginated(res, { items, total, page, limit });
});

export const memberAction = asyncHandler(async (req, res) => {
  const member = await fanClubService.memberAction(req.user, req.params.id, req.params.memberId, req.body.action);
  ok(res, { member }, 'Member updated');
});

export const contactRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const { items, total } = await fanClubService.listContactRequests(req.user, { clubId: req.query.fanClub, status: req.query.status, skip, limit });
  paginated(res, { items, total, page, limit });
});

export const updateContactRequest = asyncHandler(async (req, res) =>
  ok(res, { request: await fanClubService.updateContactRequest(req.user, req.params.id, req.body) }, 'Contact request updated')
);
