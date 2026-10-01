import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { COLLAB_STATUS } from '../constants/enums.js';

const adminCollaborationSchema = new mongoose.Schema(
  {
    senderClub: { type: ObjectId, ref: 'FanClub', required: true },
    receiverClub: { type: ObjectId, ref: 'FanClub', required: true },
    sender: { type: ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: COLLAB_STATUS, default: 'PENDING' },
    response: { type: String, trim: true, maxlength: 2000 },
    respondedBy: { type: ObjectId, ref: 'User' },
    respondedAt: Date,
  },
  { timestamps: true }
);
adminCollaborationSchema.index({ senderClub: 1, createdAt: -1 });
adminCollaborationSchema.index({ receiverClub: 1, createdAt: -1 });

export const AdminCollaboration = mongoose.model('AdminCollaboration', adminCollaborationSchema);
