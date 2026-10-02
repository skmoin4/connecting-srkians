import * as movieService from '../services/movie.service.js';
import * as momentService from '../services/moment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';

// ---------------- Movies ----------------
export const list = asyncHandler(async (req, res) => ok(res, { items: await movieService.listMovies(req.query) }));
export const countdown = asyncHandler(async (_req, res) => ok(res, { movie: await movieService.countdownMovie() }));
export const getBySlug = asyncHandler(async (req, res) => ok(res, await movieService.getMovie(req.params.slug)));
export const create = asyncHandler(async (req, res) => created(res, { movie: await movieService.createMovie(req.user, req.body) }, 'Movie added'));
export const update = asyncHandler(async (req, res) => ok(res, { movie: await movieService.updateMovie(req.params.id, req.body) }, 'Movie updated'));
export const remove = asyncHandler(async (req, res) => {
  await movieService.deleteMovie(req.params.id);
  ok(res, {}, 'Movie deleted');
});
export const inviteOrganisers = asyncHandler(async (req, res) => {
  const r = await movieService.inviteFdfsOrganisers(req.params.id, { force: req.query.force === 'true' });
  ok(res, r, r.alreadySent ? 'Organisers were already invited for this film' : `Invited ${r.invited} fan club admins`);
});
export const createFdfs = asyncHandler(async (req, res) =>
  created(res, { fdfs: await movieService.createFdfsFromMovie(req.user, req.body) }, 'FDFS created for your city')
);

// ---------------- Moments ----------------
export const listMoments = asyncHandler(async (_req, res) => ok(res, { items: await momentService.listMoments() }));
export const liveMoments = asyncHandler(async (_req, res) => ok(res, { items: await momentService.liveMoments() }));
export const allMoments = asyncHandler(async (_req, res) => ok(res, { items: await momentService.listMoments({ activeOnly: false }) }));
export const createMoment = asyncHandler(async (req, res) => created(res, { moment: await momentService.createMoment(req.body) }, 'Moment added'));
export const updateMoment = asyncHandler(async (req, res) => ok(res, { moment: await momentService.updateMoment(req.params.id, req.body) }, 'Moment updated'));
export const deleteMoment = asyncHandler(async (req, res) => {
  await momentService.deleteMoment(req.params.id);
  ok(res, {}, 'Moment deleted');
});
