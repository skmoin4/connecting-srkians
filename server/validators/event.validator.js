import { z } from 'zod';
import { EVENT_STATUS, EVENT_TYPES } from '../constants/enums.js';
import { dateLike, imageRef, objectId, optionalDate, optionalNumber, optionalObjectId, optionalString, optionalUrl, time } from './common.js';

const whatsappGroup = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || /^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//i.test(v), 'Must be a WhatsApp link')
    .optional()
);

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: optionalString(5000),
  coverImage: imageRef,
  eventType: z.enum(EVENT_TYPES).default('OTHER'),
  date: dateLike,
  startTime: time,
  endTime: time,
  city: objectId,
  venue: optionalString(200),
  address: optionalString(400),
  mapLink: optionalUrl,
  fanClub: optionalObjectId,
  capacity: optionalNumber,
  registrationDeadline: optionalDate,
  registrationOpen: z.boolean().optional(),
  contactInfo: optionalString(300),
  whatsappGroupLink: whatsappGroup,
  status: z.enum(['DRAFT', 'UPCOMING']).optional(),
});

export const updateEventSchema = createEventSchema
  .partial()
  .omit({ city: true, fanClub: true, status: true })
  .extend({ status: z.enum(EVENT_STATUS).optional() });

export const attendanceSchema = z.object({
  status: z.enum(['INTERESTED', 'GOING', 'CANCELLED']),
});

export const checkInSchema = z.object({ code: z.string().trim().min(6).max(64) });

export const createFdfsSchema = z.object({
  movie: z.string().trim().min(1).max(120),
  poster: imageRef,
  releaseDate: dateLike,
  fanClub: objectId,
  theatre: optionalString(200),
  theatreAddress: optionalString(400),
  mapLink: optionalUrl,
  showTime: optionalString(40),
  meetingPoint: optionalString(300),
  meetingTime: optionalString(40),
  instructions: optionalString(3000),
  whatsappGroupLink: whatsappGroup,
  capacity: optionalNumber,
  registrationOpen: z.boolean().optional(),
  status: z.enum(['DRAFT', 'UPCOMING']).optional(),
});

export const updateFdfsSchema = createFdfsSchema
  .partial()
  .omit({ fanClub: true, status: true })
  .extend({ status: z.enum(EVENT_STATUS).optional() });

export const fdfsJoinSchema = z.object({
  status: z.enum(['INTERESTED', 'GOING', 'CANCELLED']).default('GOING'),
});

export const adminEventPatchSchema = z.object({
  featured: z.boolean().optional(),
  status: z.enum(EVENT_STATUS).optional(),
  registrationOpen: z.boolean().optional(),
});
