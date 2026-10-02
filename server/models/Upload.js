import mongoose from 'mongoose';
import { ObjectId } from './_shared.js';

/**
 * An image kept in the database, used when no object store is configured.
 *
 * Serverless hosts give a function a read-only filesystem, so the local-disk fallback in
 * `upload.service.js` cannot run in production — without this, uploads would simply be refused.
 * Mongo is the one durable store the app always has.
 *
 * This is a stopgap, not a CDN: every view costs a function invocation and the bytes sit in the
 * database. Configure Cloudinary and new uploads go there instead; rows already here keep working.
 */
const uploadSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, trim: true, default: 'misc' },
    uploadedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
uploadSchema.index({ createdAt: -1 });

export const Upload = mongoose.model('Upload', uploadSchema);
