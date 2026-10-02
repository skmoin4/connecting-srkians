import mongoose from 'mongoose';
import { imageSchema, ObjectId } from './_shared.js';
import { LOCATION_STATUS } from '../constants/enums.js';

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 3 },
    slug: { type: String, required: true, trim: true },
    status: { type: String, enum: LOCATION_STATUS, default: 'ACTIVE' },
  },
  { timestamps: true }
);
countrySchema.index({ slug: 1 }, { unique: true });
countrySchema.index({ code: 1 }, { unique: true });

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    country: { type: ObjectId, ref: 'Country', required: true },
    status: { type: String, enum: LOCATION_STATUS, default: 'ACTIVE' },
  },
  { timestamps: true }
);
stateSchema.index({ slug: 1 }, { unique: true });
stateSchema.index({ country: 1, name: 1 }, { unique: true });

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    state: { type: ObjectId, ref: 'State', required: true },
    country: { type: ObjectId, ref: 'Country', required: true },
    status: { type: String, enum: LOCATION_STATUS, default: 'ACTIVE' },
    featured: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 1000 },
    coverImage: imageSchema,
    announcement: { type: String, trim: true, maxlength: 500 },
    // Both are shared only with people who have joined the city (see getCityBySlug), so neither
    // can be scraped from a public page.
    whatsappGroupLink: { type: String, trim: true, maxlength: 300 },
    // A number the city runs for its community — deliberately NOT a moderator's personal phone,
    // which User keeps `select: false` and never exposes.
    whatsappNumber: { type: String, trim: true, maxlength: 20 },
    contactName: { type: String, trim: true, maxlength: 60 },
    // Denormalized counters, maintained by services (never client-set).
    memberCount: { type: Number, default: 0 },
    fanClubCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
citySchema.index({ slug: 1 }, { unique: true });
citySchema.index({ state: 1 });
citySchema.index({ country: 1 });
citySchema.index({ name: 1 });
citySchema.index({ featured: -1, memberCount: -1 });

export const Country = mongoose.model('Country', countrySchema);
export const State = mongoose.model('State', stateSchema);
export const City = mongoose.model('City', citySchema);
