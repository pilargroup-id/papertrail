const config = require('../config');

/**
 * Global error handler.
 * Must be registered last in app.js after all routes.
 *
 * Catches errors thrown / passed via next(err) from anywhere.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message    = err.message    || 'Internal Server Error';

  const body = {
    success : false,
    message,
    ...(config.app.env === 'development' && { stack: err.stack }),
  };

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} →`, err);
  }

  return res.status(statusCode).json(body);
}

/**
 * 404 handler.
 * Register after all routes, before errorHandler.
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success : false,
    message : `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };