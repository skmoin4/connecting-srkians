import mongoose from 'mongoose';
import { imageSchema } from './_shared.js';

export const DEFAULT_DISCLAIMER =
  'This is an independent fan community platform and is not officially affiliated with Shah Rukh Khan, Red Chillies Entertainment, or any official organization.';

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    platformName: { type: String, default: 'SRKians', trim: true, maxlength: 60 },
    tagline: {
      type: String,
      default: 'Find Your City. Find Your Fan Club. Find Your SRKian Family.',
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      default:
        'A dedicated city-based network for SRKians. Discover fan clubs in your city, connect with verified admins and join fan events and FDFS celebrations.',
      trim: true,
      maxlength: 500,
    },
    logo: imageSchema,
    favicon: imageSchema,
    hero: {
      headline: { type: String, default: 'ONE KING.\nONE FAMILY.\nMILLIONS OF SRKIANS.', maxlength: 160 },
      subheading: {
        type: String,
        default:
          'Find SRKians in your city, discover fan clubs, connect with admins and join unforgettable fan events.',
        maxlength: 300,
      },
      backgroundImage: imageSchema,
      backgroundVideoUrl: { type: String, trim: true },
      primaryCta: { type: String, default: 'FIND YOUR CITY' },
      secondaryCta: { type: String, default: 'JOIN THE COMMUNITY' },
    },
    contactEmail: { type: String, trim: true, default: '' },
    social: {
      instagram: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
    },
    footerText: { type: String, trim: true, default: 'Made with love by SRKians, for SRKians.', maxlength: 300 },
    disclaimer: { type: String, trim: true, default: DEFAULT_DISCLAIMER, maxlength: 600 },
    seo: {
      defaultTitle: { type: String, default: 'SRKians — Find Your City. Find Your Fan Club.' },
      titleTemplate: { type: String, default: '%s | SRKians' },
      defaultDescription: {
        type: String,
        default: 'Find SRK fan clubs in your city, connect with verified fan club admins, and join fan events and FDFS.',
      },
      keywords: { type: String, default: 'SRK fan club, SRKians, Shah Rukh Khan fans, FDFS, fan events' },
      ogImage: imageSchema,
    },
    defaultImages: {
      cityCover: imageSchema,
      fanClubCover: imageSchema,
      eventCover: imageSchema,
      fdfsPoster: imageSchema,
    },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are upgrading the platform. Back soon!' },
  },
  { timestamps: true }
);

export const SiteSetting = mongoose.model('SiteSetting', siteSettingSchema);
