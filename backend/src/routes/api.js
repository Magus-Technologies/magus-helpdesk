const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const ticketsCtrl = require('../controllers/ticketsController');
const reportesCtrl = require('../controllers/reportesController');
const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Multer config
const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.gif','.pdf','.doc','.docx','.xls','.xlsx','.txt','.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ============================================================
// AUTH
// ============================================================
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', authMiddleware, authCtrl.logout);
router.get('/auth/me', authMiddleware, authCtrl.me);

// ============================================================
// DASHBOARD
// ============================================================
router.get('/dashboard', authMiddleware, ticketsCtrl.dashboardStats);

// ============================================================
// TICKETS
// ============================================================
router.get('/tickets', authMiddleware, ticketsCtrl.listarTickets);
router.post('/tickets', authMiddleware, ticketsCtrl.crearTicket);
router.get('/tickets/:id', authMiddleware, ticketsCtrl.obtenerTicket);
router.patch('/tickets/:id', authMiddleware, ticketsCtrl.actualizarTicket);
router.post('/tickets/:id/comentarios', authMiddleware, ticketsCtrl.agregarComentario);
router.post('/tickets/encuesta', ticketsCtrl.responderEncuesta); // público

// Adjuntos
router.post('/tickets/:id/adjuntos', authMiddleware, upload.array('archivos', 5), async (req, res) => {
  try {
    const adjuntos = [];
    for (const file of req.files) {
      const result = await query(`
        INSERT INTO adjuntos (id, ticket_id, nombre_original, nombre_almacenado, url, mime_type, tamano_bytes, subido_por)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [uuidv4(), req.params.id, file.originalname, file.filename,
          `/uploads/${file.filename}`, file.mimetype, file.size, req.user.id]);
      adjuntos.push(result.rows[0]);
    }
    res.json(adjuntos);
  } catch (err) {
    res.status(500).json({ error: 'Error al subir adjuntos' });
  }
});

// ============================================================
// USUARIOS
// ============================================================
router.get('/usuarios', authMiddleware, requireRol('admin','supervisor'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, apellido, email, rol, activo, ultimo_acceso, avatar_url, creado_en
       FROM usuarios WHERE tenant_id = $1 ORDER BY creado_en DESC`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

router.post('/usuarios', authMiddleware, requireRol('admin'), async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { nombre, apellido, email, rol, password } = req.body;
    if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Campos requeridos faltantes' });
    const hash = await bcrypt.hash(password, 12);
    const result = await query(`
      INSERT INTO usuarios (id, tenant_id, nombre, apellido, email, password_hash, rol)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, nombre, apellido, email, rol, creado_en
    `, [uuidv4(), req.tenantId, nombre, apellido, email.toLowerCase(), hash, rol]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.patch('/usuarios/:id', authMiddleware, requireRol('admin'), async (req, res) => {
  try {
    const { nombre, apellido, rol, activo } = req.body;
    const result = await query(`
      UPDATE usuarios SET nombre=COALESCE($1,nombre), apellido=COALESCE($2,apellido),
      rol=COALESCE($3,rol), activo=COALESCE($4,activo)
      WHERE id=$5 AND tenant_id=$6 RETURNING id, nombre, apellido, email, rol, activo
    `, [nombre, apellido, rol, activo, req.params.id, req.tenantId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar usuario' }); }
});

// ============================================================
// CATEGORÍAS
// ============================================================
router.get('/categorias', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM categorias WHERE tenant_id = $1 AND activo = TRUE ORDER BY orden, nombre`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener categorías' }); }
});

router.post('/categorias', authMiddleware, requireRol('admin','supervisor'), async (req, res) => {
  try {
    const { nombre, descripcion, icono, color, parent_id, area_responsable } = req.body;
    const result = await query(`
      INSERT INTO categorias (id, tenant_id, nombre, descripcion, icono, color, parent_id, area_responsable)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [uuidv4(), req.tenantId, nombre, descripcion, icono, color, parent_id || null, area_responsable]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al crear categoría' }); }
});

// ============================================================
// SLA
// ============================================================
router.get('/sla', authMiddleware, requireRol('admin','supervisor'), async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM sla_politicas WHERE tenant_id = $1 AND activo = TRUE ORDER BY CASE prioridad WHEN \'critica\' THEN 1 WHEN \'alta\' THEN 2 WHEN \'media\' THEN 3 ELSE 4 END',
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener SLA' }); }
});

router.put('/sla/:id', authMiddleware, requireRol('admin'), async (req, res) => {
  try {
    const { nombre, tiempo_primera_respuesta_min, tiempo_resolucion_min, horario, notificar_en_pct } = req.body;
    const result = await query(`
      UPDATE sla_politicas SET nombre=$1, tiempo_primera_respuesta_min=$2,
      tiempo_resolucion_min=$3, horario=$4, notificar_en_pct=$5
      WHERE id=$6 AND tenant_id=$7 RETURNING *
    `, [nombre, tiempo_primera_respuesta_min, tiempo_resolucion_min, horario, notificar_en_pct, req.params.id, req.tenantId]);
    if (!result.rows.length) return res.status(404).json({ error: 'SLA no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar SLA' }); }
});

// ============================================================
// EMPRESAS / CLIENTES
// ============================================================
router.get('/empresas', authMiddleware, requireRol('admin','supervisor','agente'), async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, COUNT(t.id) AS total_tickets,
       COUNT(CASE WHEN t.estado NOT IN ('cerrado','cancelado') THEN 1 END) AS tickets_abiertos
       FROM empresas e LEFT JOIN tickets t ON t.empresa_id = e.id
       WHERE e.tenant_id = $1 GROUP BY e.id ORDER BY e.nombre`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener empresas' }); }
});

// ============================================================
// REPORTES
// ============================================================
router.get('/reportes/general', authMiddleware, requireRol('admin','supervisor'), reportesCtrl.reporteGeneral);
router.get('/reportes/sla', authMiddleware, requireRol('admin','supervisor'), reportesCtrl.reporteSLA);

// ============================================================
// BASE DE CONOCIMIENTO
// ============================================================
router.get('/kb', authMiddleware, async (req, res) => {
  try {
    const { estado = 'publicado', buscar } = req.query;
    let sql = `SELECT ka.*, c.nombre AS categoria_nombre, u.nombre || ' ' || u.apellido AS autor_nombre
               FROM kb_articulos ka
               LEFT JOIN categorias c ON ka.categoria_id = c.id
               LEFT JOIN usuarios u ON ka.autor_id = u.id
               WHERE ka.tenant_id = $1 AND ka.estado = $2`;
    const params = [req.tenantId, estado];
    if (buscar) { sql += ` AND (ka.titulo ILIKE $3 OR ka.contenido ILIKE $3)`; params.push(`%${buscar}%`); }
    sql += ' ORDER BY ka.creado_en DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener artículos' }); }
});

router.post('/kb', authMiddleware, requireRol('admin','supervisor','agente'), async (req, res) => {
  try {
    const { titulo, contenido, resumen, categoria_id, estado = 'borrador', tags } = req.body;
    const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await query(`
      INSERT INTO kb_articulos (id, tenant_id, titulo, contenido, resumen, categoria_id, autor_id, estado, tags, slug)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [uuidv4(), req.tenantId, titulo, contenido, resumen, categoria_id || null, req.user.id, estado, tags || [], slug]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al crear artículo' }); }
});

// ============================================================
// NOTIFICACIONES
// ============================================================
router.get('/notificaciones', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 30',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener notificaciones' }); }
});

router.patch('/notificaciones/:id/leer', authMiddleware, async (req, res) => {
  try {
    await query('UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al marcar notificación' }); }
});

module.exports = router;
