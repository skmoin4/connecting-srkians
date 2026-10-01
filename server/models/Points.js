import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { POINT_REASONS } from '../constants/points.js';

/** Leaderboard row. Location copied from the user so scoped leaderboards need no joins. */
const userPointsSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    total: { type: Number, default: 0 },
    country: { type: ObjectId, ref: 'Country' },
    state: { type: ObjectId, ref: 'State' },
    city: { type: ObjectId, ref: 'City' },
  },
  { timestamps: true }
);
userPointsSchema.index({ user: 1 }, { unique: true });
userPointsSchema.index({ total: -1 });
userPointsSchema.index({ city: 1, total: -1 });
userPointsSchema.index({ state: 1, total: -1 });
userPointsSchema.index({ country: 1, total: -1 });

const pointsTransactionSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true },
    reason: { type: String, enum: POINT_REASONS, required: true },
    // Reference used to make awards idempotent (e.g. one ATTEND_EVENT per event).
    refType: String,
    refId: String,
    note: { type: String, trim: true, maxlength: 300 },
    awardedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
pointsTransactionSchema.index({ user: 1, createdAt: -1 });
pointsTransactionSchema.index(
  { user: 1, reason: 1, refId: 1 },
  { unique: true, partialFilterExpression: { refId: { $type: 'string' } } }
);

export const UserPoints = mongoose.model('UserPoints', userPointsSchema);
export const PointsTransaction = mongoose.model('PointsTransaction', pointsTransactionSchema);
