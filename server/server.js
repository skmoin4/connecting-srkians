import { startServer } from './bootstrap.js';
import { logger } from './utils/logger.js';

startServer().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});
