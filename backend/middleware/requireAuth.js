/**
 * backend/middleware/requireAuth.js
 * Middleware que protege rutas del panel de administración.
 *
 * - Solicitudes a la API (/api/admin/*): responde 401 JSON.
 * - Solicitudes de navegador a páginas (/admin, /admin/*):
 *   redirige a /login.html si no hay sesión válida.
 */

'use strict';

const path = require('path');
const { verifyToken, COOKIE_NAME } = require('../routes/auth');

/**
 * requireAuth — úsalo como middleware en cualquier ruta o router protegido.
 *
 * Uso en server.js:
 *   const requireAuth = require('./middleware/requireAuth');
 *   app.use('/admin', requireAuth, adminRouter);
 */
function requireAuth(req, res, next) {
  const token   = req.cookies?.[COOKIE_NAME] || null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    // Determinar si es una petición de API o de navegador
    const isApiCall = req.path.startsWith('/api') ||
                      req.headers['accept']?.includes('application/json') ||
                      req.xhr;

    if (isApiCall) {
      return res.status(401).json({
        ok:    false,
        error: 'Sesión requerida. Inicia sesión en /login.html',
      });
    }

    // Guardar la URL a la que intentaba acceder para redirigir después del login
    const returnTo = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login.html?returnTo=${returnTo}`);
  }

  // Inyectar datos del usuario en req para uso posterior
  req.adminUser = { id: payload.sub, usuario: payload.usr, rol: payload.rol };
  next();
}

module.exports = requireAuth;
