import { createError } from './errorHandler.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return next(createError(400, message));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return next(createError(400, message));
    }
    req.query = result.data;
    next();
  };
}
