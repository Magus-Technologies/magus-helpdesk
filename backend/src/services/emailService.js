const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const logger = require('../config/logger');

const BASE_URL = process.env.FRONTEND_URL || 'https://magus-ecommerce.com';
const EMPRESA = process.env.EMPRESA_NOMBRE || 'Magus Help Desk';

// ─────────────────────────────────────────────────────────────
// Transporter con reconexión automática
// ─────────────────────────────────────────────────────────────
let transporter;

const crearTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
    maxConnections: 5,
    rateDelta: 1000,
    rateLimit: 5
  });
};
crearTransporter();

// ─────────────────────────────────────────────────────────────
// Plantilla HTML base
// ─────────────────────────────────────────────────────────────
const prioColores = {
  critica: { bg:'#FCE4EC', color:'#B71C1C', label:'🔴 CRÍTICA' },
  alta:    { bg:'#FFF3E0', color:'#E65100', label:'🟡 ALTA' },
  media:   { bg:'#E3F2FD', color:'#1565C0', label:'🔵 MEDIA' },
  baja:    { bg:'#E8F5E9', color:'#2E7D32', label:'🟢 BAJA' }
};
const estadoLabel = {
  nuevo:'Nuevo', asignado:'Asignado', en_progreso:'En Progreso',
  en_espera_cliente:'En Espera (cliente)', en_espera_interno:'En Espera (interno)',
  resuelto:'Resuelto ✅', cerrado:'Cerrado', cancelado:'Cancelado'
};

