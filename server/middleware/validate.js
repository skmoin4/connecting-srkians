import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req[source] with a zod schema and replaces it with the parsed (whitelisted) value,
 * so controllers only ever see validated fields.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(ApiError.badRequest(errors[0]?.message || 'Validation failed', errors));
    }
    if (source === 'query') {
      // req.query is a getter in some setups; store parsed copy separately.
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
