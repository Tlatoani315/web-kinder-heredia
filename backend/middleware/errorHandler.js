/**
 * backend/middleware/errorHandler.js
 * Middleware centralizado de manejo de errores.
 * Captura cualquier error lanzado con next(err) y devuelve JSON.
 */

'use strict';

/**
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev    = process.env.NODE_ENV === 'development';
  const status   = err.status || err.statusCode || 500;
  const message  = err.message || 'Error interno del servidor.';

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
  if (isDev && err.stack) console.error(err.stack);

  res.status(status).json({
    ok:      false,
    error:   message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = errorHandler;
