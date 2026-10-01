import * as fdfsService from '../services/fdfs.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, paginated } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const { items, total, movies } = await fdfsService.listFdfs({ ...req.query, skip, limit });
  ok(res, { items, movies, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

export const getBySlug = asyncHandler(async (req, res) => ok(res, { fdfs: await fdfsService.getFdfsBySlug(req.params.slug, req.user) }));

export const create = asyncHandler(async (req, res) => created(res, { fdfs: await fdfsService.createFdfs(req.user, req.body) }, 'FDFS created'));

export const update = asyncHandler(async (req, res) => ok(res, { fdfs: await fdfsService.updateFdfs(req.user, req.params.id, req.body) }, 'FDFS updated'));

export const join = asyncHandler(async (req, res) => {
  const result = await fdfsService.joinFdfs(req.user, req.params.id, req.body.status);
  const msg = { GOING: "You're in! Get ready for the FDFS.", INTERESTED: 'Marked as interested', CANCELLED: 'Registration cancelled' }[result.status];
  ok(res, result, msg);
});

export const participants = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const result = await fdfsService.listParticipants(req.user, req.params.id, { status: req.query.status, skip, limit });
  ok(res, { ...result, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) || 1 } });
});

export const markAttended = asyncHandler(async (req, res) => {
  await fdfsService.markParticipantAttended(req.user, req.params.id, req.params.userId);
  ok(res, {}, 'Marked as attended');
});

export const checkInCode = asyncHandler(async (req, res) => ok(res, await fdfsService.getCheckIn(req.user, req.params.id, req.query.regenerate === 'true')));

export const checkIn = asyncHandler(async (req, res) => ok(res, await fdfsService.checkIn(req.user, req.params.id, req.body.code), 'Checked in — enjoy the show!'));

export const managed = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const { items, total } = await fdfsService.managedFdfs(req.user, { fanClub: req.query.fanClub, skip, limit });
  paginated(res, { items, total, page, limit });
});
