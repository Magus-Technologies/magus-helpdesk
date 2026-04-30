const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const BASE_URL = process.env.FRONTEND_URL || 'https://magus-ecommerce.com';

const htmlBase = (titulo, contenido) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .container{max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  .header{background:#0D0F14;padding:24px;text-align:center}
  .header h1{color:#4F7FFF;margin:0;font-size:22px}
  .header p{color:#7A85A3;margin:4px 0 0;font-size:13px}
  .body{padding:28px}
  .body h2{color:#1a1a2e;margin:0 0 16px}
  .body p{color:#555;line-height:1.6;margin:0 0 12px}
  .btn{display:inline-block;background:#4F7FFF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0}
  .ticket-card{background:#f8f9ff;border:1px solid #e0e5ff;border-radius:8px;padding:16px;margin:16px 0}
  .ticket-card .field{display:flex;margin-bottom:8px;font-size:14px}
  .ticket-card .label{color:#888;min-width:120px;font-weight:500}
  .ticket-card .value{color:#333}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
  .badge-alta{background:#FFF3E0;color:#E65100}
  .badge-critica{background:#FCE4EC;color:#B71C1C}
  .badge-media{background:#E3F2FD;color:#1565C0}
  .badge-baja{background:#E8F5E9;color:#2E7D32}
  .footer{background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#888}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>● Magus Help Desk</h1>
    <p>magus-ecommerce.com</p>
  </div>
  <div class="body">${contenido}</div>
  <div class="footer">
    <p>Este es un mensaje automático de Magus Help Desk. No responder a este email.</p>
    <p><a href="${BASE_URL}" style="color:#4F7FFF">Acceder al portal →</a></p>
  </div>
</div>
</body></html>`;

const notificarTicketCreado = async (ticket) => {
  try {
    const cliente = await query('SELECT email, nombre FROM usuarios WHERE id = $1', [ticket.cliente_id]);
    if (!cliente.rows.length) return;
    const u = cliente.rows[0];

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: u.email,
      subject: `[${ticket.codigo}] Ticket creado: ${ticket.asunto}`,
      html: htmlBase('Ticket Creado', `
        <h2>Hola ${u.nombre},</h2>
        <p>Tu ticket de soporte fue registrado exitosamente. Nuestro equipo lo atenderá pronto.</p>
        <div class="ticket-card">
          <div class="field"><span class="label">Código:</span><span class="value">${ticket.codigo}</span></div>
          <div class="field"><span class="label">Asunto:</span><span class="value">${ticket.asunto}</span></div>
          <div class="field"><span class="label">Prioridad:</span><span class="value"><span class="badge badge-${ticket.prioridad}">${ticket.prioridad.toUpperCase()}</span></span></div>
          <div class="field"><span class="label">Estado:</span><span class="value">Nuevo</span></div>
        </div>
        <a href="${BASE_URL}/tickets/${ticket.id}" class="btn">Ver mi ticket →</a>
      `)
    });
    logger.info(`Email enviado: ticket creado ${ticket.codigo} → ${u.email}`);
  } catch (err) {
    logger.error('Error email notificarTicketCreado:', err.message);
  }
};

const notificarComentario = async (ticketId, comentario) => {
  try {
    const ticket = await query(
      `SELECT t.*, u.email, u.nombre FROM tickets t
       JOIN usuarios u ON t.cliente_id = u.id WHERE t.id = $1`, [ticketId]
    );
    if (!ticket.rows.length || comentario.tipo === 'interno') return;
    const t = ticket.rows[0];

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: t.email,
      subject: `[TK-${String(t.numero).padStart(4,'0')}] Nueva respuesta en tu ticket`,
      html: htmlBase('Nueva Respuesta', `
        <h2>Hola ${t.nombre},</h2>
        <p>Tu ticket recibió una nueva respuesta:</p>
        <div class="ticket-card">
          <p style="color:#333;line-height:1.6">${comentario.contenido}</p>
        </div>
        <a href="${BASE_URL}/tickets/${ticketId}" class="btn">Ver respuesta completa →</a>
      `)
    });
  } catch (err) {
    logger.error('Error email notificarComentario:', err.message);
  }
};

const enviarEncuestaSatisfaccion = async (ticket) => {
  try {
    const encuesta = await query(
      `SELECT es.token, u.email, u.nombre FROM encuestas_satisfaccion es
       JOIN usuarios u ON es.cliente_id = u.id WHERE es.ticket_id = $1`, [ticket.id]
    );
    if (!encuesta.rows.length) return;
    const { token, email, nombre } = encuesta.rows[0];

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `¿Cómo fue tu experiencia? — Ticket ${ticket.codigo || ''} resuelto`,
      html: htmlBase('Encuesta de Satisfacción', `
        <h2>Hola ${nombre},</h2>
        <p>Tu ticket fue resuelto. ¿Cómo calificarías la atención recibida?</p>
        <div style="text-align:center;margin:24px 0">
          ${[1,2,3,4,5].map(n => `
            <a href="${BASE_URL}/encuesta/${token}?cal=${n}" style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background:#f5f5f5;color:#333;text-decoration:none;font-size:20px;margin:0 4px;text-align:center">${n}⭐</a>
          `).join('')}
        </div>
        <p style="text-align:center"><a href="${BASE_URL}/encuesta/${token}" class="btn">Responder encuesta →</a></p>
      `)
    });
    await query('UPDATE encuestas_satisfaccion SET enviada_en = NOW() WHERE token = $1', [token]);
  } catch (err) {
    logger.error('Error email enviarEncuestaSatisfaccion:', err.message);
  }
};

module.exports = { notificarTicketCreado, notificarComentario, enviarEncuestaSatisfaccion };
