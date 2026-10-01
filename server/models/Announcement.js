import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { ANNOUNCEMENT_TARGETS } from '../constants/enums.js';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, trim: true, maxlength: 2000 },
    link: { type: String, trim: true, maxlength: 300 },
    target: { type: String, enum: ANNOUNCEMENT_TARGETS, required: true },
    country: { type: ObjectId, ref: 'Country' },
    state: { type: ObjectId, ref: 'State' },
    city: { type: ObjectId, ref: 'City' },
    fanClub: { type: ObjectId, ref: 'FanClub' },
    event: { type: ObjectId, ref: 'Event' },
    fdfs: { type: ObjectId, ref: 'FDFS' },
    author: { type: ObjectId, ref: 'User', required: true },
    pinned: { type: Boolean, default: false },
    status: { type: String, enum: ['PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED' },
    expiresAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
announcementSchema.index({ target: 1, status: 1, createdAt: -1 });
announcementSchema.index({ city: 1, createdAt: -1 });
announcementSchema.index({ fanClub: 1, createdAt: -1 });
announcementSchema.index({ event: 1 });
announcementSchema.index({ fdfs: 1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
