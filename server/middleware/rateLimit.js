import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (_req, res) =>
  res.status(429).json({ success: false, message: 'Too many requests. Please slow down and try again shortly.', errors: [] });

const make = (windowMs, max) =>
  rateLimit({ windowMs, limit: env.isTest ? 10_000 : max, standardHeaders: 'draft-7', legacyHeaders: false, handler });

export const apiLimiter = make(15 * 60 * 1000, 1000);
export const authLimiter = make(15 * 60 * 1000, 30);
export const sensitiveLimiter = make(60 * 60 * 1000, 10); // password reset, verification emails
export const writeLimiter = make(60 * 1000, 30); // contact, reports, applications
