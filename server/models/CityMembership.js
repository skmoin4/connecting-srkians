import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';

/** A user's primary city community. One primary membership per user. */
const cityMembershipSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    city: { type: ObjectId, ref: 'City', required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
cityMembershipSchema.index({ user: 1 }, { unique: true });
cityMembershipSchema.index({ city: 1, createdAt: -1 });

export const CityMembership = mongoose.model('CityMembership', cityMembershipSchema);
