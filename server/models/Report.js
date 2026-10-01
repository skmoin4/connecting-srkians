import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';
import { REPORT_REASONS, REPORT_STATUS, REPORT_TARGETS } from '../constants/enums.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: ObjectId, required: true },
    targetLabel: { type: String, trim: true, maxlength: 200 },
    city: { type: ObjectId, ref: 'City' }, // used to scope moderator access
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: REPORT_STATUS, default: 'PENDING' },
    notes: [
      {
        by: { type: ObjectId, ref: 'User' },
        note: { type: String, trim: true, maxlength: 1000 },
        at: { type: Date, default: Date.now },
      },
    ],
    resolvedBy: { type: ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true }
);
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ city: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });

export const Report = mongoose.model('Report', reportSchema);
