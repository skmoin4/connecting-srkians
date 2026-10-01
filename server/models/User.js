import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { imageSchema, ObjectId } from './_shared.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/enums.js';

const privacySchema = new mongoose.Schema(
  {
    publicProfile: { type: Boolean, default: true },
    showCity: { type: Boolean, default: true },
    showInstagram: { type: Boolean, default: true },
    showFanClubs: { type: Boolean, default: true },
    showEventAttendance: { type: Boolean, default: true },
  },
  { _id: false }
);

const notificationPrefsSchema = new mongoose.Schema(
  {
    fdfs: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    city: { type: Boolean, default: true },
    fanClub: { type: Boolean, default: true },
    adminMessages: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
    status: { type: String, enum: USER_STATUS, default: 'ACTIVE', index: true },

    country: { type: ObjectId, ref: 'Country' },
    state: { type: ObjectId, ref: 'State' },
    city: { type: ObjectId, ref: 'City' },

    profilePhoto: imageSchema,
    bio: { type: String, trim: true, maxlength: 300 },
    favouriteMovie: { type: String, trim: true, maxlength: 80 },
    favouriteDialogue: { type: String, trim: true, maxlength: 200 },
    instagram: { type: String, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, select: false },

    privacy: { type: privacySchema, default: () => ({}) },
    notificationPreferences: { type: notificationPrefsSchema, default: () => ({}) },
    fcmTokens: { type: [String], select: false, default: [] },

    // Only meaningful for CITY_MODERATOR (and future STATE/COUNTRY admins)
    moderatedCities: [{ type: ObjectId, ref: 'City' }],

    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },

    referralCode: { type: String, trim: true },
    referredBy: { type: ObjectId, ref: 'User' },
    referralClicks: { type: Number, default: 0 },

    totalPoints: { type: Number, default: 0, index: true },
    profileCompletedAt: Date,
    lastLoginAt: Date,
    lastActiveAt: Date,
    deletedAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ city: 1 });
userSchema.index({ state: 1 });
userSchema.index({ country: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isProfileComplete = function isProfileComplete() {
  return Boolean(this.fullName && this.city && this.bio && this.favouriteMovie && this.profilePhoto?.url);
};

// Never leak credentials or tokens through JSON serialization.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.emailVerifyTokenHash;
    delete ret.emailVerifyExpires;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.passwordChangedAt;
    delete ret.fcmTokens;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
