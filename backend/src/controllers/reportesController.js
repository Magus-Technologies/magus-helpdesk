const { query } = require('../config/database');
const logger = require('../config/logger');

// GET /reportes/general
const reporteGeneral = async (req, res) => {
  try {
    const { desde, hasta, agente_id, empresa_id } = req.query;
    const tenantId = req.tenantId;
    const params = [tenantId];
    let filtros = 'tenant_id = $1';

    if (desde) { filtros += ` AND creado_en >= $${params.length + 1}`; params.push(desde); }
    if (hasta) { filtros += ` AND creado_en <= $${params.length + 1}`; params.push(hasta + ' 23:59:59'); }
    if (agente_id) { filtros += ` AND agente_id = $${params.length + 1}`; params.push(agente_id); }
    if (empresa_id) { filtros += ` AND empresa_id = $${params.length + 1}`; params.push(empresa_id); }

    const [totales, porEstado, porPrioridad, porCategoria, sla, frt, ttr, csat, porDia, porAgente] = await Promise.all([
      query(`SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN estado = 'nuevo' THEN 1 END) AS nuevos,
        COUNT(CASE WHEN estado = 'en_progreso' THEN 1 END) AS en_progreso,
        COUNT(CASE WHEN estado IN ('resuelto','cerrado') THEN 1 END) AS resueltos,
        COUNT(CASE WHEN estado NOT IN ('resuelto','cerrado','cancelado') THEN 1 END) AS abiertos,
        COUNT(CASE WHEN sla_resolucion_limite < NOW() AND estado NOT IN ('resuelto','cerrado') THEN 1 END) AS vencidos
        FROM tickets WHERE ${filtros}`, params),

      query(`SELECT estado, COUNT(*) as cantidad FROM tickets WHERE ${filtros} GROUP BY estado`, params),

      query(`SELECT prioridad, COUNT(*) as cantidad FROM tickets WHERE ${filtros} GROUP BY prioridad`, params),

      query(`SELECT c.nombre AS categoria, COUNT(t.id) AS cantidad, 
             ROUND(AVG(t.tiempo_trabajado_min)) AS promedio_min
             FROM tickets t LEFT JOIN categorias c ON t.categoria_id = c.id
             WHERE ${filtros.replace('tenant_id', 't.tenant_id')}
             GROUP BY c.nombre ORDER BY cantidad DESC LIMIT 10`, params),

      query(`SELECT
        COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) AS cumplidos,
        COUNT(CASE WHEN sla_resolucion_ok = FALSE THEN 1 END) AS incumplidos,
        ROUND(100.0 * COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) / NULLIF(COUNT(CASE WHEN sla_resolucion_ok IS NOT NULL THEN 1 END),0),1) AS pct_cumplimiento
        FROM tickets WHERE ${filtros}`, params),

      query(`SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (primera_respuesta_en - creado_en))/60)) AS frt_promedio_min,
        ROUND(MIN(EXTRACT(EPOCH FROM (primera_respuesta_en - creado_en))/60)) AS frt_min,
        ROUND(MAX(EXTRACT(EPOCH FROM (primera_respuesta_en - creado_en))/60)) AS frt_max
        FROM tickets WHERE ${filtros} AND primera_respuesta_en IS NOT NULL`, params),

      query(`SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/60)) AS ttr_promedio_min,
        ROUND(MIN(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/60)) AS ttr_min,
        ROUND(MAX(EXTRACT(EPOCH FROM (resuelto_en - creado_en))/60)) AS ttr_max
        FROM tickets WHERE ${filtros} AND resuelto_en IS NOT NULL`, params),

      query(`SELECT ROUND(AVG(es.calificacion),2) AS promedio, COUNT(*) AS total,
        COUNT(CASE WHEN calificacion = 5 THEN 1 END) AS cinco,
        COUNT(CASE WHEN calificacion = 4 THEN 1 END) AS cuatro,
        COUNT(CASE WHEN calificacion = 3 THEN 1 END) AS tres,
        COUNT(CASE WHEN calificacion <= 2 THEN 1 END) AS bajo
        FROM encuestas_satisfaccion es JOIN tickets t ON es.ticket_id = t.id
        WHERE ${filtros.replace('tenant_id', 't.tenant_id')} AND es.respondida = TRUE`, params),

      query(`SELECT DATE(creado_en) AS fecha, COUNT(*) AS creados,
        COUNT(CASE WHEN estado IN ('resuelto','cerrado') THEN 1 END) AS resueltos
        FROM tickets WHERE ${filtros}
        GROUP BY DATE(creado_en) ORDER BY fecha DESC LIMIT 30`, params),

      query(`SELECT u.nombre || ' ' || u.apellido AS agente, u.id AS agente_id,
        COUNT(t.id) AS total_tickets,
        COUNT(CASE WHEN t.estado IN ('resuelto','cerrado') THEN 1 END) AS resueltos,
        ROUND(AVG(t.tiempo_trabajado_min)) AS promedio_tiempo,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.primera_respuesta_en - t.creado_en))/60)) AS frt_promedio,
        COUNT(CASE WHEN t.sla_resolucion_ok = TRUE THEN 1 END) AS sla_cumplidos,
        ROUND(AVG(es.calificacion),1) AS csat
        FROM usuarios u
        LEFT JOIN tickets t ON t.agente_id = u.id AND t.${filtros}
        LEFT JOIN encuestas_satisfaccion es ON es.ticket_id = t.id AND es.respondida = TRUE
        WHERE u.tenant_id = $1 AND u.rol IN ('agente','supervisor') AND u.activo = TRUE
        GROUP BY u.id, u.nombre, u.apellido
        ORDER BY total_tickets DESC`, [tenantId])
    ]);

    res.json({
      totales: totales.rows[0],
      por_estado: porEstado.rows,
      por_prioridad: porPrioridad.rows,
      por_categoria: porCategoria.rows,
      sla: sla.rows[0],
      frt: frt.rows[0],
      ttr: ttr.rows[0],
      csat: csat.rows[0],
      tendencia_diaria: porDia.rows,
      por_agente: porAgente.rows
    });
  } catch (err) {
    logger.error('Error reporteGeneral:', err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
};

// GET /reportes/sla
const reporteSLA = async (req, res) => {
  try {
    const result = await query(`
      SELECT sp.nombre, sp.prioridad, sp.tiempo_primera_respuesta_min, sp.tiempo_resolucion_min,
        COUNT(t.id) AS total_tickets,
        COUNT(CASE WHEN t.sla_primera_respuesta_ok = TRUE THEN 1 END) AS primera_resp_ok,
        COUNT(CASE WHEN t.sla_resolucion_ok = TRUE THEN 1 END) AS resolucion_ok,
        ROUND(100.0 * COUNT(CASE WHEN t.sla_resolucion_ok = TRUE THEN 1 END) / NULLIF(COUNT(t.id),0),1) AS pct_cumplimiento
      FROM sla_politicas sp
      LEFT JOIN tickets t ON t.sla_id = sp.id
      WHERE sp.tenant_id = $1 AND sp.activo = TRUE
      GROUP BY sp.id, sp.nombre, sp.prioridad, sp.tiempo_primera_respuesta_min, sp.tiempo_resolucion_min
      ORDER BY CASE sp.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END
    `, [req.tenantId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reporte SLA' });
  }
};

module.exports = { reporteGeneral, reporteSLA };
