import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { ATTENDANCE_STATUS } from '../constants/enums.js';

const fdfsParticipantSchema = new mongoose.Schema(
  {
    fdfs: { type: ObjectId, ref: 'FDFS', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    checkedInAt: Date,
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
fdfsParticipantSchema.index({ fdfs: 1, user: 1 }, { unique: true });
fdfsParticipantSchema.index({ user: 1, createdAt: -1 });
fdfsParticipantSchema.index({ fdfs: 1, status: 1 });

export const FDFSParticipant = mongoose.model('FDFSParticipant', fdfsParticipantSchema);
