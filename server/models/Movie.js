import mongoose from 'mongoose';
import { imageSchema, ObjectId } from './_shared.js';
import { MOVIE_STATUS } from '../constants/enums.js';

/**
 * An SRK film the platform counts down to. Distinct from FDFS: one Movie is global, while each
 * city's fan club creates its own FDFS listing from it (see `createFdfsFromMovie`).
 *
 * `releaseDate` is optional because a film is often announced long before a date exists — the UI
 * shows "To Be Announced" rather than inventing one, matching how FDFS handles unknown details.
 */
const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true, maxlength: 200 },
    synopsis: { type: String, trim: true, maxlength: 3000 },
    poster: imageSchema,
    banner: imageSchema,
    releaseDate: Date,
    trailerUrl: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: MOVIE_STATUS, default: 'ANNOUNCED' },
    // Drives the homepage countdown; only one film is usually worth the hero slot.
    featured: { type: Boolean, default: false },
    // Set when admins have already been invited to open FDFS listings, so they are asked once.
    fdfsInviteSentAt: Date,
    createdBy: { type: ObjectId, ref: 'User' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
movieSchema.index({ slug: 1 }, { unique: true });
movieSchema.index({ status: 1, releaseDate: 1 });
movieSchema.index({ featured: -1, releaseDate: 1 });

export const Movie = mongoose.model('Movie', movieSchema);
