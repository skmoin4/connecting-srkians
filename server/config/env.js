import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

// In development/test we allow insecure fallbacks so the app boots; production must set real secrets.
const devSecret = (name) => (isProd ? required(name) : process.env[name] || `dev-only-${name}-change-me`);

export const env = {
  nodeEnv,
  isProd,
  isTest,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  jwt: {
    accessSecret: devSecret('JWT_ACCESS_SECRET'),
    refreshSecret: devSecret('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30),
  },
  cookie: {
    // Cross-site deployments (e.g. Vercel frontend + Render API) need SameSite=None; Secure.
    sameSite: process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'SRKians <no-reply@srkians.local>',
  },
  allowLocalUploads: process.env.ALLOW_LOCAL_UPLOADS
    ? process.env.ALLOW_LOCAL_UPLOADS === 'true'
    : !isProd,
};

export const isCloudinaryConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

export const isFirebaseConfigured = () =>
  Boolean(env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey);

export const isSmtpConfigured = () => Boolean(env.smtp.host);
