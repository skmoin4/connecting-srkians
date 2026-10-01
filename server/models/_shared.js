import mongoose from 'mongoose';

/** Stored reference to an uploaded asset (Cloudinary or dev-local). Never raw binaries. */
export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
    provider: { type: String, enum: ['cloudinary', 'local', 'external'], default: 'cloudinary' },
  },
  { _id: false }
);

export const { ObjectId } = mongoose.Schema.Types;
