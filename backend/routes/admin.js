/**
 * backend/routes/admin.js
 * Rutas del panel de administración — todas protegidas por requireAuth.
 *
 * GET    /admin           → sirve admin/index.html
 * GET    /api/admin/me    → datos del usuario autenticado (JSON)
 * GET    /api/admin/avisos → todos los avisos (incluyendo inactivos)
 * POST   /api/admin/avisos → crear aviso
 * PUT    /api/admin/avisos/:id → actualizar aviso
 * DELETE /api/admin/avisos/:id → eliminar aviso
 * PUT    /api/admin/textos → actualizar textos del sitio
 */

'use strict';

const path    = require('path');
const express = require('express');
const router  = express.Router();
const { getDatabase, persistToDisk } = require('../db/database');

function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

/**
 * GET /admin  (y /admin/)
 * Sirve el archivo admin/index.html.
 * El middleware requireAuth ya validó la sesión antes de llegar aquí.
 */
router.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../admin/index.html'));
});

/**
 * GET /api/admin/me
 * Devuelve los datos del administrador autenticado.
 */
router.get('/me', (req, res) => {
  res.json({
    ok:      true,
    usuario: req.adminUser.usuario,
    rol:     req.adminUser.rol,
  });
});

/**
 * GET /api/admin/avisos
 * Devuelve TODOS los avisos de la base de datos (activos e inactivos).
 */
router.get('/avisos', async (req, res, next) => {
  try {
    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, titulo, descripcion, categoria, fecha_publicacion, color_etiqueta, activo
       FROM avisos
       ORDER BY fecha_publicacion DESC, id DESC;`
    );
    const avisos = rowsToObjects(result);
    res.json({ ok: true, data: avisos });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/avisos
 * Crea un nuevo aviso.
 */
router.post('/avisos', async (req, res, next) => {
  try {
    const { titulo, descripcion, categoria, fecha_publicacion, activo } = req.body || {};

    if (!titulo || !descripcion || !categoria) {
      const err = new Error('Los campos título, descripción y categoría son obligatorios.');
      err.status = 400;
      return next(err);
    }

    const CATEGORIAS_VALIDAS = ['comunicado', 'evento', 'tramites', 'academico', 'medio-ambiente', 'salud'];
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      const err = new Error('Categoría inválida.');
      err.status = 400;
      return next(err);
    }

    // Mapear color por defecto según categoría si no se pasa
    const colorMap = {
      'comunicado': '#1A4B8C',
      'evento': '#F5C518',
      'tramites': '#7c3aed',
      'academico': '#2E9E5B',
      'medio-ambiente': '#059669',
      'salud': '#dc2626'
    };
    const color_etiqueta = colorMap[categoria] || '#1A4B8C';

    const fecha = fecha_publicacion || new Date().toISOString().split('T')[0];
    const isActivo = activo !== undefined ? (activo ? 1 : 0) : 1;

    const db = await getDatabase();
    const stmt = db.prepare(`
      INSERT INTO avisos (titulo, descripcion, categoria, fecha_publicacion, color_etiqueta, activo)
      VALUES (?, ?, ?, ?, ?, ?);
    `);
    stmt.run([titulo.trim(), descripcion.trim(), categoria, fecha, color_etiqueta, isActivo]);
    stmt.free();

    persistToDisk();

    res.json({ ok: true, mensaje: 'Aviso creado correctamente.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/avisos/:id
 * Actualiza un aviso existente.
 */
router.put('/avisos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      const err = new Error('ID de aviso inválido.');
      err.status = 400;
      return next(err);
    }

    const { titulo, descripcion, categoria, fecha_publicacion, activo } = req.body || {};

    if (!titulo || !descripcion || !categoria) {
      const err = new Error('Los campos título, descripción y categoría son obligatorios.');
      err.status = 400;
      return next(err);
    }

    const CATEGORIAS_VALIDAS = ['comunicado', 'evento', 'tramites', 'academico', 'medio-ambiente', 'salud'];
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      const err = new Error('Categoría inválida.');
      err.status = 400;
      return next(err);
    }

    const colorMap = {
      'comunicado': '#1A4B8C',
      'evento': '#F5C518',
      'tramites': '#7c3aed',
      'academico': '#2E9E5B',
      'medio-ambiente': '#059669',
      'salud': '#dc2626'
    };
    const color_etiqueta = colorMap[categoria] || '#1A4B8C';

    const fecha = fecha_publicacion || new Date().toISOString().split('T')[0];
    const isActivo = activo !== undefined ? (activo ? 1 : 0) : 1;

    const db = await getDatabase();

    // Verificar si existe el aviso
    const existResult = db.exec('SELECT COUNT(*) FROM avisos WHERE id = ?;', [id]);
    const exists = existResult[0]?.values[0][0] ?? 0;
    if (exists === 0) {
      const err = new Error('Aviso no encontrado.');
      err.status = 404;
      return next(err);
    }

    const stmt = db.prepare(`
      UPDATE avisos
      SET titulo = ?, descripcion = ?, categoria = ?, fecha_publicacion = ?, color_etiqueta = ?, activo = ?
      WHERE id = ?;
    `);
    stmt.run([titulo.trim(), descripcion.trim(), categoria, fecha, color_etiqueta, isActivo, id]);
    stmt.free();

    persistToDisk();

    res.json({ ok: true, mensaje: 'Aviso actualizado correctamente.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/avisos/:id
 * Elimina permanentemente un aviso por su ID.
 */
router.delete('/avisos/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      const err = new Error('ID de aviso inválido.');
      err.status = 400;
      return next(err);
    }

    const db = await getDatabase();

    // Verificar si existe el aviso
    const existResult = db.exec('SELECT COUNT(*) FROM avisos WHERE id = ?;', [id]);
    const exists = existResult[0]?.values[0][0] ?? 0;
    if (exists === 0) {
      const err = new Error('Aviso no encontrado.');
      err.status = 404;
      return next(err);
    }

    const stmt = db.prepare('DELETE FROM avisos WHERE id = ?;');
    stmt.run([id]);
    stmt.free();

    persistToDisk();

    res.json({ ok: true, mensaje: 'Aviso eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/textos
 * Actualiza masivamente los textos estáticos del sitio.
 * Espera un JSON objeto: { clave1: "contenido1", clave2: "contenido2", ... }
 */
router.put('/textos', async (req, res, next) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      const err = new Error('Cuerpo de la petición inválido. Debe ser un objeto.');
      err.status = 400;
      return next(err);
    }

    const ALLOWED_KEYS = [
      'mision', 'vision', 'valores', 'direccion', 'telefono',
      'email', 'horario', 'cct', 'ciclo_escolar', 'mensaje_bienvenida'
    ];

    const db = await getDatabase();

    db.run('BEGIN TRANSACTION;');
    try {
      const stmt = db.prepare(`
        UPDATE textos_sitio
        SET contenido = ?, actualizado_en = (datetime('now','localtime'))
        WHERE clave = ?;
      `);
      for (const [clave, contenido] of Object.entries(updates)) {
        if (ALLOWED_KEYS.includes(clave)) {
          stmt.run([String(contenido).trim(), clave]);
        }
      }
      stmt.free();
      db.run('COMMIT;');
    } catch (txErr) {
      db.run('ROLLBACK;');
      throw txErr;
    }

    persistToDisk();

    res.json({ ok: true, mensaje: 'Textos actualizados correctamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
