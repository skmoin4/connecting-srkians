import mongoose from 'mongoose';
import { imageSchema, ObjectId } from './_shared.js';
import { EVENT_STATUS } from '../constants/enums.js';
import { countsSchema } from './Event.js';

/**
 * First-Day-First-Show listing. Theatre/show/meeting details are optional because they are
 * often unknown until close to release — the UI shows "To Be Announced" rather than inventing them.
 */
const fdfsSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true },
    poster: imageSchema,
    releaseDate: { type: Date, required: true },
    country: { type: ObjectId, ref: 'Country', required: true },
    state: { type: ObjectId, ref: 'State', required: true },
    city: { type: ObjectId, ref: 'City', required: true },
    fanClub: { type: ObjectId, ref: 'FanClub', required: true },
    organizer: { type: ObjectId, ref: 'User', required: true },
    theatre: { type: String, trim: true, maxlength: 200 },
    theatreAddress: { type: String, trim: true, maxlength: 400 },
    mapLink: { type: String, trim: true, maxlength: 500 },
    showTime: { type: String, trim: true, maxlength: 40 },
    meetingPoint: { type: String, trim: true, maxlength: 300 },
    meetingTime: { type: String, trim: true, maxlength: 40 },
    instructions: { type: String, trim: true, maxlength: 3000 },
    whatsappGroupLink: { type: String, trim: true, maxlength: 300 },
    capacity: { type: Number, min: 0 },
    registrationOpen: { type: Boolean, default: true },
    status: { type: String, enum: EVENT_STATUS, default: 'UPCOMING' },
    featured: { type: Boolean, default: false },
    counts: { type: countsSchema, default: () => ({}) },
    checkInCode: { type: String, select: false },
    reminderSentAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
fdfsSchema.index({ slug: 1 }, { unique: true });
fdfsSchema.index({ movie: 1 });
fdfsSchema.index({ city: 1, releaseDate: 1 });
fdfsSchema.index({ releaseDate: 1 });
fdfsSchema.index({ fanClub: 1 });
fdfsSchema.index({ status: 1, releaseDate: 1 });

export const FDFS = mongoose.model('FDFS', fdfsSchema);
