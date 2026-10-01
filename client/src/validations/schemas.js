import { z } from 'zod';

const optional = (max) => z.string().trim().max(max).optional().or(z.literal(''));

export const password = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/[0-9]/, 'Include a number');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'At least 3 characters')
      .max(30)
      .regex(/^[a-z0-9_.]+$/, 'Letters, numbers, _ and . only'),
    email: z.string().trim().email('Enter a valid email'),
    password,
    confirmPassword: z.string(),
    country: z.string().min(1, 'Select your country'),
    state: z.string().min(1, 'Select your state'),
    city: z.string().min(1, 'Select your city'),
    bio: optional(300),
    favouriteMovie: optional(80),
    favouriteDialogue: optional(200),
    instagram: optional(40),
    referralCode: optional(40),
    agree: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms and community guidelines' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const fanClubSchema = z.object({
  name: z.string().trim().min(3, 'Enter the fan club name').max(100),
  description: z.string().trim().min(20, 'Describe your fan club (at least 20 characters)').max(3000),
  country: z.string().min(1, 'Select country'),
  state: z.string().min(1, 'Select state'),
  city: z.string().min(1, 'Select city'),
  adminName: z.string().trim().min(2, 'Enter the admin name').max(80),
  instagram: optional(40),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s-]{7,16})?$/, 'Enter a valid number')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s-]{7,16})?$/, 'Enter a valid number')
    .optional(),
  whatsappGroupLink: z
    .string()
    .trim()
    .regex(/^(https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\/.+)?$/, 'Must be a WhatsApp link')
    .optional(),
  telegramLink: z
    .string()
    .trim()
    .regex(/^(https:\/\/(t\.me|telegram\.me)\/.+)?$/, 'Must be a Telegram link')
    .optional(),
  website: z
    .string()
    .trim()
    .regex(/^(https?:\/\/\S+)?$/, 'Must start with http(s)://')
    .optional(),
  foundedDate: z.string().optional(),
  approxMemberCount: z.string().optional(),
  additionalInfo: optional(2000),
});

export const eventSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(150),
  eventType: z.string().min(1),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: optional(200),
  address: optional(400),
  mapLink: z.string().trim().regex(/^(https?:\/\/\S+)?$/, 'Must be a URL').optional(),
  capacity: z.string().optional(),
  registrationDeadline: z.string().optional(),
  contactInfo: optional(300),
  whatsappGroupLink: z
    .string()
    .trim()
    .regex(/^(https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\/.+)?$/, 'Must be a WhatsApp link')
    .optional(),
  description: optional(5000),
});

export const fdfsSchema = z.object({
  movie: z.string().trim().min(1, 'Movie is required').max(120),
  releaseDate: z.string().min(1, 'Release date is required'),
  theatre: optional(200),
  theatreAddress: optional(400),
  mapLink: z.string().trim().regex(/^(https?:\/\/\S+)?$/, 'Must be a URL').optional(),
  showTime: optional(40),
  meetingPoint: optional(300),
  meetingTime: optional(40),
  capacity: z.string().optional(),
  whatsappGroupLink: z
    .string()
    .trim()
    .regex(/^(https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\/.+)?$/, 'Must be a WhatsApp link')
    .optional(),
  instructions: optional(3000),
});

/** Converts form strings to API types: '' → undefined, numeric strings → numbers. */
export const toPayload = (values, numeric = []) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, numeric.includes(k) ? (v === '' || v == null ? undefined : Number(v)) : v])
  );
