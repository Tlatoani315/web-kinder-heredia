/**
 * backend/server.js
 * Punto de entrada del servidor Express.
 * Inicia la base de datos y monta todos los endpoints de la API.
 *
 * Uso:
 *   node backend/server.js
 */

'use strict';

const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { initSchema } = require('./db/schema');
const errorHandler   = require('./middleware/errorHandler');
const requireAuth    = require('./middleware/requireAuth');

// Rutas
const avisosRouter = require('./routes/avisos');
const textosRouter = require('./routes/textos');
const authRouter   = require('./routes/auth');
const adminRouter  = require('./routes/admin');

const app  = express();
const PORT = parseInt(process.env.PORT) || 3000;

/* ── Middlewares globales ───────────────────────────────── */

// CORS: en desarrollo acepta cualquier origen; en producción
// restringe a tu dominio propio.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://tu-dominio.com'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,            // necesario para enviar cookies en cross-origin dev
}));

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());        // parsea req.cookies

/* ── Rutas protegidas ANTES del static ──────────────────── */
// Deben registrarse antes de express.static para que requireAuth
// intercepte /admin/* antes de que el sistema de archivos lo sirva.
app.use('/api/avisos',       avisosRouter);
app.use('/api/textos',       textosRouter);
app.use('/api/auth',         authRouter);
app.use('/api/admin',        requireAuth, adminRouter);  // protegido
app.use('/admin',            requireAuth, adminRouter);  // protegido

/**
 * GET /api/status
 * Endpoint de salud — útil para verificar que el servidor está corriendo.
 */
app.get('/api/status', (_req, res) => {
  res.json({
    ok:      true,
    mensaje: 'Servidor Jardín de Niños José María Heredia y Heredia',
    version: '1.0.0',
    hora:    new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
  });
});

/* ── Archivos estáticos (frontend público) ──────────────── */
// Después de las rutas protegidas para que /admin/* no sea
// alcanzable directamente desde el sistema de archivos.
app.use(express.static(path.resolve(__dirname, '..'), {
  // No servir automáticamente index.html de subdirectorios
  // para que /admin/ pase por requireAuth antes
  index: false,
}));

// Servir index.html de la raíz para la ruta /
app.get('/', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../index.html'));
});

// Cualquier ruta no reconocida de la API → 404 JSON
app.use('/api/*splat', (req, res) => {
  res.status(404).json({ ok: false, error: `Ruta ${req.path} no encontrada.` });
});

// Fallback: todas las rutas no-API y no-admin devuelven index.html (SPA)
app.get('*splat', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../index.html'));
});

/* ── Manejador global de errores ────────────────────────── */
app.use(errorHandler);

/* ── Arranque ───────────────────────────────────────────── */
async function start() {
  try {
    console.log('[DB] Inicializando base de datos SQLite...');
    await initSchema();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║   Jardín de Niños José María Heredia y Heredia       ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║   Servidor corriendo en  http://localhost:${PORT}        ║`);
      console.log(`║   Entorno: ${process.env.NODE_ENV || 'development'}                              ║`);
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log('║   Endpoints disponibles:                             ║');
      console.log('║   GET  /api/status                                   ║');
      console.log('║   GET  /api/avisos                                   ║');
      console.log('║   GET  /api/avisos/:id                               ║');
      console.log('║   GET  /api/avisos/categorias                        ║');
      console.log('║   GET  /api/textos                                   ║');
      console.log('║   GET  /api/textos/seccion/:seccion                  ║');
      console.log('║   GET  /api/textos/:clave                            ║');
      console.log('║   POST /api/auth/login                               ║');
      console.log('║   POST /api/auth/logout                              ║');
      console.log('║   GET  /api/auth/verificar                           ║');
      console.log('║   GET  /admin          [protegido]                   ║');
      console.log('║   GET  /api/admin/me   [protegido]                   ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('[FATAL] No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

start();
