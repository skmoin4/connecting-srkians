import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { BADGE_RULES } from '../constants/enums.js';

const badgeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300 },
    icon: { type: String, trim: true, default: 'award' }, // lucide icon name
    tier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD'], default: 'BRONZE' },
    rule: {
      type: { type: String, enum: BADGE_RULES, required: true },
      threshold: { type: Number, default: 1 },
      city: { type: ObjectId, ref: 'City' },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
badgeSchema.index({ code: 1 }, { unique: true });

const userBadgeSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    badge: { type: ObjectId, ref: 'Badge', required: true },
    awardedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

export const Badge = mongoose.model('Badge', badgeSchema);
export const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
