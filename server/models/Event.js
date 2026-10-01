import mongoose from 'mongoose';
import { imageSchema, ObjectId } from './_shared.js';
import { EVENT_STATUS, EVENT_TYPES } from '../constants/enums.js';

const countsSchema = new mongoose.Schema(
  { interested: { type: Number, default: 0 }, going: { type: Number, default: 0 }, attended: { type: Number, default: 0 } },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 5000 },
    coverImage: imageSchema,
    eventType: { type: String, enum: EVENT_TYPES, default: 'OTHER' },
    date: { type: Date, required: true },
    startTime: { type: String, trim: true, maxlength: 5 }, // HH:mm
    endTime: { type: String, trim: true, maxlength: 5 },
    country: { type: ObjectId, ref: 'Country', required: true },
    state: { type: ObjectId, ref: 'State', required: true },
    city: { type: ObjectId, ref: 'City', required: true },
    venue: { type: String, trim: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 400 },
    mapLink: { type: String, trim: true, maxlength: 500 },
    organizer: { type: ObjectId, ref: 'User', required: true },
    fanClub: { type: ObjectId, ref: 'FanClub' },
    capacity: { type: Number, min: 0 },
    registrationDeadline: Date,
    registrationOpen: { type: Boolean, default: true },
    contactInfo: { type: String, trim: true, maxlength: 300 },
    whatsappGroupLink: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: EVENT_STATUS, default: 'UPCOMING' },
    featured: { type: Boolean, default: false },
    counts: { type: countsSchema, default: () => ({}) },
    checkInCode: { type: String, select: false },
    reminderSentAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ city: 1, date: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ fanClub: 1, date: -1 });
eventSchema.index({ title: 'text', description: 'text' });

export const Event = mongoose.model('Event', eventSchema);
export { countsSchema };
