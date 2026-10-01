import { SiteSetting } from '../models/SiteSetting.js';

let cache = null;
let cachedAt = 0;
const TTL = 30 * 1000;

export async function getSettings() {
  let doc = await SiteSetting.findOne({ key: 'main' }).lean();
  if (!doc) doc = (await SiteSetting.create({ key: 'main' })).toObject();
  return doc;
}

export async function getSettingsCached() {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  cache = await getSettings();
  cachedAt = Date.now();
  return cache;
}

export async function updateSettings(patch) {
  const doc = await SiteSetting.findOneAndUpdate({ key: 'main' }, { $set: flatten(patch) }, { new: true, upsert: true, runValidators: true }).lean();
  cache = doc;
  cachedAt = Date.now();
  return doc;
}

/** Flattens nested objects into dot paths so partial nested updates don't wipe siblings. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !('url' in v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export const publicSettings = (s) => ({
  platformName: s.platformName,
  tagline: s.tagline,
  description: s.description,
  logo: s.logo,
  favicon: s.favicon,
  hero: s.hero,
  contactEmail: s.contactEmail,
  social: s.social,
  footerText: s.footerText,
  disclaimer: s.disclaimer,
  seo: s.seo,
  defaultImages: s.defaultImages,
  maintenanceMode: s.maintenanceMode,
  maintenanceMessage: s.maintenanceMessage,
});
