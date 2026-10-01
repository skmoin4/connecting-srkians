import mongoose from 'mongoose';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : [];

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Validation failed';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
    errors = [{ field, message }];
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) {
    logger.error(err);
    if (env.isProd && !(err instanceof ApiError)) message = 'Something went wrong';
  }

  res.status(status).json({ success: false, message, errors });
};
