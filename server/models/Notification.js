import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { NOTIFICATION_TYPES } from '../constants/enums.js';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true, maxlength: 300 },
    read: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
// Auto-expire old notifications after 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const Notification = mongoose.model('Notification', notificationSchema);
