import { z } from 'zod';
import { imageRef, instagramHandle, objectId, optionalString } from './common.js';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: optionalString(300),
  favouriteMovie: optionalString(80),
  favouriteDialogue: optionalString(200),
  instagram: instagramHandle,
  profilePhoto: imageRef,
});

export const updateLocationSchema = z.object({
  country: objectId,
  state: objectId,
  city: objectId,
});

export const privacySchema = z.object({
  publicProfile: z.boolean().optional(),
  showCity: z.boolean().optional(),
  showInstagram: z.boolean().optional(),
  showFanClubs: z.boolean().optional(),
  showEventAttendance: z.boolean().optional(),
});

export const notificationPrefsSchema = z.object({
  fdfs: z.boolean().optional(),
  events: z.boolean().optional(),
  city: z.boolean().optional(),
  fanClub: z.boolean().optional(),
  adminMessages: z.boolean().optional(),
  system: z.boolean().optional(),
  push: z.boolean().optional(),
});

export const fcmTokenSchema = z.object({ token: z.string().trim().min(10).max(4096) });
