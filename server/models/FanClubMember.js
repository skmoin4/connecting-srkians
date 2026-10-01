import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { MEMBER_STATUS } from '../constants/enums.js';

const fanClubMemberSchema = new mongoose.Schema(
  {
    fanClub: { type: ObjectId, ref: 'FanClub', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['MEMBER', 'ADMIN'], default: 'MEMBER' },
    status: { type: String, enum: MEMBER_STATUS, default: 'ACTIVE' },
    joinedAt: Date,
  },
  { timestamps: true }
);
// Prevents duplicate memberships at the database level.
fanClubMemberSchema.index({ fanClub: 1, user: 1 }, { unique: true });
fanClubMemberSchema.index({ user: 1, status: 1 });
fanClubMemberSchema.index({ fanClub: 1, status: 1, createdAt: -1 });

export const FanClubMember = mongoose.model('FanClubMember', fanClubMemberSchema);
