import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: 'User' },
    actorName: String,
    action: { type: String, required: true },
    description: String,
    targetType: String,
    targetId: String,
    metadata: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
