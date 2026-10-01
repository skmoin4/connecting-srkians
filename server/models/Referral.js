import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { REFERRAL_STATUS } from '../constants/enums.js';

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: ObjectId, ref: 'User', required: true },
    referred: { type: ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    status: { type: String, enum: REFERRAL_STATUS, default: 'REGISTERED' },
    ipHash: { type: String, select: false },
    rewardedAt: Date,
    rejectReason: String,
  },
  { timestamps: true }
);
referralSchema.index({ referred: 1 }, { unique: true });
referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referrer: 1, ipHash: 1 });

export const Referral = mongoose.model('Referral', referralSchema);
