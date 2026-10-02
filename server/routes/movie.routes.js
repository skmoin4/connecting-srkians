import { Router } from 'express';
import * as mv from '../controllers/movie.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS } from '../constants/roles.js';
import {
  createMomentSchema,
  createMovieSchema,
  fdfsFromMovieSchema,
  updateMomentSchema,
  updateMovieSchema,
} from '../validators/movie.validator.js';

const manage = [authenticate, requirePermission(PERMISSIONS.MOVIE_MANAGE)];

const movies = Router();
movies.get('/', mv.list);
movies.get('/countdown', mv.countdown);
// Any verified club admin can open their city's FDFS from a film; the service checks they manage it.
movies.post('/fdfs', authenticate, requirePermission(PERMISSIONS.FDFS_CREATE), writeLimiter, validate(fdfsFromMovieSchema), mv.createFdfs);
movies.post('/', ...manage, validate(createMovieSchema), mv.create);
movies.patch('/:id', ...manage, validate(updateMovieSchema), mv.update);
movies.delete('/:id', ...manage, mv.remove);
movies.post('/:id/invite-organisers', ...manage, mv.inviteOrganisers);
// Last, so it can't shadow /countdown or /fdfs.
movies.get('/:slug', mv.getBySlug);

const moments = Router();
moments.get('/', mv.listMoments);
moments.get('/live', mv.liveMoments);
moments.get('/all', ...manage, mv.allMoments);
moments.post('/', ...manage, validate(createMomentSchema), mv.createMoment);
moments.patch('/:id', ...manage, validate(updateMomentSchema), mv.updateMoment);
moments.delete('/:id', ...manage, mv.deleteMoment);

export { movies as movieRoutes, moments as momentRoutes };
