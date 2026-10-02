import { z } from 'zod';
import { MOMENT_TYPES, MOVIE_STATUS } from '../constants/enums.js';
import { imageRef, objectId, optionalDate, optionalObjectId, optionalString, optionalUrl } from './common.js';

export const createMovieSchema = z.object({
  title: z.string().trim().min(1).max(120),
  tagline: optionalString(200),
  synopsis: optionalString(3000),
  poster: imageRef,
  banner: imageRef,
  // Optional: films are announced long before a date exists.
  releaseDate: optionalDate,
  trailerUrl: optionalUrl,
  status: z.enum(MOVIE_STATUS).optional(),
  featured: z.boolean().optional(),
});

export const updateMovieSchema = createMovieSchema.partial();

export const fdfsFromMovieSchema = z.object({
  movieId: objectId,
  fanClubId: objectId,
});

export const createMomentSchema = z.object({
  code: z.string().trim().min(2).max(40),
  title: z.string().trim().min(2).max(80),
  subtitle: optionalString(200),
  description: optionalString(1000),
  type: z.enum(MOMENT_TYPES).optional(),
  day: z.coerce.number().int().min(1).max(31),
  month: z.coerce.number().int().min(1).max(12),
  sinceYear: z.coerce.number().int().min(1900).max(2200).optional(),
  windowDays: z.coerce.number().int().min(0).max(15).optional(),
  icon: optionalString(40),
  badge: optionalObjectId,
  movie: optionalObjectId,
  active: z.boolean().optional(),
});

export const updateMomentSchema = createMomentSchema.partial();
