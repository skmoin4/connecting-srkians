import multer from 'multer';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/** Magic-byte sniffing so a renamed file can't masquerade as an image. */
const sniff = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return null;
};

const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ALLOWED[file.mimetype];
    if (!allowedExt || !allowedExt.includes(ext)) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed'));
    }
    return cb(null, true);
  },
});

/** Single-image upload with MIME, extension, size and content validation. */
export const uploadImage = (field = 'image') => [
  multerInstance.single(field),
  (req, _res, next) => {
    if (!req.file) return next(ApiError.badRequest('No image file provided'));
    const detected = sniff(req.file.buffer);
    if (!detected || detected !== req.file.mimetype) {
      return next(ApiError.badRequest('File content does not match an allowed image type'));
    }
    return next();
  },
];
