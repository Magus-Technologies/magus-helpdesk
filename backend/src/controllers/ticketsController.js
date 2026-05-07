const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const socketService = require('../services/socketService');
const waService = require('../services/whatsappService');

// GET /tickets
const listarTickets = async (req, res) => {
  try {
    const { estado, prioridad, agente_id, empresa_id, categoria_id,
            page = 1, limit = 25, buscar, orden = 'creado_en', dir = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.tenantId];
    const condiciones = ['t.tenant_id = $1'];

    // Clientes solo ven sus tickets
    if (req.user.rol === 'cliente') {
      condiciones.push(`t.cliente_id = $${params.length + 1}`);
      params.push(req.user.id);
    }
    // Técnico filtrado por agente_id explícito
    if (agente_id) { condiciones.push(`t.agente_id = $${params.length + 1}`); params.push(agente_id); }
    if (estado) { condiciones.push(`t.estado = $${params.length + 1}`); params.push(estado); }
    if (prioridad) { condiciones.push(`t.prioridad = $${params.length + 1}`); params.push(prioridad); }
    if (empresa_id) { condiciones.push(`t.empresa_id = $${params.length + 1}`); params.push(empresa_id); }
    if (categoria_id) { condiciones.push(`t.categoria_id = $${params.length + 1}`); params.push(categoria_id); }
    if (buscar) {
      condiciones.push(`(t.asunto ILIKE $${params.length + 1} OR CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) ILIKE $${params.length + 1})`);
      params.push(`%${buscar}%`);
    }

    const where = condiciones.join(' AND ');
    const camposOrden = ['creado_en','prioridad','estado','actualizado_en'];
    const ordenSeguro = camposOrden.includes(orden) ? `t.${orden}` : 't.creado_en';
    const dirSeguro = dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT
        t.id, CONCAT('TK-', LPAD(t.numero::TEXT, 4, '0')) AS codigo,
        t.asunto, t.estado, t.prioridad, t.canal_origen, t.tags,
        t.creado_en, t.actualizado_en, t.sla_resolucion_limite,
        t.sla_primera_respuesta_ok, t.sla_resolucion_ok,
        CASE WHEN t.sla_resolucion_limite < NOW() AND t.estado NOT IN ('resuelto','cerrado')
             THEN TRUE ELSE FALSE END AS sla_vencido,
        u_cli.nombre || ' ' || u_cli.apellido AS cliente_nombre,
        u_cli.email AS cliente_email,
        u_agt.id AS agente_id,
        u_agt.nombre || ' ' || u_agt.apellido AS agente_nombre,
        e.nombre AS empresa_nombre,
        c.nombre AS categoria_nombre,
        (SELECT COUNT(*) FROM ticket_comentarios WHERE ticket_id = t.id AND tipo = 'publico') AS total_respuestas
      FROM tickets t
      LEFT JOIN usuarios u_cli ON t.cliente_id = u_cli.id
      LEFT JOIN usuarios u_agt ON t.agente_id = u_agt.id
      LEFT JOIN empresas e ON t.empresa_id = e.id
      LEFT JOIN categorias c ON t.categoria_id = c.id
      WHERE ${where}
      ORDER BY ${ordenSeguro} ${dirSeguro}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit), offset);

    const [tickets, total] = await Promise.all([
      query(sql, params),
      query(`SELECT COUNT(*) FROM tickets t WHERE ${where}`, params.slice(0, -2))
    ]);

    res.json({
      tickets: tickets.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page),
      totalPaginas: Math.ceil(parseInt(total.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    logger.error('Error listarTickets:', err);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};

// GET /tickets/:id
const obtenerTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT t.*,
        CONCAT('TK-', LPAD(t.numero::TEXT, 4, '0')) AS codigo,
        u_cli.nombre || ' ' || u_cli.apellido AS cliente_nombre,
        u_cli.email AS cliente_email, u_cli.avatar_url AS cliente_avatar,
        u_agt.nombre || ' ' || u_agt.apellido AS agente_nombre, u_agt.email AS agente_email,
        u_sup.nombre || ' ' || u_sup.apellido AS supervisor_nombre,
        e.nombre AS empresa_nombre,
        c.nombre AS categoria_nombre, sc.nombre AS subcategoria_nombre,
        sp.nombre AS sla_nombre, sp.tiempo_primera_respuesta_min, sp.tiempo_resolucion_min,
        CASE WHEN t.sla_resolucion_limite < NOW() AND t.estado NOT IN ('resuelto','cerrado') THEN TRUE ELSE FALSE END AS sla_vencido
      FROM tickets t
      LEFT JOIN usuarios u_cli ON t.cliente_id = u_cli.id
      LEFT JOIN usuarios u_agt ON t.agente_id = u_agt.id
      LEFT JOIN usuarios u_sup ON t.supervisor_id = u_sup.id
      LEFT JOIN empresas e ON t.empresa_id = e.id
      LEFT JOIN categorias c ON t.categoria_id = c.id
      LEFT JOIN categorias sc ON t.subcategoria_id = sc.id
      LEFT JOIN sla_politicas sp ON t.sla_id = sp.id
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [id, req.tenantId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

    const ticket = result.rows[0];

    // Permisos: cliente solo puede ver sus propios tickets
    if (req.user.rol === 'cliente' && ticket.cliente_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    // Técnico solo puede ver sus tickets asignados
    if (req.user.rol === 'agente' && ticket.agente_id && ticket.agente_id !== req.user.id) {
      return res.status(403).json({ error: 'Este ticket no está asignado a ti' });
    }

    const [comentarios, historial, adjuntos] = await Promise.all([
      query(`
        SELECT tc.*, u.nombre || ' ' || u.apellido AS autor_nombre, u.rol AS autor_rol, u.id AS autor_id
        FROM ticket_comentarios tc
        LEFT JOIN usuarios u ON tc.autor_id = u.id
        WHERE tc.ticket_id = $1
        ORDER BY tc.creado_en ASC
      `, [id]),
      query(`
        SELECT th.*, u.nombre || ' ' || u.apellido AS usuario_nombre
        FROM ticket_historial th
        LEFT JOIN usuarios u ON th.usuario_id = u.id
        WHERE th.ticket_id = $1
        ORDER BY th.creado_en DESC LIMIT 50
      `, [id]),
      query('SELECT * FROM adjuntos WHERE ticket_id = $1 ORDER BY creado_en', [id])
    ]);

    res.json({
      ...ticket,
      comentarios: comentarios.rows.filter(c => req.user.rol !== 'cliente' || c.tipo !== 'interno'),
      historial: historial.rows,
      adjuntos: adjuntos.rows
    });
  } catch (err) {
    logger.error('Error obtenerTicket:', err);
    res.status(500).json({ error: 'Error al obtener ticket' });
  }
};

// POST /tickets
const crearTicket = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { asunto, descripcion, categoria_id, subcategoria_id, prioridad = 'media',
            empresa_id, agente_id, canal_origen = 'portal', tags } = req.body;

    if (!asunto || !descripcion) {
      return res.status(400).json({ error: 'Asunto y descripción son requeridos' });
    }

    const clienteId = req.user.rol === 'cliente' ? req.user.id : (req.body.cliente_id || req.user.id);

    const result = await client.query(`
      INSERT INTO tickets (id, tenant_id, asunto, descripcion, categoria_id, subcategoria_id,
                          prioridad, cliente_id, empresa_id, agente_id, canal_origen, tags,
                          estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, $13)
      RETURNING *, CONCAT('TK-', LPAD(numero::TEXT, 4, '0')) AS codigo
    `, [uuidv4(), req.tenantId, asunto, descripcion, categoria_id || null,
        subcategoria_id || null, prioridad, clienteId, empresa_id || null,
        agente_id || null, canal_origen, tags || [],
        agente_id ? 'asignado' : 'nuevo']);

    const ticket = result.rows[0];

    await client.query(`
      INSERT INTO ticket_historial (id, ticket_id, usuario_id, accion, valor_nuevo)
      VALUES ($1,$2,$3,'ticket_creado',$4)
    `, [uuidv4(), ticket.id, req.user.id, ticket.estado]);

    await client.query(`
      INSERT INTO encuestas_satisfaccion (id, ticket_id, cliente_id, token)
      VALUES ($1,$2,$3,$4)
    `, [uuidv4(), ticket.id, clienteId, uuidv4()]);

    await client.query('COMMIT');

    // Notificaciones asíncronas (email + WhatsApp)
    emailService.notificarTicketCreado(ticket).catch(e => logger.error('Email nuevo ticket:', e.message));
    waService.waTicketCreado(ticket.id).catch(e => logger.error('WA nuevo ticket:', e.message));
    socketService.emitirNuevoTicket(ticket);

    logger.info(`Ticket creado: ${ticket.codigo}`);
    res.status(201).json(ticket);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error crearTicket:', err);
    res.status(500).json({ error: 'Error al crear ticket' });
  } finally {
    client.release();
  }
};

