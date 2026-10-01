import { z } from 'zod';
import { instagramHandle, objectId, optionalString } from './common.js';

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const usernameRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30)
  .regex(/^[a-z0-9_.]+$/, 'Username can contain letters, numbers, underscores and dots');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  username: usernameRule,
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: passwordRule,
  country: objectId,
  state: objectId,
  city: objectId,
  bio: optionalString(300),
  favouriteMovie: optionalString(80),
  favouriteDialogue: optionalString(200),
  instagram: instagramHandle,
  referralCode: optionalString(40),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required').max(120),
  password: z.string().min(1, 'Password is required').max(128),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Invalid email') });

export const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordRule,
});

export const verifyEmailSchema = z.object({ token: z.string().min(10).max(200) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordRule,
});

export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });
