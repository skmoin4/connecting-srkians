import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env.js';
import { Upload } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

let configured = false;
const ensureCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
};

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

/** Database-backed images are capped well below the 5MB upload limit — these bytes live in Mongo
 *  and are re-read on every view, so a full-size photo would be expensive twice over. */
const DB_MAX_SIZE = 600 * 1024;

/**
 * Uploads an already-validated image buffer. Uses Cloudinary when configured; in development it
 * falls back to local disk (served from /uploads). Production without Cloudinary is refused.
 */
export async function uploadImageBuffer(file, folder = 'misc', uploadedBy) {
  if (isCloudinaryConfigured()) {
    ensureCloudinary();
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `srkians/${folder}`, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' };
  }

  // Serverless hosts have a read-only filesystem, so the disk fallback below cannot run there.
  // Keep the image in Mongo instead rather than refusing the upload outright.
  if (!env.allowLocalUploads) {
    if (file.size > DB_MAX_SIZE) {
      throw ApiError.badRequest(`Image must be ${Math.round(DB_MAX_SIZE / 1024)}KB or smaller until an image host is configured.`);
    }
    const doc = await Upload.create({
      data: file.buffer,
      contentType: file.mimetype,
      size: file.size,
      folder,
      uploadedBy: uploadedBy || undefined,
    });
    // Relative on purpose: the SPA and this API share an origin, so hardcoding a host would
    // break every stored image the moment the deployment URL changes.
    return { url: `/api/v1/uploads/${doc._id}`, publicId: String(doc._id), provider: 'db' };
  }

  const dir = path.join(LOCAL_UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomToken(6)}${EXT[file.mimetype] || '.img'}`;
  await fs.writeFile(path.join(dir, name), file.buffer);
  return { url: `${env.serverUrl}/uploads/${folder}/${name}`, publicId: `${folder}/${name}`, provider: 'local' };
}

export async function deleteImage(image) {
  if (!image?.publicId) return;
  try {
    if (image.provider === 'cloudinary' && isCloudinaryConfigured()) {
      ensureCloudinary();
      await cloudinary.uploader.destroy(image.publicId);
    } else if (image.provider === 'db') {
      await Upload.deleteOne({ _id: image.publicId });
    } else if (image.provider === 'local') {
      const target = path.resolve(LOCAL_UPLOAD_DIR, image.publicId);
      if (target.startsWith(LOCAL_UPLOAD_DIR)) await fs.unlink(target);
    }
  } catch {
    /* asset cleanup is best-effort */
  }
}

/** Streams a database-backed image. Cached hard: the bytes never change once written. */
export async function getStoredImage(id) {
  const doc = await Upload.findById(id).select('+data contentType size').lean();
  if (!doc) throw ApiError.notFound('Image not found');
  return doc;
}
