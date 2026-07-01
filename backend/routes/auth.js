/**
 * backend/routes/auth.js
 * POST /api/auth/login    → valida credenciales, emite JWT en cookie HttpOnly
 * POST /api/auth/logout   → borra la cookie de sesión
 * GET  /api/auth/verificar → comprueba si la sesión (cookie) es válida
 *
 * Estrategia de sesión:
 *   - El JWT se almacena en una cookie HttpOnly + SameSite=Strict
 *     (inaccesible desde JavaScript del navegador → protege vs XSS).
 *   - El middleware requireAuth (ver middleware/requireAuth.js) lee
 *     esa cookie para proteger rutas del panel admin.
 */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const router   = express.Router();
const { getDatabase } = require('../db/database');

/* ── Helpers JWT ligero ──────────────────────────────────── */

const JWT_SECRET   = process.env.JWT_SECRET || 'cambiar_en_produccion';
const SESSION_TTL  = 8 * 60 * 60 * 1000;   // 8 horas en ms
const COOKIE_NAME  = 'kinder_session';

function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = base64url(JSON.stringify(payload));
  const sig    = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const parts = (token || '').split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    // Buffer.from lanza si los tamaños difieren → atrapar en catch
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Opciones compartidas de la cookie de sesión */
function cookieOptions(maxAge = SESSION_TTL) {
  return {
    httpOnly:  true,                                      // no accesible por JS
    sameSite:  'strict',                                  // protección CSRF básica
    secure:    process.env.NODE_ENV === 'production',     // HTTPS solo en producción
    maxAge,                                               // ms (Express usa ms aquí)
    path:      '/',
  };
}

function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

/* ── Rutas ──────────────────────────────────────────────── */

/**
 * POST /api/auth/login
 * Body (JSON o form-urlencoded): { usuario, password }
 *
 * En éxito:
 *   - Emite cookie HttpOnly  kinder_session=<JWT>
 *   - Responde JSON { ok, usuario, rol }
 *   - El cliente NO necesita guardar el token manualmente
 */
router.post('/login', async (req, res, next) => {
  try {
    const { usuario, password } = req.body || {};

    if (!usuario || !password) {
      const err = new Error('Se requieren usuario y contraseña.');
      err.status = 400;
      return next(err);
    }

    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, usuario, password, rol FROM usuarios
       WHERE usuario = ? LIMIT 1;`,
      [String(usuario).trim()]
    );

    const rows = rowsToObjects(result);
    // Mismo mensaje para usuario no encontrado o contraseña incorrecta
    // (no revelar cuál de los dos falló)
    if (rows.length === 0) {
      const err = new Error('Credenciales incorrectas.');
      err.status = 401;
      return next(err);
    }

    const user    = rows[0];
    const matches = await bcrypt.compare(String(password), user.password);
    if (!matches) {
      const err = new Error('Credenciales incorrectas.');
      err.status = 401;
      return next(err);
    }

    const token = createToken({
      sub: user.id,
      usr: user.usuario,
      rol: user.rol,
      exp: Date.now() + SESSION_TTL,
    });

    // Emitir cookie HttpOnly
    res.cookie(COOKIE_NAME, token, cookieOptions());

    res.json({ ok: true, usuario: user.usuario, rol: user.rol });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Borra la cookie de sesión estableciendo maxAge = 0.
 * No requiere body.
 */
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict' });
  res.json({ ok: true, mensaje: 'Sesión cerrada correctamente.' });
});

/**
 * GET /api/auth/verificar
 * Lee la cookie de sesión y confirma si es válida.
 * Útil para que el frontend compruebe el estado de autenticación.
 */
router.get('/verificar', (req, res) => {
  const token   = req.cookies?.[COOKIE_NAME] || null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return res.status(401).json({ ok: false, error: 'Sesión no iniciada o expirada.' });
  }

  res.json({ ok: true, usuario: payload.usr, rol: payload.rol });
});

// Exportar helpers para el middleware requireAuth
module.exports        = router;
module.exports.verifyToken  = verifyToken;
module.exports.COOKIE_NAME  = COOKIE_NAME;
