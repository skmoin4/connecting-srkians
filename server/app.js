import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import api from './routes/index.js';
import { sitemap } from './controllers/misc.controller.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { stripTags } from './middleware/sanitize.js';
import { maintenanceGuard } from './middleware/maintenance.js';
import { errorHandler, notFound } from './middleware/error.js';
import { LOCAL_UPLOAD_DIR } from './services/upload.service.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Nginx for rate limiting
  app.set('query parser', 'simple'); // no nested query objects → no operator injection via query strings
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow the SPA to load /uploads images
    })
  );

  const origins = env.clientUrl.split(',').map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, cb) => (!origin || origins.includes(origin) ? cb(null, true) : cb(null, false)),
      credentials: true,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize({ replaceWith: '_' }));
  app.use(stripTags);
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Dev-only local upload fallback (Cloudinary is used whenever configured)
  if (env.allowLocalUploads) {
    app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));
  }

  app.get('/sitemap.xml', sitemap);
  app.get('/', (_req, res) => res.json({ success: true, message: 'SRKians API', data: { docs: '/api/v1/health' } }));

  app.use('/api/v1', apiLimiter, maintenanceGuard, api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