// PATCH /tickets/:id
const actualizarTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, prioridad, agente_id, categoria_id, tags } = req.body;

    // Obtener estado actual para comparar
    const ticketActual = await query('SELECT estado, agente_id FROM tickets WHERE id=$1', [id]);
    if (!ticketActual.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });

    const estadoAnterior = ticketActual.rows[0].estado;
    const agenteAnterior = ticketActual.rows[0].agente_id;

    const campos = [];
    const valores = [];
    let idx = 1;

    if (estado) { campos.push(`estado = $${idx++}`); valores.push(estado); }
    if (prioridad) { campos.push(`prioridad = $${idx++}`); valores.push(prioridad); }
    if (agente_id !== undefined) { campos.push(`agente_id = $${idx++}`); valores.push(agente_id); }
    if (categoria_id) { campos.push(`categoria_id = $${idx++}`); valores.push(categoria_id); }
    if (tags) { campos.push(`tags = $${idx++}`); valores.push(tags); }

    if (estado === 'resuelto') campos.push(`resuelto_en = NOW()`);
    if (estado === 'cerrado') campos.push(`cerrado_en = NOW()`);

    if (campos.length === 0) return res.status(400).json({ error: 'Sin campos a actualizar' });

    valores.push(id, req.tenantId);
    const result = await query(
      `UPDATE tickets SET ${campos.join(',')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

    const ticketActualizado = result.rows[0];
    socketService.emitirTicketActualizado(ticketActualizado);

    // ── Notificaciones por cambio de ESTADO ──
    if (estado && estado !== estadoAnterior) {
      emailService.notificarCambioEstado(id, estadoAnterior, estado)
        .catch(e => logger.error('Email cambio estado:', e.message));
      waService.waCambioEstado(id, estadoAnterior, estado)
        .catch(e => logger.error('WA cambio estado:', e.message));
    }

    // ── Notificaciones por REASIGNACIÓN de técnico ──
    if (agente_id !== undefined && agente_id !== agenteAnterior && agente_id) {
      emailService.notificarReasignacion(id, agente_id)
        .catch(e => logger.error('Email reasignacion:', e.message));
      waService.waReasignacion(id)
        .catch(e => logger.error('WA reasignacion:', e.message));
    }

    // ── Encuesta al resolver ──
    if (estado === 'resuelto') {
      emailService.enviarEncuestaSatisfaccion(ticketActualizado)
        .catch(e => logger.error('Email encuesta:', e.message));
    }

    res.json(ticketActualizado);
  } catch (err) {
    logger.error('Error actualizarTicket:', err);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
};

// POST /tickets/:id/comentarios
const agregarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, tipo = 'publico' } = req.body;
    if (!contenido) return res.status(400).json({ error: 'Contenido requerido' });

    const tipoFinal = req.user.rol === 'cliente' ? 'publico' : tipo;

    const result = await query(`
      INSERT INTO ticket_comentarios (id, ticket_id, autor_id, contenido, tipo)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *,
        (SELECT nombre || ' ' || apellido FROM usuarios WHERE id = $3) AS autor_nombre,
        (SELECT rol FROM usuarios WHERE id = $3) AS autor_rol
    `, [uuidv4(), id, req.user.id, contenido, tipoFinal]);

    // Marcar primera respuesta del agente
    if (req.user.rol !== 'cliente') {
      await query(`
        UPDATE tickets SET
          primera_respuesta_en = COALESCE(primera_respuesta_en, NOW()),
          estado = CASE WHEN estado IN ('nuevo','asignado') THEN 'en_progreso' ELSE estado END
        WHERE id = $1
      `, [id]);
    }

    const comentario = result.rows[0];
    socketService.emitirNuevoComentario(id, comentario);

    // Notificar solo respuestas públicas
    if (tipoFinal === 'publico') {
      emailService.notificarComentario(id, comentario)
        .catch(e => logger.error('Email comentario:', e.message));
      // WA solo si fue el agente respondiendo al cliente
      if (req.user.rol !== 'cliente') {
        waService.waNuevaRespuesta(id, contenido)
          .catch(e => logger.error('WA comentario:', e.message));
      }
    }

    res.status(201).json(comentario);
  } catch (err) {
    logger.error('Error agregarComentario:', err);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

// GET /tickets/dashboard
const dashboardStats = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const [hoy, estados, prioridades, agentes, slaStats, satisfaccion, tendencia] = await Promise.all([
      query(`SELECT
        COUNT(*) AS total_hoy,
        COUNT(CASE WHEN estado NOT IN ('resuelto','cerrado','cancelado') THEN 1 END) AS pendientes,
        COUNT(CASE WHEN sla_resolucion_limite < NOW() AND estado NOT IN ('resuelto','cerrado') THEN 1 END) AS vencidos_sla,
        COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) AS sla_cumplidos,
        COUNT(CASE WHEN sla_resolucion_ok IS NOT NULL THEN 1 END) AS sla_evaluados
        FROM tickets WHERE tenant_id = $1 AND DATE(creado_en) = CURRENT_DATE`, [tenantId]),
      query(`SELECT estado, COUNT(*) FROM tickets WHERE tenant_id = $1 GROUP BY estado`, [tenantId]),
      query(`SELECT prioridad, COUNT(*) FROM tickets WHERE tenant_id = $1 AND estado NOT IN ('cerrado','cancelado') GROUP BY prioridad`, [tenantId]),
      query(`SELECT u.nombre || ' ' || u.apellido AS nombre,
             COUNT(t.id) AS tickets_abiertos,
             ROUND(AVG(t.tiempo_trabajado_min)) AS promedio_min
             FROM usuarios u LEFT JOIN tickets t ON t.agente_id = u.id
             AND t.estado NOT IN ('cerrado','resuelto') AND t.tenant_id = $1
             WHERE u.tenant_id = $1 AND u.rol IN ('agente','supervisor') AND u.activo = TRUE
             GROUP BY u.id, u.nombre, u.apellido ORDER BY tickets_abiertos DESC LIMIT 10`, [tenantId]),
      query(`SELECT
             ROUND(100.0 * COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) / NULLIF(COUNT(CASE WHEN sla_resolucion_ok IS NOT NULL THEN 1 END),0),1) AS pct_sla,
             ROUND(AVG(EXTRACT(EPOCH FROM (primera_respuesta_en - creado_en))/60)) AS frt_promedio_min,
             ROUND(AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/60)) AS ttr_promedio_min
             FROM tickets WHERE tenant_id = $1`, [tenantId]),
      query(`SELECT ROUND(AVG(calificacion),1) AS csat, COUNT(*) AS total
             FROM encuestas_satisfaccion es JOIN tickets t ON es.ticket_id = t.id
             WHERE t.tenant_id = $1 AND es.respondida = TRUE`, [tenantId]),
      query(`SELECT DATE(creado_en) AS fecha, COUNT(*) AS tickets
             FROM tickets WHERE tenant_id = $1 AND creado_en >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(creado_en) ORDER BY fecha`, [tenantId])
    ]);

    const estadoMap = estados.rows.reduce((acc, r) => { acc[r.estado] = parseInt(r.count); return acc; }, {});
    const hoyData = hoy.rows[0];

    res.json({
      hoy: {
        total: parseInt(hoyData.total_hoy),
        pendientes: parseInt(hoyData.pendientes),
        vencidos_sla: parseInt(hoyData.vencidos_sla),
        pct_sla: hoyData.sla_evaluados > 0 ? Math.round(100 * hoyData.sla_cumplidos / hoyData.sla_evaluados) : 0
      },
      estados: estadoMap,
      prioridades: prioridades.rows,
      agentes: agentes.rows,
      sla: slaStats.rows[0],
      satisfaccion: satisfaccion.rows[0],
      tendencia7dias: tendencia.rows
    });
  } catch (err) {
    logger.error('Error dashboard:', err);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

// POST /tickets/encuesta (público)
const responderEncuesta = async (req, res) => {
  try {
    const { token, calificacion, comentario } = req.body;
    if (!token || !calificacion) return res.status(400).json({ error: 'Token y calificación requeridos' });

    const result = await query(`
      UPDATE encuestas_satisfaccion
      SET calificacion=$1, comentario=$2, respondida=TRUE, respondida_en=NOW()
      WHERE token=$3 AND respondida=FALSE
      RETURNING *
    `, [calificacion, comentario, token]);

    if (result.rows.length === 0) return res.status(400).json({ error: 'Encuesta no válida o ya respondida' });

    // Actualizar SLA cumplimiento
    await query('UPDATE tickets SET sla_resolucion_ok = TRUE WHERE id = $1 AND sla_resolucion_ok IS NULL', [result.rows[0].ticket_id]);

    res.json({ mensaje: '¡Gracias por tu calificación!' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar encuesta' });
  }
};

module.exports = {
  listarTickets, obtenerTicket, crearTicket,
  actualizarTicket, agregarComentario,
  dashboardStats, responderEncuesta
};
