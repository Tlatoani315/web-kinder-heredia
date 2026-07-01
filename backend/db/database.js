/**
 * backend/db/database.js
 * Capa de acceso a datos con sql.js (SQLite en WebAssembly).
 * sql.js carga la BD en memoria; este módulo la persiste en disco
 * manualmente después de cada escritura.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const initSqlJs = require('sql.js');

// Ruta absoluta al archivo .db en disco
const DB_PATH = path.resolve(process.cwd(), process.env.DB_PATH || './backend/db/kinder.db');

/** Instancia única compartida de la BD en memoria */
let _db   = null;
/** Módulo SQL (cargado una vez) */
let _SQL  = null;

/**
 * Escribe la BD en memoria al archivo .db en disco.
 * Debe llamarse después de cualquier INSERT / UPDATE / DELETE.
 */
function persistToDisk() {
  if (!_db) return;
  const data = _db.export();          // Uint8Array
  const buf  = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buf);
}

/**
 * Inicializa sql.js, carga el archivo .db existente (o crea uno nuevo)
 * y devuelve la instancia de la base de datos.
 * @returns {Promise<import('sql.js').Database>}
 */
async function getDatabase() {
  if (_db) return _db;

  if (!_SQL) {
    // Apunta el wasm al archivo dentro de node_modules
    const wasmPath = path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
    _SQL = await initSqlJs({ locateFile: () => wasmPath });
  }

  // Leer desde disco si existe; si no, crear BD vacía
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _SQL.Database(fileBuffer);
  } else {
    _db = new _SQL.Database();
  }

  // Activar claves foráneas y WAL-like pragma
  _db.run('PRAGMA foreign_keys = ON;');
  _db.run('PRAGMA journal_mode = DELETE;');

  return _db;
}

module.exports = { getDatabase, persistToDisk };
