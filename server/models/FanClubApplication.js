import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { FANCLUB_STATUS } from '../constants/enums.js';

/** Review trail for a fan club's verification. The FanClub doc holds the current state. */
const fanClubApplicationSchema = new mongoose.Schema(
  {
    fanClub: { type: ObjectId, ref: 'FanClub', required: true },
    applicant: { type: ObjectId, ref: 'User', required: true },
    city: { type: ObjectId, ref: 'City' },
    status: { type: String, enum: FANCLUB_STATUS, default: 'PENDING' },
    history: [
      {
        action: String,
        status: String,
        note: String,
        by: { type: ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
fanClubApplicationSchema.index({ fanClub: 1 }, { unique: true });
fanClubApplicationSchema.index({ status: 1, createdAt: -1 });

export const FanClubApplication = mongoose.model('FanClubApplication', fanClubApplicationSchema);
