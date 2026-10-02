import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { MOMENT_TYPES } from '../constants/enums.js';

/**
 * A date the fandom already celebrates — 2 November, a film's anniversary — stored as a recurring
 * day/month rather than a full date so it returns every year without re-seeding.
 *
 * `windowDays` widens the celebration either side of the day. Attending an event or FDFS while a
 * moment is live awards its `badge`, which is why those badges use the MANUAL rule: they are not
 * earned by thresholds, so `evaluateBadges` must not hand them out.
 */
const momentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: MOMENT_TYPES, default: 'CUSTOM' },
    day: { type: Number, required: true, min: 1, max: 31 },
    month: { type: Number, required: true, min: 1, max: 12 },
    // The year it first happened, so the UI can say "30 years of DDLJ".
    sinceYear: { type: Number, min: 1900, max: 2200 },
    windowDays: { type: Number, default: 0, min: 0, max: 15 },
    icon: { type: String, trim: true, default: 'sparkles' }, // lucide icon name
    badge: { type: ObjectId, ref: 'Badge' },
    movie: { type: ObjectId, ref: 'Movie' },
    active: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
momentSchema.index({ code: 1 }, { unique: true });
momentSchema.index({ active: 1, month: 1, day: 1 });

export const Moment = mongoose.model('Moment', momentSchema);
