/**
 * Strips HTML tags from every string in the request body (except secrets). The frontend renders
 * text safely, but this keeps stored data clean for other consumers (emails, push, mobile apps).
 */
const SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'token', 'refreshToken']);
const TAG_RE = /<\/?[a-z!][^>]*>/gi;

const clean = (value, key) => {
  if (typeof value === 'string') return SKIP_KEYS.has(key) ? value : value.replace(TAG_RE, '');
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = clean(value[k], k);
  }
  return value;
};

export const stripTags = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') clean(req.body);
  next();
};
