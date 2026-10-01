import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.mongoUri) {
  if (!uri) throw new Error('MONGO_URI is not set. See server/.env.example (or run `npm run dev:memory`).');
  await mongoose.connect(uri, { autoIndex: !env.isProd || process.env.MONGO_AUTO_INDEX === 'true' });
  logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
