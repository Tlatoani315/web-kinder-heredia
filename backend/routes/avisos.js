/**
 * backend/routes/avisos.js
 * GET  /api/avisos          → todos los avisos activos (con filtros opcionales)
 * GET  /api/avisos/:id      → un aviso por ID
 * GET  /api/avisos/categorias → lista de categorías disponibles
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { getDatabase } = require('../db/database');

/* ── Helpers ────────────────────────────────────────────── */

/** Mapea una fila de sql.js (array) a un objeto usando los nombres de columna */
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

/* ── Rutas ──────────────────────────────────────────────── */

/**
 * GET /api/avisos
 * Query params opcionales:
 *   categoria  — filtra por categoría exacta
 *   limite     — número máximo de resultados (default 20, max 100)
 *   pagina     — paginación (default 1)
 */
router.get('/', async (req, res, next) => {
  try {
    const db = await getDatabase();

    // Parámetros
    const categoria = req.query.categoria?.trim().toLowerCase() || null;
    const limite    = Math.min(parseInt(req.query.limite)  || 20, 100);
    const pagina    = Math.max(parseInt(req.query.pagina)  || 1, 1);
    const offset    = (pagina - 1) * limite;

    // Construir WHERE dinámico (solo filas activas)
    const conditions = ['activo = 1'];
    const params     = [];

    const CATEGORIAS_VALIDAS = [
      'comunicado','evento','tramites','academico','medio-ambiente','salud'
    ];
    if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
      conditions.push('categoria = ?');
      params.push(categoria);
    }

    const where = conditions.join(' AND ');

    // Total para paginación
    const countResult = db.exec(
      `SELECT COUNT(*) AS total FROM avisos WHERE ${where};`,
      params
    );
    const total = countResult[0]?.values[0][0] ?? 0;

    // Datos paginados, más recientes primero
    const dataResult = db.exec(
      `SELECT id, titulo, descripcion, categoria, fecha_publicacion, color_etiqueta
       FROM avisos
       WHERE ${where}
       ORDER BY fecha_publicacion DESC, id DESC
       LIMIT ? OFFSET ?;`,
      [...params, limite, offset]
    );

    const avisos = rowsToObjects(dataResult);

    res.json({
      ok: true,
      data: avisos,
      paginacion: {
        total,
        pagina,
        limite,
        paginas: Math.ceil(total / limite),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/avisos/categorias
 * Devuelve las categorías únicas que tienen al menos un aviso activo.
 */
router.get('/categorias', async (req, res, next) => {
  try {
    const db     = await getDatabase();
    const result = db.exec(
      `SELECT DISTINCT categoria FROM avisos WHERE activo = 1 ORDER BY categoria;`
    );
    const categorias = result.length
      ? result[0].values.map(r => r[0])
      : [];

    res.json({ ok: true, data: categorias });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/avisos/:id
 * Devuelve un aviso específico por su ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      const err = new Error('ID inválido.');
      err.status = 400;
      return next(err);
    }

    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, titulo, descripcion, categoria, fecha_publicacion, color_etiqueta
       FROM avisos WHERE id = ? AND activo = 1 LIMIT 1;`,
      [id]
    );

    const avisos = rowsToObjects(result);
    if (avisos.length === 0) {
      const err = new Error('Aviso no encontrado.');
      err.status = 404;
      return next(err);
    }

    res.json({ ok: true, data: avisos[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
