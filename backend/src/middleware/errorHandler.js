export function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${status} — ${message}`);
    if (err.stack) console.error(err.stack);
  }

  // Don't leak internal error details in production
  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
