const cron = require('node-cron');
const { query } = require('../config/database');
const emailService = require('./emailService');
const socketService = require('./socketService');
const logger = require('../config/logger');

const iniciarCronJobs = () => {
  // Cada 5 minutos: verificar SLA próximos a vencer
  cron.schedule('*/5 * * * *', async () => {
    try {
      const alertas = await query(`
        SELECT t.*, CONCAT('TK-', LPAD(t.numero::TEXT, 4, '0')) AS codigo,
               sp.notificar_en_pct
        FROM tickets t
        JOIN sla_politicas sp ON t.sla_id = sp.id
        WHERE t.estado NOT IN ('resuelto','cerrado','cancelado')
          AND t.sla_resolucion_limite IS NOT NULL
          AND EXTRACT(EPOCH FROM (t.sla_resolucion_limite - NOW())) > 0
          AND EXTRACT(EPOCH FROM (NOW() - t.creado_en)) /
              EXTRACT(EPOCH FROM (t.sla_resolucion_limite - t.creado_en)) * 100
              >= sp.notificar_en_pct
          AND (t.metadatos->>'sla_alerta_enviada') IS NULL
      `);

      for (const ticket of alertas.rows) {
        socketService.emitirAlertaSLA(ticket);
        // Marcar que ya se alertó
        await query(`UPDATE tickets SET metadatos = metadatos || '{"sla_alerta_enviada": true}' WHERE id = $1`, [ticket.id]);
        logger.info(`Alerta SLA emitida: ${ticket.codigo}`);
      }
    } catch (err) {
      logger.error('Error cron SLA alertas:', err);
    }
  });

  // Cada hora: marcar SLA vencidos
  cron.schedule('0 * * * *', async () => {
    try {
      const vencidos = await query(`
        UPDATE tickets
        SET sla_resolucion_ok = FALSE
        WHERE sla_resolucion_limite < NOW()
          AND estado NOT IN ('resuelto','cerrado','cancelado')
          AND sla_resolucion_ok IS NULL
        RETURNING id
      `);
      if (vencidos.rowCount > 0) {
        logger.info(`${vencidos.rowCount} tickets marcados como SLA vencido`);
      }
    } catch (err) {
      logger.error('Error cron SLA vencidos:', err);
    }
  });

  // Cada hora: cierre automático de tickets en espera > 48h
  cron.schedule('30 * * * *', async () => {
    try {
      const cerrados = await query(`
        UPDATE tickets
        SET estado = 'cerrado', cerrado_en = NOW()
        WHERE estado IN ('en_espera_cliente','resuelto')
          AND actualizado_en < NOW() - INTERVAL '48 hours'
        RETURNING id, tenant_id
      `);

      for (const t of cerrados.rows) {
        await query(`
          INSERT INTO ticket_historial (id, ticket_id, accion, valor_anterior, valor_nuevo)
          VALUES (gen_random_uuid(), $1, 'cierre_automatico', 'en_espera_cliente', 'cerrado')
        `, [t.id]);
        // Enviar encuesta de satisfacción
        emailService.enviarEncuestaSatisfaccion(t).catch(e => logger.error(e));
      }

      if (cerrados.rowCount > 0) {
        logger.info(`${cerrados.rowCount} tickets cerrados automáticamente`);
      }
    } catch (err) {
      logger.error('Error cron cierre automático:', err);
    }
  });

  logger.info('Cron jobs iniciados correctamente');
};

module.exports = { iniciarCronJobs };
