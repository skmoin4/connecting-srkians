import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { CONTACT_STATUS } from '../constants/enums.js';

const adminContactRequestSchema = new mongoose.Schema(
  {
    fanClub: { type: ObjectId, ref: 'FanClub', required: true },
    fromUser: { type: ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: CONTACT_STATUS, default: 'NEW' },
    response: { type: String, trim: true, maxlength: 2000 },
    respondedBy: { type: ObjectId, ref: 'User' },
    respondedAt: Date,
  },
  { timestamps: true }
);
adminContactRequestSchema.index({ fanClub: 1, status: 1, createdAt: -1 });
adminContactRequestSchema.index({ fromUser: 1, createdAt: -1 });

export const AdminContactRequest = mongoose.model('AdminContactRequest', adminContactRequestSchema);
