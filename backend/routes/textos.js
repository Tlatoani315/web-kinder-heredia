/**
 * backend/routes/textos.js
 * GET /api/textos             → todos los textos del sitio
 * GET /api/textos/seccion/:s  → textos de una sección (hero, nosotros, contacto)
 * GET /api/textos/:clave      → un texto específico por clave única
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { getDatabase } = require('../db/database');

/* ── Helper ─────────────────────────────────────────────── */
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

/* ── Rutas ──────────────────────────────────────────────── */

/**
 * GET /api/textos
 * Devuelve todos los textos del sitio agrupados por sección.
 */
router.get('/', async (req, res, next) => {
  try {
    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, clave, seccion, etiqueta, contenido, actualizado_en
       FROM textos_sitio ORDER BY seccion, id;`
    );
    const textos = rowsToObjects(result);

    // Agrupar por sección para facilitar el consumo en el frontend
    const agrupado = textos.reduce((acc, t) => {
      if (!acc[t.seccion]) acc[t.seccion] = {};
      acc[t.seccion][t.clave] = {
        id:           t.id,
        etiqueta:     t.etiqueta,
        contenido:    t.contenido,
        actualizadoEn: t.actualizado_en,
      };
      return acc;
    }, {});

    res.json({ ok: true, data: agrupado });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/textos/seccion/:seccion
 * Devuelve solo los textos de una sección específica.
 * Secciones válidas: hero, nosotros, contacto
 */
router.get('/seccion/:seccion', async (req, res, next) => {
  try {
    const SECCIONES_VALIDAS = ['hero', 'nosotros', 'contacto'];
    const seccion = req.params.seccion?.trim().toLowerCase();

    if (!SECCIONES_VALIDAS.includes(seccion)) {
      const err = new Error(
        `Sección no válida. Use una de: ${SECCIONES_VALIDAS.join(', ')}.`
      );
      err.status = 400;
      return next(err);
    }

    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, clave, etiqueta, contenido, actualizado_en
       FROM textos_sitio WHERE seccion = ? ORDER BY id;`,
      [seccion]
    );
    const textos = rowsToObjects(result);

    // Objeto plano clave → valor para uso sencillo
    const mapa = Object.fromEntries(
      textos.map(t => [t.clave, t.contenido])
    );

    res.json({ ok: true, seccion, data: textos, mapa });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/textos/:clave
 * Devuelve un único texto por su clave.
 */
router.get('/:clave', async (req, res, next) => {
  try {
    // Validación básica: solo letras, números, guiones y guiones bajos
    const clave = req.params.clave?.trim();
    if (!clave || !/^[\w-]{1,60}$/.test(clave)) {
      const err = new Error('Clave inválida.');
      err.status = 400;
      return next(err);
    }

    const db     = await getDatabase();
    const result = db.exec(
      `SELECT id, clave, seccion, etiqueta, contenido, actualizado_en
       FROM textos_sitio WHERE clave = ? LIMIT 1;`,
      [clave]
    );
    const textos = rowsToObjects(result);

    if (textos.length === 0) {
      const err = new Error(`Texto con clave "${clave}" no encontrado.`);
      err.status = 404;
      return next(err);
    }

    res.json({ ok: true, data: textos[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
