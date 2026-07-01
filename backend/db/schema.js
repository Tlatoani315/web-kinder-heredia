/**
 * backend/db/schema.js
 * Crea las tablas si no existen y ejecuta el seeder inicial
 * (usuario admin por defecto y textos del sitio).
 */

'use strict';

const bcrypt = require('bcryptjs');
const { getDatabase, persistToDisk } = require('./database');

/* ── DDL ──────────────────────────────────────────────────── */

const DDL_USUARIOS = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password  TEXT    NOT NULL,           -- bcrypt hash
    rol       TEXT    NOT NULL DEFAULT 'admin',
    creado_en TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );
`;

const DDL_AVISOS = `
  CREATE TABLE IF NOT EXISTS avisos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo           TEXT    NOT NULL,
    descripcion      TEXT    NOT NULL,
    categoria        TEXT    NOT NULL CHECK(categoria IN (
                       'comunicado','evento','tramites',
                       'academico','medio-ambiente','salud')),
    fecha_publicacion TEXT   NOT NULL DEFAULT (date('now','localtime')),
    color_etiqueta   TEXT    NOT NULL DEFAULT '#1A4B8C',
    activo           INTEGER NOT NULL DEFAULT 1  -- 1=visible, 0=oculto
  );
`;

const DDL_TEXTOS_SITIO = `
  CREATE TABLE IF NOT EXISTS textos_sitio (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    clave      TEXT    NOT NULL UNIQUE,   -- identificador único (ej. 'mision')
    seccion    TEXT    NOT NULL,          -- a qué sección pertenece (ej. 'nosotros')
    etiqueta   TEXT    NOT NULL,          -- nombre legible (ej. 'Misión')
    contenido  TEXT    NOT NULL,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`;

/* ── Datos iniciales (seeder) ─────────────────────────────── */

const TEXTOS_INICIALES = [
  {
    clave:    'mision',
    seccion:  'nosotros',
    etiqueta: 'Misión',
    contenido: 'Ofrecer una educación preescolar integral y de calidad que favorezca el desarrollo de habilidades, capacidades y valores en las niñas y niños, mediante ambientes de aprendizaje seguros y una participación activa de la comunidad escolar.',
  },
  {
    clave:    'vision',
    seccion:  'nosotros',
    etiqueta: 'Visión',
    contenido: 'Ser una institución de educación inicial reconocida en el municipio por su compromiso formativo, su calidez y la adopción de medios eficientes que fortalezcan la comunicación y la confianza con los padres de familia.',
  },
  {
    clave:    'valores',
    seccion:  'nosotros',
    etiqueta: 'Valores',
    contenido: 'Respeto · Responsabilidad · Colaboración',
  },
  {
    clave:    'direccion',
    seccion:  'contacto',
    etiqueta: 'Dirección',
    contenido: 'San Pedro Pozohuacán, Tecámac, Estado de México, C.P. 55740',
  },
  {
    clave:    'telefono',
    seccion:  'contacto',
    etiqueta: 'Teléfono',
    contenido: '(55) 0000-0000',
  },
  {
    clave:    'email',
    seccion:  'contacto',
    etiqueta: 'Correo electrónico',
    contenido: 'contacto@kinder-heredia.edu.mx',
  },
  {
    clave:    'horario',
    seccion:  'contacto',
    etiqueta: 'Horario de atención',
    contenido: 'Lunes a Viernes: 8:00 – 13:00 h',
  },
  {
    clave:    'cct',
    seccion:  'contacto',
    etiqueta: 'Clave del Centro de Trabajo',
    contenido: '15EPR0000A',
  },
  {
    clave:    'ciclo_escolar',
    seccion:  'hero',
    etiqueta: 'Ciclo Escolar',
    contenido: '2025 – 2026',
  },
  {
    clave:    'mensaje_bienvenida',
    seccion:  'hero',
    etiqueta: 'Mensaje de bienvenida',
    contenido: 'Bienvenidas y bienvenidos a nuestra comunidad escolar. Aquí encontrarás avisos, información institucional y todo lo necesario para mantenerte al día con las actividades del plantel.',
  },
];

const AVISOS_INICIALES = [
  {
    titulo: 'Inicio del periodo de inscripciones 2026–2027',
    descripcion: 'Se informa a los padres de familia que el periodo de inscripciones para el próximo ciclo escolar estará abierto del 1 al 15 de julio. Presentarse con documentación completa.',
    categoria: 'comunicado',
    fecha_publicacion: '2026-06-20',
    color_etiqueta: '#1A4B8C',
  },
  {
    titulo: 'Festival de clausura del ciclo escolar',
    descripcion: 'Los invitamos a la festividad de clausura el día viernes 28 de junio a las 10:00 h en el patio principal.',
    categoria: 'evento',
    fecha_publicacion: '2026-06-28',
    color_etiqueta: '#F5C518',
  },
  {
    titulo: 'Entrega de boletas de evaluación',
    descripcion: 'La entrega de boletas finales se realizará el lunes 30 de junio en horario de 8:00 a 12:00 h. Es obligatoria la presencia del tutor o padre de familia.',
    categoria: 'tramites',
    fecha_publicacion: '2026-06-15',
    color_etiqueta: '#7c3aed',
  },
  {
    titulo: 'Semana de reforzamiento de pensamiento matemático',
    descripcion: 'Durante la semana del 17 al 21 de junio se llevarán actividades especiales de estimulación lógico-matemática para los tres grados.',
    categoria: 'academico',
    fecha_publicacion: '2026-06-10',
    color_etiqueta: '#2E9E5B',
  },
  {
    titulo: 'Jornada de reforestación escolar',
    descripcion: 'Con motivo del Día Mundial del Medio Ambiente, el plantel realizó una jornada de siembra de árboles con la participación de alumnos, docentes y padres de familia.',
    categoria: 'medio-ambiente',
    fecha_publicacion: '2026-06-05',
    color_etiqueta: '#059669',
  },
  {
    titulo: 'Campaña de vacunación — Unidad Móvil SEP',
    descripcion: 'La unidad móvil de vacunación visitará el plantel el día 10 de junio. Se solicita presentar la cartilla de vacunación actualizada.',
    categoria: 'salud',
    fecha_publicacion: '2026-06-01',
    color_etiqueta: '#dc2626',
  },
];

/* ── Función principal ────────────────────────────────────── */

async function initSchema() {
  const db = await getDatabase();

  // 1. Crear tablas
  db.run(DDL_USUARIOS);
  db.run(DDL_AVISOS);
  db.run(DDL_TEXTOS_SITIO);

  // 2. Seeder: usuario admin (solo si la tabla está vacía)
  const usersResult = db.exec('SELECT COUNT(*) AS cnt FROM usuarios;');
  const usersCount  = usersResult[0]?.values[0][0] ?? 0;

  if (usersCount === 0) {
    const adminUser = process.env.ADMIN_USER     || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin1234!';
    const hash      = bcrypt.hashSync(adminPass, 12); // 12 rounds

    const stmt = db.prepare(
      'INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?);'
    );
    stmt.run([adminUser, hash, 'admin']);
    stmt.free();

    console.log(`[DB] Usuario admin creado → usuario: "${adminUser}"`);
  }

  // 3. Seeder: textos del sitio (solo si la tabla está vacía)
  const txtResult = db.exec('SELECT COUNT(*) AS cnt FROM textos_sitio;');
  const txtCount  = txtResult[0]?.values[0][0] ?? 0;

  if (txtCount === 0) {
    const stmtTxt = db.prepare(
      'INSERT INTO textos_sitio (clave, seccion, etiqueta, contenido) VALUES (?, ?, ?, ?);'
    );
    TEXTOS_INICIALES.forEach(t => {
      stmtTxt.run([t.clave, t.seccion, t.etiqueta, t.contenido]);
    });
    stmtTxt.free();
    console.log(`[DB] ${TEXTOS_INICIALES.length} textos del sitio insertados.`);
  }

  // 4. Seeder: avisos (solo si la tabla está vacía)
  const avisoResult = db.exec('SELECT COUNT(*) AS cnt FROM avisos;');
  const avisoCount  = avisoResult[0]?.values[0][0] ?? 0;

  if (avisoCount === 0) {
    const stmtAv = db.prepare(
      `INSERT INTO avisos (titulo, descripcion, categoria, fecha_publicacion, color_etiqueta)
       VALUES (?, ?, ?, ?, ?);`
    );
    AVISOS_INICIALES.forEach(a => {
      stmtAv.run([a.titulo, a.descripcion, a.categoria, a.fecha_publicacion, a.color_etiqueta]);
    });
    stmtAv.free();
    console.log(`[DB] ${AVISOS_INICIALES.length} avisos de ejemplo insertados.`);
  }

  // 5. Persistir en disco
  persistToDisk();
  console.log('[DB] Base de datos inicializada y guardada en disco.');
}

module.exports = { initSchema };
