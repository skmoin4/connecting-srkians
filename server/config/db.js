import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * Idempotent: serverless invocations (api/index.mjs) reuse the connection a warm container
 * already holds instead of opening a new pool per request.
 */
export async function connectDB(uri = env.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!uri) throw new Error('MONGO_URI is not set. See server/.env.example (or run `npm run dev:memory`).');
  await mongoose.connect(uri, {
    autoIndex: !env.isProd || process.env.MONGO_AUTO_INDEX === 'true',
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || (env.isProd ? 5 : 10)),
    serverSelectionTimeoutMS: 10000,
  });
  logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