const htmlBase = (titulo, preheader, contenido, accentColor = '#4F7FFF') => `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#0D0F14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:#0D0F14;">${preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0F14;padding:24px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#161A24;border-radius:16px;overflow:hidden;border:1px solid #2A3147;">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#0D0F14,#1a1f35);padding:28px 32px;border-bottom:3px solid ${accentColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td><span style="font-size:22px;font-weight:800;color:${accentColor};">●</span><span style="font-size:18px;font-weight:800;color:#E8ECF5;"> ${EMPRESA}</span></td>
            <td align="right"><span style="font-size:11px;color:#7A85A3;">magus-ecommerce.com</span></td>
          </tr>
        </table>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:32px;">
        ${contenido}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#0D0F14;padding:20px 32px;border-top:1px solid #2A3147;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#7A85A3;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
        <p style="margin:0;font-size:12px;"><a href="${BASE_URL}" style="color:${accentColor};text-decoration:none;">Acceder al portal de soporte →</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

const ticketCard = (t) => {
  const prio = prioColores[t.prioridad] || prioColores.media;
  return `
  <div style="background:#1E2330;border:1px solid #2A3147;border-radius:10px;padding:18px;margin:16px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:8px;">
        <span style="font-family:monospace;font-size:13px;background:#0D0F14;color:#4F7FFF;padding:3px 10px;border-radius:4px;font-weight:700;">${t.codigo||'—'}</span>
      </td></tr>
      <tr><td style="padding-bottom:12px;">
        <span style="font-size:16px;font-weight:700;color:#E8ECF5;">${t.asunto||'—'}</span>
      </td></tr>
      <tr><td><table cellpadding="4" cellspacing="0">
        <tr><td style="color:#7A85A3;font-size:12px;width:110px;">Prioridad</td>
            <td><span style="background:${prio.bg};color:${prio.color};font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">${prio.label}</span></td></tr>
        ${t.estado?`<tr><td style="color:#7A85A3;font-size:12px;">Estado</td><td style="font-size:13px;color:#E8ECF5;font-weight:600;">${estadoLabel[t.estado]||t.estado}</td></tr>`:''}
        ${t.categoria_nombre?`<tr><td style="color:#7A85A3;font-size:12px;">Categoría</td><td style="font-size:13px;color:#E8ECF5;">${t.categoria_nombre}</td></tr>`:''}
        ${t.agente_nombre?`<tr><td style="color:#7A85A3;font-size:12px;">Técnico</td><td style="font-size:13px;color:#22C97A;font-weight:600;">👤 ${t.agente_nombre}</td></tr>`:''}
      </table></td></tr>
    </table>
  </div>`;
};

const btnPrimario = (texto, url) =>
  `<table cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0 8px;">
     <a href="${url}" style="background:#4F7FFF;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">${texto}</a>
   </td></tr></table>`;

// ─────────────────────────────────────────────────────────────
// Helper: enviar mail con retry
// ─────────────────────────────────────────────────────────────
const enviarMail = async (opciones, reintentos = 2) => {
  for (let i = 0; i <= reintentos; i++) {
    try {
      const info = await transporter.sendMail(opciones);
      logger.info(`📧 Email enviado: ${opciones.subject} → ${opciones.to}`);
      return info;
    } catch (err) {
      if (i === reintentos) throw err;
      logger.warn(`Email reintento ${i+1}: ${err.message}`);
      crearTransporter();
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Helper: obtener admins del tenant
// ─────────────────────────────────────────────────────────────
const getAdmins = async (tenantId) => {
  const res = await query(
    `SELECT email, nombre FROM usuarios WHERE tenant_id=$1 AND rol IN('admin','supervisor') AND activo=TRUE`,
    [tenantId]
  );
  return res.rows;
};

// ─────────────────────────────────────────────────────────────
// 1. TICKET CREADO → cliente + todos los admins
// ─────────────────────────────────────────────────────────────
const notificarTicketCreado = async (ticket) => {
  try {
    // Datos completos del ticket
    const tRes = await query(`
      SELECT t.*,
        CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo,
        uc.nombre AS cliente_nombre, uc.email AS cliente_email, uc.telefono AS cliente_tel,
        ua.nombre||' '||ua.apellido AS agente_nombre, ua.email AS agente_email,
        c.nombre AS categoria_nombre, e.nombre AS empresa_nombre
      FROM tickets t
      LEFT JOIN usuarios uc ON t.cliente_id=uc.id
      LEFT JOIN usuarios ua ON t.agente_id=ua.id
      LEFT JOIN categorias c ON t.categoria_id=c.id
      LEFT JOIN empresas e ON t.empresa_id=e.id
      WHERE t.id=$1`, [ticket.id]);

    if (!tRes.rows.length) return;
    const t = { ...ticket, ...tRes.rows[0] };

    // A — Email al CLIENTE
    if (t.cliente_email) {
      await enviarMail({
        from: process.env.EMAIL_FROM,
        to: t.cliente_email,
        subject: `[${t.codigo}] Tu ticket fue registrado exitosamente`,
        html: htmlBase(
          'Ticket registrado',
          `Tu ticket ${t.codigo} fue creado: ${t.asunto}`,
          `
          <h2 style="color:#E8ECF5;margin:0 0 8px;">Hola ${t.cliente_nombre||''},</h2>
          <p style="color:#7A85A3;font-size:14px;line-height:1.7;margin:0 0 4px;">Tu ticket de soporte fue registrado exitosamente. Nuestro equipo de soporte lo atenderá a la brevedad.</p>
          ${ticketCard(t)}
          <p style="color:#7A85A3;font-size:13px;margin:4px 0 0;">Puedes seguir el estado de tu ticket en tiempo real desde el portal.</p>
          ${btnPrimario('Ver mi ticket →', `${BASE_URL}/tickets/${t.id}`)}
          `
        )
      });
    }

    // B — Email a ADMINS/SUPERVISORES
    const admins = await getAdmins(ticket.tenant_id);
    for (const admin of admins) {
      await enviarMail({
        from: process.env.EMAIL_FROM,
        to: admin.email,
        subject: `[NUEVO] ${t.codigo} — ${t.asunto}`,
        html: htmlBase(
          'Nuevo ticket',
          `Nuevo ticket creado por ${t.cliente_nombre}: ${t.asunto}`,
          `
          <h2 style="color:#E8ECF5;margin:0 0 8px;">Nuevo ticket creado</h2>
          <p style="color:#7A85A3;font-size:14px;margin:0 0 4px;">
            <strong style="color:#4F7FFF;">${t.cliente_nombre||'Cliente'}</strong>
            ${t.empresa_nombre?` (${t.empresa_nombre})`:''}
            acaba de abrir un nuevo ticket de soporte.
          </p>
          ${ticketCard(t)}
          <div style="background:#0D0F14;border-radius:8px;padding:14px;margin:8px 0;border-left:3px solid #4F7FFF;">
            <p style="color:#7A85A3;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px;">Descripción</p>
            <p style="color:#E8ECF5;font-size:13px;margin:0;line-height:1.7;">${(t.descripcion||'').substring(0,300)}${(t.descripcion||'').length>300?'...':''}</p>
          </div>
          ${t.agente_nombre
            ?`<p style="color:#22C97A;font-size:13px;font-weight:700;">✓ Asignado a: ${t.agente_nombre}</p>`
            :`<p style="color:#F5A623;font-size:13px;font-weight:700;">⚠ Sin técnico asignado — asignar desde el portal</p>`
          }
          ${btnPrimario('Gestionar ticket →', `${BASE_URL}/tickets/${t.id}`)}
          `,
          '#F5A623'
        )
      });
    }

    // C — Email al TÉCNICO asignado (si hay)
    if (t.agente_email && t.agente_id !== ticket.cliente_id) {
      await enviarMail({
        from: process.env.EMAIL_FROM,
        to: t.agente_email,
        subject: `[ASIGNADO] ${t.codigo} — ${t.asunto}`,
        html: htmlBase(
          'Ticket asignado',
          `Se te asignó el ticket ${t.codigo}`,
          `
          <h2 style="color:#E8ECF5;margin:0 0 8px;">Se te asignó un ticket</h2>
          <p style="color:#7A85A3;font-size:14px;margin:0 0 4px;">
            El ticket <strong style="color:#4F7FFF;">${t.codigo}</strong> fue asignado a ti para su atención.
          </p>
          ${ticketCard(t)}
          ${btnPrimario('Atender ticket →', `${BASE_URL}/tickets/${t.id}`)}
          `,
          '#22C97A'
        )
      });
    }

  } catch (err) {
    logger.error('Error notificarTicketCreado:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 2. CAMBIO DE ESTADO → cliente
// ─────────────────────────────────────────────────────────────
const notificarCambioEstado = async (ticketId, estadoAnterior, estadoNuevo) => {
  if (estadoAnterior === estadoNuevo) return;
  try {
    const res = await query(`
      SELECT t.*,
        CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo,
        uc.nombre AS cliente_nombre, uc.email AS cliente_email,
        ua.nombre||' '||ua.apellido AS agente_nombre,
        c.nombre AS categoria_nombre
      FROM tickets t
      LEFT JOIN usuarios uc ON t.cliente_id=uc.id
      LEFT JOIN usuarios ua ON t.agente_id=ua.id
      LEFT JOIN categorias c ON t.categoria_id=c.id
      WHERE t.id=$1`, [ticketId]);

    if (!res.rows.length || !res.rows[0].cliente_email) return;
    const t = res.rows[0];

    const accentMap = {
      en_progreso:'#F5A623', asignado:'#4F7FFF', resuelto:'#22C97A',
      cerrado:'#7A85A3', en_espera_cliente:'#9B59FF', en_espera_interno:'#9B59FF'
    };
    const accent = accentMap[estadoNuevo] || '#4F7FFF';

    const mensajes = {
      asignado:         `Tu ticket fue asignado a un técnico y será atendido pronto.`,
      en_progreso:      `Tu ticket está siendo atendido por nuestro equipo de soporte.`,
      en_espera_cliente:`Tu ticket está en espera. Si tienes más información, por favor responde en el portal.`,
      en_espera_interno:`Tu ticket está en proceso de revisión interna.`,
      resuelto:         `¡Tu ticket fue marcado como resuelto! Si el problema persiste, puedes reabrirlo desde el portal.`,
      cerrado:          `Tu ticket fue cerrado. Gracias por contactarnos.`
    };

    await enviarMail({
      from: process.env.EMAIL_FROM,
      to: t.cliente_email,
      subject: `[${t.codigo}] Estado actualizado: ${estadoLabel[estadoNuevo]||estadoNuevo}`,
      html: htmlBase(
        'Estado actualizado',
        `Tu ticket ${t.codigo} cambió a ${estadoLabel[estadoNuevo]||estadoNuevo}`,
        `
        <h2 style="color:#E8ECF5;margin:0 0 8px;">Actualización de tu ticket</h2>
        <p style="color:#7A85A3;font-size:14px;line-height:1.7;margin:0 0 4px;">${mensajes[estadoNuevo]||`El estado de tu ticket cambió a <strong>${estadoLabel[estadoNuevo]||estadoNuevo}</strong>.`}</p>
        ${ticketCard({...t, estado:estadoNuevo})}
        <div style="background:#0D0F14;border-radius:8px;padding:12px 16px;margin:8px 0;display:inline-block;">
          <span style="color:#7A85A3;font-size:12px;">Estado anterior: </span>
          <span style="color:#7A85A3;font-size:13px;text-decoration:line-through;">${estadoLabel[estadoAnterior]||estadoAnterior}</span>
          <span style="color:#7A85A3;font-size:13px;"> → </span>
          <span style="color:${accent};font-size:13px;font-weight:700;">${estadoLabel[estadoNuevo]||estadoNuevo}</span>
        </div>
        ${btnPrimario('Ver mi ticket →', `${BASE_URL}/tickets/${ticketId}`)}
        `,
        accent
      )
    });

  } catch (err) {
    logger.error('Error notificarCambioEstado:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 3. REASIGNACIÓN DE TÉCNICO → cliente + técnico nuevo
// ─────────────────────────────────────────────────────────────
const notificarReasignacion = async (ticketId, agenteNuevoId) => {
  try {
    const res = await query(`
      SELECT t.*,
        CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo,
        uc.nombre AS cliente_nombre, uc.email AS cliente_email,
        ua.nombre||' '||ua.apellido AS agente_nombre, ua.email AS agente_email,
        c.nombre AS categoria_nombre
      FROM tickets t
      LEFT JOIN usuarios uc ON t.cliente_id=uc.id
      LEFT JOIN usuarios ua ON t.agente_id=ua.id
      LEFT JOIN categorias c ON t.categoria_id=c.id
      WHERE t.id=$1`, [ticketId]);

    if (!res.rows.length) return;
    const t = res.rows[0];

    // Email al CLIENTE
    if (t.cliente_email && t.agente_nombre) {
      await enviarMail({
        from: process.env.EMAIL_FROM,
        to: t.cliente_email,
        subject: `[${t.codigo}] Tu ticket fue asignado a un técnico`,
        html: htmlBase(
          'Técnico asignado',
          `${t.agente_nombre} atenderá tu ticket ${t.codigo}`,
          `
          <h2 style="color:#E8ECF5;margin:0 0 8px;">Técnico asignado a tu ticket</h2>
          <p style="color:#7A85A3;font-size:14px;line-height:1.7;margin:0 0 4px;">
            Tu ticket fue asignado a un técnico de soporte que estará a cargo de resolverlo.
          </p>
          ${ticketCard({...t, estado:t.estado})}
          <div style="background:#0D0F14;border:1px solid #22C97A33;border-radius:10px;padding:16px;margin:12px 0;text-align:center;">
            <p style="color:#7A85A3;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px;">Tu técnico asignado</p>
            <p style="color:#22C97A;font-size:20px;font-weight:800;margin:0;">👤 ${t.agente_nombre}</p>
          </div>
          ${btnPrimario('Ver mi ticket →', `${BASE_URL}/tickets/${ticketId}`)}
          `,
          '#22C97A'
        )
      });
    }

    // Email al TÉCNICO nuevo
    if (t.agente_email) {
      await enviarMail({
        from: process.env.EMAIL_FROM,
        to: t.agente_email,
        subject: `[ASIGNADO] ${t.codigo} — ${t.asunto}`,
        html: htmlBase(
          'Ticket asignado',
          `Se te asignó el ticket ${t.codigo}: ${t.asunto}`,
          `
          <h2 style="color:#E8ECF5;margin:0 0 8px;">Se te asignó un ticket</h2>
          <p style="color:#7A85A3;font-size:14px;margin:0 0 4px;">Un ticket fue asignado para tu atención.</p>
          ${ticketCard({...t, estado:t.estado})}
          <div style="background:#0D0F14;border-radius:8px;padding:14px;margin:8px 0;border-left:3px solid #4F7FFF;">
            <p style="color:#7A85A3;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Descripción</p>
            <p style="color:#E8ECF5;font-size:13px;margin:0;line-height:1.7;">${(t.descripcion||'').substring(0,250)}${(t.descripcion||'').length>250?'...':''}</p>
          </div>
          ${btnPrimario('Atender ahora →', `${BASE_URL}/tickets/${ticketId}`)}
          `,
          '#22C97A'
        )
      });
    }

  } catch (err) {
    logger.error('Error notificarReasignacion:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. NUEVA RESPUESTA → cliente (si la responde el agente)
// ─────────────────────────────────────────────────────────────
const notificarComentario = async (ticketId, comentario) => {
  try {
    if (comentario.tipo === 'interno') return; // notas internas no se notifican
    const res = await query(`
      SELECT t.*,
        CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo,
        uc.nombre AS cliente_nombre, uc.email AS cliente_email,
        ua.nombre||' '||ua.apellido AS agente_nombre
      FROM tickets t
      LEFT JOIN usuarios uc ON t.cliente_id=uc.id
      LEFT JOIN usuarios ua ON t.agente_id=ua.id
      WHERE t.id=$1`, [ticketId]);

    if (!res.rows.length) return;
    const t = res.rows[0];

    // Si el comentario lo hizo el cliente, notificar al técnico/admin
    if (comentario.autor_rol === 'cliente' || comentario.autor_id === t.cliente_id) {
      // Notificar al agente
      if (t.agente_email) {
        await enviarMail({
          from: process.env.EMAIL_FROM,
          to: t.agente_email,
          subject: `[${t.codigo}] El cliente respondió`,
          html: htmlBase(
            'Respuesta del cliente',
            `El cliente respondió en el ticket ${t.codigo}`,
            `
            <h2 style="color:#E8ECF5;margin:0 0 8px;">El cliente respondió</h2>
            ${ticketCard(t)}
            <div style="background:#0D0F14;border-radius:8px;padding:14px;margin:8px 0;border-left:3px solid #9B59FF;">
              <p style="color:#7A85A3;font-size:11px;margin:0 0 6px;">RESPUESTA DEL CLIENTE</p>
              <p style="color:#E8ECF5;font-size:13px;margin:0;line-height:1.7;">${(comentario.contenido||'').substring(0,400)}</p>
            </div>
            ${btnPrimario('Responder →', `${BASE_URL}/tickets/${ticketId}`)}
            `,
            '#9B59FF'
          )
        });
      }
      return;
    }

    // Si lo hizo el agente, notificar al cliente
    if (!t.cliente_email) return;
    await enviarMail({
      from: process.env.EMAIL_FROM,
      to: t.cliente_email,
      subject: `[${t.codigo}] Nueva respuesta de soporte`,
      html: htmlBase(
        'Nueva respuesta',
        `Tienes una nueva respuesta en tu ticket ${t.codigo}`,
        `
        <h2 style="color:#E8ECF5;margin:0 0 8px;">Hola ${t.cliente_nombre||''},</h2>
        <p style="color:#7A85A3;font-size:14px;margin:0 0 4px;">El equipo de soporte respondió tu ticket <strong style="color:#4F7FFF;">${t.codigo}</strong>.</p>
        <div style="background:#0D0F14;border-radius:8px;padding:16px;margin:16px 0;border-left:3px solid #4F7FFF;">
          <p style="color:#7A85A3;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px;">
            ${t.agente_nombre||'Soporte'} respondió:
          </p>
          <p style="color:#E8ECF5;font-size:14px;margin:0;line-height:1.8;">${(comentario.contenido||'').substring(0,500)}</p>
        </div>
        ${btnPrimario('Ver respuesta completa →', `${BASE_URL}/tickets/${ticketId}`)}
        `
      )
    });

  } catch (err) {
    logger.error('Error notificarComentario:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 5. ENCUESTA DE SATISFACCIÓN
// ─────────────────────────────────────────────────────────────
const enviarEncuestaSatisfaccion = async (ticket) => {
  try {
    const res = await query(`
      SELECT es.token, u.email, u.nombre, t.asunto,
        CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo
      FROM encuestas_satisfaccion es
      JOIN usuarios u ON es.cliente_id=u.id
      JOIN tickets t ON es.ticket_id=t.id
      WHERE es.ticket_id=$1 AND es.respondida=FALSE`, [ticket.id]);

    if (!res.rows.length) return;
    const { token, email, nombre, asunto, codigo } = res.rows[0];

    await enviarMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `¿Cómo fue tu experiencia? — ${codigo} resuelto`,
      html: htmlBase(
        'Encuesta de satisfacción',
        `Califica la atención en tu ticket ${codigo}`,
        `
        <h2 style="color:#E8ECF5;margin:0 0 8px;">Hola ${nombre||''},</h2>
        <p style="color:#7A85A3;font-size:14px;line-height:1.7;margin:0 0 4px;">
          Tu ticket <strong style="color:#4F7FFF;">${codigo}</strong> — <em>${asunto}</em> fue resuelto.
          ¿Cómo calificarías la atención recibida?
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td align="center">
            ${[1,2,3,4,5].map(n=>`
              <a href="${BASE_URL}/encuesta/${token}?cal=${n}"
                 style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:50%;background:#1E2330;border:2px solid #2A3147;color:#F5A623;text-decoration:none;font-size:22px;margin:0 4px;text-align:center;">
                ${n <= 3 ? '⭐' : n === 4 ? '🌟' : '💫'}
              </a>`).join('')}
          </td></tr>
          <tr><td align="center" style="padding-top:8px;">
            <span style="color:#7A85A3;font-size:11px;">1 = Muy malo &nbsp;·&nbsp; 5 = Excelente</span>
          </td></tr>
        </table>
        ${btnPrimario('Responder encuesta completa →', `${BASE_URL}/encuesta/${token}`)}
        `,
        '#F5A623'
      )
    });
    await query('UPDATE encuestas_satisfaccion SET enviada_en=NOW() WHERE token=$1', [token]);

  } catch (err) {
    logger.error('Error enviarEncuestaSatisfaccion:', err.message);
  }
};

module.exports = {
  notificarTicketCreado,
  notificarCambioEstado,
  notificarReasignacion,
  notificarComentario,
  enviarEncuestaSatisfaccion
};
