import { z } from 'zod';
import { MEMBERSHIP_TYPES, FANCLUB_ACTIONS, CONTACT_STATUS, COLLAB_STATUS } from '../constants/enums.js';
import {
  imageRef,
  instagramHandle,
  objectId,
  optionalDate,
  optionalNumber,
  optionalString,
  optionalUrl,
  phone,
} from './common.js';

const whatsappGroup = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || /^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//i.test(v), 'Must be a WhatsApp link')
    .optional()
);
const telegram = z.preprocess(
  (v) => (v === null ? '' : v),
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === '' || /^https:\/\/(t\.me|telegram\.me)\//i.test(v), 'Must be a Telegram link')
    .optional()
);

const contactVisibility = z
  .object({
    showInstagram: z.boolean().optional(),
    showWhatsApp: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showWhatsAppGroup: z.boolean().optional(),
  })
  .optional();

export const applyFanClubSchema = z.object({
  name: z.string().trim().min(3, 'Fan club name is required').max(100),
  description: z.string().trim().min(20, 'Please describe your fan club (20+ characters)').max(3000),
  country: objectId,
  state: objectId,
  city: objectId,
  adminName: z.string().trim().min(2).max(80),
  logo: imageRef,
  coverImage: imageRef,
  instagram: instagramHandle,
  whatsappNumber: phone,
  phone: phone,
  whatsappGroupLink: whatsappGroup,
  telegramLink: telegram,
  website: optionalUrl,
  foundedDate: optionalDate,
  approxMemberCount: optionalNumber,
  verificationProof: imageRef,
  additionalInfo: optionalString(2000),
  contactVisibility,
  membershipType: z.enum(MEMBERSHIP_TYPES).optional(),
});

export const updateFanClubSchema = applyFanClubSchema
  .omit({ country: true, state: true, city: true })
  .partial()
  .extend({
    eventDefaults: z
      .object({ whatsappGroupLink: whatsappGroup, venue: optionalString(200), capacity: optionalNumber })
      .optional(),
  });

export const fanClubStatusSchema = z.object({
  action: z.enum(FANCLUB_ACTIONS),
  note: optionalString(1000),
});

export const adminFanClubPatchSchema = z.object({
  featured: z.boolean().optional(),
});

export const contactAdminSchema = z.object({
  name: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10, 'Message should be at least 10 characters').max(2000),
});

export const contactUpdateSchema = z.object({
  status: z.enum(CONTACT_STATUS).optional(),
  response: optionalString(2000),
});

export const memberActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE']),
});

export const collaborationSchema = z.object({
  senderClub: objectId,
  receiverClub: objectId,
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(3000),
});

export const collaborationUpdateSchema = z.object({
  status: z.enum(COLLAB_STATUS),
  response: optionalString(2000),
});
