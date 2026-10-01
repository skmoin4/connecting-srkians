import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { ATTENDANCE_STATUS } from '../constants/enums.js';

const eventAttendeeSchema = new mongoose.Schema(
  {
    event: { type: ObjectId, ref: 'Event', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    checkedInAt: Date,
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
eventAttendeeSchema.index({ event: 1, user: 1 }, { unique: true });
eventAttendeeSchema.index({ user: 1, createdAt: -1 });
eventAttendeeSchema.index({ event: 1, status: 1 });

export const EventAttendee = mongoose.model('EventAttendee', eventAttendeeSchema);
