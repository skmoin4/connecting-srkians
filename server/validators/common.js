import { z } from 'zod';
import mongoose from 'mongoose';

export const objectId = z
  .string()
  .trim()
  .refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid id');

export const optionalObjectId = z.preprocess((v) => (v === '' || v === null ? undefined : v), objectId.optional());

export const optionalString = (max = 500) =>
  z.preprocess((v) => (v === null ? '' : v), z.string().trim().max(max).optional());

export const optionalUrl = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), 'Must be a valid http(s) URL')
    .optional()
);

export const phone = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9\s-]{7,16}$/.test(v), 'Invalid phone number')
    .optional()
);

export const instagramHandle = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '') : v),
  z
    .string()
    .max(40)
    .refine((v) => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v), 'Invalid Instagram username')
    .optional()
);

export const time = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'Time must be HH:mm')
    .optional()
);

export const dateLike = z.coerce.date();
export const optionalDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());
export const optionalNumber = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(1_000_000).optional());
export const bool = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

export const imageRef = z
  .object({
    url: z.string().trim().max(500).refine((v) => /^https?:\/\//.test(v), 'Invalid image URL'),
    publicId: z.string().trim().max(300).optional(),
    provider: z.enum(['cloudinary', 'local', 'external', 'db']).optional(),
  })
  .nullable()
  .optional();

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
