import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';

/**
 * Hashed refresh tokens with rotation families. Re-use of a revoked token revokes the whole
 * family (stolen-token detection).
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: String,
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
