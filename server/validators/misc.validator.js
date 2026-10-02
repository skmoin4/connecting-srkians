import { z } from 'zod';
import { ANNOUNCEMENT_TARGETS, BADGE_RULES, REPORT_REASONS, REPORT_STATUS, REPORT_TARGETS } from '../constants/enums.js';
import { ASSIGNABLE_ROLES } from '../constants/roles.js';
import { imageRef, objectId, optionalDate, optionalObjectId, optionalString, optionalUrl } from './common.js';

export const announcementSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    body: optionalString(2000),
    link: optionalString(300),
    target: z.enum(ANNOUNCEMENT_TARGETS),
    country: optionalObjectId,
    state: optionalObjectId,
    city: optionalObjectId,
    fanClub: optionalObjectId,
    event: optionalObjectId,
    fdfs: optionalObjectId,
    pinned: z.boolean().optional(),
    notify: z.boolean().optional(),
    expiresAt: optionalDate,
  })
  .superRefine((v, ctx) => {
    const need = { COUNTRY: 'country', STATE: 'state', CITY: 'city', FAN_CLUB: 'fanClub', EVENT: 'event', FDFS: 'fdfs' }[v.target];
    if (need && !v[need]) ctx.addIssue({ code: 'custom', path: [need], message: `${need} is required for ${v.target} announcements` });
  });

export const announcementUpdateSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  body: optionalString(2000),
  link: optionalString(300),
  pinned: z.boolean().optional(),
  status: z.enum(['PUBLISHED', 'ARCHIVED']).optional(),
  expiresAt: optionalDate,
});

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: optionalString(2000),
});

export const reportUpdateSchema = z.object({
  status: z.enum(REPORT_STATUS).optional(),
  note: optionalString(1000),
});

export const countrySchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().min(2).max(3),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export const stateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  country: objectId,
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export const citySchema = z.object({
  name: z.string().trim().min(2).max(80),
  state: objectId,
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  featured: z.boolean().optional(),
  description: optionalString(1000),
  announcement: optionalString(500),
  whatsappGroupLink: optionalUrl,
  coverImage: imageRef,
});

export const cityUpdateSchema = citySchema.partial().omit({ state: true });

export const adminUserPatchSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  moderatedCities: z.array(objectId).max(50).optional(),
});

export const awardPointsSchema = z.object({
  points: z.coerce.number().int().min(-1000).max(1000).refine((v) => v !== 0, 'Points cannot be zero'),
  note: z.string().trim().min(3).max(300),
});

export const badgeSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40).regex(/^[A-Z0-9_]+$/),
  name: z.string().trim().min(2).max(60),
  description: optionalString(300),
  icon: optionalString(40),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
  rule: z.object({
    type: z.enum(BADGE_RULES),
    threshold: z.coerce.number().int().min(0).max(100000).optional(),
    city: optionalObjectId,
  }),
  active: z.boolean().optional(),
});

export const badgeAwardSchema = z.object({ userId: objectId });

const img = imageRef;
export const settingsSchema = z
  .object({
    platformName: z.string().trim().min(2).max(60),
    tagline: optionalString(160),
    description: optionalString(500),
    logo: img,
    favicon: img,
    hero: z
      .object({
        headline: optionalString(160),
        subheading: optionalString(300),
        backgroundImage: img,
        backgroundVideoUrl: optionalUrl,
        primaryCta: optionalString(40),
        secondaryCta: optionalString(40),
      })
      .partial(),
    contactEmail: z.preprocess((v) => (v === null ? '' : v), z.string().trim().max(120).refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Invalid email').optional()),
    social: z
      .object({
        instagram: optionalString(200),
        whatsapp: optionalString(200),
        twitter: optionalString(200),
        youtube: optionalString(200),
        facebook: optionalString(200),
      })
      .partial(),
    footerText: optionalString(300),
    disclaimer: z.string().trim().min(20, 'A clear disclaimer is required').max(600),
    seo: z
      .object({
        defaultTitle: optionalString(120),
        titleTemplate: optionalString(80),
        defaultDescription: optionalString(300),
        keywords: optionalString(300),
        ogImage: img,
      })
      .partial(),
    defaultImages: z.object({ cityCover: img, fanClubCover: img, eventCover: img, fdfsPoster: img }).partial(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: optionalString(300),
  })
  .partial();
