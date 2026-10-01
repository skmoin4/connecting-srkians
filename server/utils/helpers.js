import crypto from 'node:crypto';
import mongoose from 'mongoose';
import slugifyLib from 'slugify';

export const slugify = (text) =>
  slugifyLib(String(text || ''), { lower: true, strict: true, trim: true }).slice(0, 80) || 'item';

/** Generates a slug that is unique for the given model, appending -2, -3 ... when taken. */
export async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base);
  let candidate = root;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${root}-${i++}`;
  }
  return candidate;
}

export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const idEq = (a, b) => a != null && b != null && String(a?._id ?? a) === String(b?._id ?? b);
