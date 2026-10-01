import mongoose from 'mongoose';
import { imageSchema, ObjectId } from './_shared.js';
import { FANCLUB_STATUS, MEMBERSHIP_TYPES } from '../constants/enums.js';

const fanClubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true },
    logo: imageSchema,
    coverImage: imageSchema,
    description: { type: String, trim: true, maxlength: 3000 },

    country: { type: ObjectId, ref: 'Country', required: true },
    state: { type: ObjectId, ref: 'State', required: true },
    city: { type: ObjectId, ref: 'City', required: true },

    admin: { type: ObjectId, ref: 'User', required: true },
    adminName: { type: String, trim: true, maxlength: 80 },

    // Contact details. Private values are stripped by fanClub.serializer unless the admin opts in.
    instagram: { type: String, trim: true, maxlength: 60 },
    whatsappNumber: { type: String, trim: true, maxlength: 20 },
    phone: { type: String, trim: true, maxlength: 20 },
    whatsappGroupLink: { type: String, trim: true, maxlength: 300 },
    telegramLink: { type: String, trim: true, maxlength: 300 },
    website: { type: String, trim: true, maxlength: 300 },
    contactVisibility: {
      showInstagram: { type: Boolean, default: true },
      showWhatsApp: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showWhatsAppGroup: { type: Boolean, default: false },
    },

    foundedDate: Date,
    approxMemberCount: { type: Number, min: 0 },
    verificationProof: imageSchema,
    additionalInfo: { type: String, trim: true, maxlength: 2000 },

    membershipType: { type: String, enum: MEMBERSHIP_TYPES, default: 'OPEN' },
    eventDefaults: {
      whatsappGroupLink: { type: String, trim: true, maxlength: 300 },
      venue: { type: String, trim: true, maxlength: 200 },
      capacity: { type: Number, min: 0 },
    },

    status: { type: String, enum: FANCLUB_STATUS, default: 'PENDING' },
    reviewNote: { type: String, trim: true, maxlength: 1000 },
    approvedAt: Date,
    featured: { type: Boolean, default: false },
    memberCount: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fanClubSchema.index({ slug: 1 }, { unique: true });
fanClubSchema.index({ city: 1, status: 1 });
fanClubSchema.index({ state: 1 });
fanClubSchema.index({ country: 1 });
fanClubSchema.index({ status: 1, createdAt: -1 });
fanClubSchema.index({ admin: 1 });
fanClubSchema.index({ name: 'text', description: 'text' });

fanClubSchema.virtual('isVerified').get(function isVerified() {
  return this.status === 'APPROVED';
});

export const FanClub = mongoose.model('FanClub', fanClubSchema);
