/**
 * MAGUS HELP DESK — WhatsApp Service
 * Usa WhatsApp Web via whatsapp-web.js (sin API de pago)
 * 
 * SETUP SERVIDOR:
 *   npm install whatsapp-web.js qrcode-terminal
 *   Requiere Chrome/Chromium: sudo apt install chromium-browser
 * 
 * FLUJO:
 *   1. Al iniciar el servidor aparece un QR en consola
 *   2. Escanear con WhatsApp del número de soporte
 *   3. La sesión se guarda en ./wwebjs_auth y persiste entre reinicios
 */

const logger = require('../config/logger');
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.FRONTEND_URL || 'https://magus-ecommerce.com';
const EMPRESA = process.env.EMPRESA_NOMBRE || 'Magus Help Desk';
const WA_ENABLED = process.env.WHATSAPP_ENABLED === 'true';

let client = null;
let clientReady = false;
let qrCodeActual = null;
let estadoConexion = 'desconectado'; // desconectado | conectando | qr_pendiente | listo | error

// ─────────────────────────────────────────────────────────────
// Inicializar cliente WhatsApp
// ─────────────────────────────────────────────────────────────
const iniciarWhatsApp = async () => {
  if (!WA_ENABLED) {
    logger.info('WhatsApp deshabilitado (WHATSAPP_ENABLED != true)');
    return;
  }

  try {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: './wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        executablePath: process.env.CHROMIUM_PATH || undefined
      }
    });

    client.on('qr', (qr) => {
      qrCodeActual = qr;
      estadoConexion = 'qr_pendiente';
      logger.info('📱 WhatsApp QR generado — escanea desde el portal o consola:');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      clientReady = true;
      estadoConexion = 'listo';
      qrCodeActual = null;
      const info = client.info;
      logger.info(`✅ WhatsApp conectado: ${info?.wid?.user || 'número desconocido'}`);
    });

    client.on('authenticated', () => {
      estadoConexion = 'conectando';
      logger.info('WhatsApp autenticado');
    });

    client.on('auth_failure', (msg) => {
      estadoConexion = 'error';
      clientReady = false;
      logger.error('WhatsApp auth fallida:', msg);
    });

    client.on('disconnected', (reason) => {
      estadoConexion = 'desconectado';
      clientReady = false;
      logger.warn('WhatsApp desconectado:', reason);
      // Reconectar después de 30 segundos
      setTimeout(() => { if (WA_ENABLED) iniciarWhatsApp(); }, 30000);
    });

    estadoConexion = 'conectando';
    await client.initialize();

  } catch (err) {
    estadoConexion = 'error';
    logger.error('Error inicializando WhatsApp:', err.message);
    logger.warn('Asegúrate de instalar: npm install whatsapp-web.js qrcode-terminal');
    logger.warn('Y tener Chromium: sudo apt install chromium-browser');
  }
};

// ─────────────────────────────────────────────────────────────
// Enviar mensaje WA (con fallback silencioso)
// ─────────────────────────────────────────────────────────────
const enviarMensaje = async (telefono, mensaje) => {
  if (!WA_ENABLED || !clientReady || !client) {
    logger.debug(`WhatsApp no disponible, mensaje no enviado a ${telefono}`);
    return false;
  }
  try {
    // Normalizar número: quitar +, espacios, guiones → agregar @c.us
    const numero = telefono.replace(/[\s+\-()]/g, '');
    const chatId = `${numero}@c.us`;
    
    // Verificar que el número existe en WA
    const existe = await client.isRegisteredUser(chatId);
    if (!existe) {
      logger.warn(`Número ${telefono} no registrado en WhatsApp`);
      return false;
    }

    await client.sendMessage(chatId, mensaje);
    logger.info(`📱 WhatsApp enviado a ${telefono}`);
    return true;
  } catch (err) {
    logger.error(`Error enviando WhatsApp a ${telefono}:`, err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// Obtener teléfonos del ticket (cliente + empresa)
// ─────────────────────────────────────────────────────────────
const getTelefonos = async (ticketId) => {
  const res = await query(`
    SELECT
      uc.telefono AS cliente_tel, uc.nombre AS cliente_nombre,
      e.telefono AS empresa_tel,
      ua.telefono AS agente_tel, ua.nombre||' '||ua.apellido AS agente_nombre,
      t.asunto, t.estado, t.prioridad,
      CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS codigo,
      c.nombre AS categoria
    FROM tickets t
    LEFT JOIN usuarios uc ON t.cliente_id=uc.id
    LEFT JOIN empresas e ON t.empresa_id=e.id
    LEFT JOIN usuarios ua ON t.agente_id=ua.id
    LEFT JOIN categorias c ON t.categoria_id=c.id
    WHERE t.id=$1`, [ticketId]);
  return res.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────
// Plantillas de mensajes WhatsApp
// ─────────────────────────────────────────────────────────────
const EMOJIS_ESTADO = {
  nuevo:'🆕', asignado:'👤', en_progreso:'⚙️', en_espera_cliente:'⏳',
  en_espera_interno:'🔄', resuelto:'✅', cerrado:'🔒', cancelado:'❌'
};
const EMOJIS_PRIO = { critica:'🔴', alta:'🟡', media:'🔵', baja:'🟢' };

const msgTicketCreado = (t) => `
*${EMPRESA}* 🎫

¡Hola ${t.cliente_nombre}! Tu ticket de soporte fue registrado.

📋 *Código:* ${t.codigo}
📝 *Asunto:* ${t.asunto}
${EMOJIS_PRIO[t.prioridad]} *Prioridad:* ${t.prioridad?.toUpperCase()}
${t.categoria?`📁 *Categoría:* ${t.categoria}\n`:''}
🔗 Ver ticket: ${BASE_URL}/tickets

Nuestro equipo lo atenderá a la brevedad. ⏱`.trim();

const msgCambioEstado = (t, estadoAnterior, estadoNuevo) => `
*${EMPRESA}* 🔔

Actualización en tu ticket *${t.codigo}*

${EMOJIS_ESTADO[estadoNuevo]||'📌'} *Nuevo estado:* ${estadoNuevo.replace(/_/g,' ').toUpperCase()}
${t.agente_nombre?`👤 *Técnico:* ${t.agente_nombre}\n`:''}
📝 *Asunto:* ${t.asunto}

🔗 Ver detalle: ${BASE_URL}/tickets`.trim();

const msgTecnicoAsignado = (t) => `
*${EMPRESA}* 👤

¡Hola ${t.cliente_nombre}! Tu ticket tiene un técnico asignado.

📋 *Ticket:* ${t.codigo}
👤 *Técnico asignado:* *${t.agente_nombre}*
📝 *Asunto:* ${t.asunto}
⚙️ *Estado:* En atención

Tu técnico revisará el caso y te contactará pronto.
🔗 ${BASE_URL}/tickets`.trim();

const msgResuelto = (t, tokenEncuesta) => `
*${EMPRESA}* ✅

¡Tu ticket fue *RESUELTO*! 

📋 *Ticket:* ${t.codigo}
📝 *Asunto:* ${t.asunto}
👤 *Atendido por:* ${t.agente_nombre||'Soporte'}

¿Cómo fue la atención? Califícanos:
⭐ ${BASE_URL}/encuesta/${tokenEncuesta}

¡Gracias por confiar en nosotros! 🙏`.trim();

const msgNuevaRespuesta = (t, extractoRespuesta) => `
*${EMPRESA}* 💬

Nueva respuesta en tu ticket *${t.codigo}*

💬 "${extractoRespuesta.substring(0,120)}${extractoRespuesta.length>120?'...':''}"

🔗 Ver respuesta completa: ${BASE_URL}/tickets`.trim();

// ─────────────────────────────────────────────────────────────
// Funciones públicas
// ─────────────────────────────────────────────────────────────
const waTicketCreado = async (ticketId) => {
  if (!WA_ENABLED) return;
  try {
    const t = await getTelefonos(ticketId);
    if (!t) return;
    const msg = msgTicketCreado(t);
    const tels = [t.cliente_tel, t.empresa_tel].filter(Boolean);
    for (const tel of tels) await enviarMensaje(tel, msg);
  } catch (err) { logger.error('waTicketCreado:', err.message); }
};

const waCambioEstado = async (ticketId, estadoAnterior, estadoNuevo) => {
  if (!WA_ENABLED || estadoAnterior === estadoNuevo) return;
  try {
    const t = await getTelefonos(ticketId);
    if (!t) return;

    // Mensaje especial si se asignó técnico
    if (estadoNuevo === 'asignado' && t.agente_nombre) {
      const msg = msgTecnicoAsignado(t);
      const tels = [t.cliente_tel, t.empresa_tel].filter(Boolean);
      for (const tel of tels) await enviarMensaje(tel, msg);
      return;
    }

    // Mensaje si fue resuelto — agregar link encuesta
    if (estadoNuevo === 'resuelto') {
      const enc = await query('SELECT token FROM encuestas_satisfaccion WHERE ticket_id=$1', [ticketId]);
      const token = enc.rows[0]?.token || '';
      const msg = msgResuelto(t, token);
      const tels = [t.cliente_tel, t.empresa_tel].filter(Boolean);
      for (const tel of tels) await enviarMensaje(tel, msg);
      return;
    }

    // Resto de cambios de estado
    const msg = msgCambioEstado(t, estadoAnterior, estadoNuevo);
    const tels = [t.cliente_tel, t.empresa_tel].filter(Boolean);
    for (const tel of tels) await enviarMensaje(tel, msg);

  } catch (err) { logger.error('waCambioEstado:', err.message); }
};

const waNuevaRespuesta = async (ticketId, contenido) => {
  if (!WA_ENABLED) return;
  try {
    const t = await getTelefonos(ticketId);
    if (!t || !t.cliente_tel) return;
    const msg = msgNuevaRespuesta(t, contenido);
    await enviarMensaje(t.cliente_tel, msg);
  } catch (err) { logger.error('waNuevaRespuesta:', err.message); }
};

const waReasignacion = async (ticketId) => {
  if (!WA_ENABLED) return;
  try {
    const t = await getTelefonos(ticketId);
    if (!t) return;
    const msg = msgTecnicoAsignado(t);
    const tels = [t.cliente_tel, t.empresa_tel].filter(Boolean);
    for (const tel of tels) await enviarMensaje(tel, msg);
    // También notificar al técnico nuevo
    if (t.agente_tel) {
      await enviarMensaje(t.agente_tel,
        `*${EMPRESA}* 📋\n\nSe te asignó el ticket *${t.codigo}*\n📝 ${t.asunto}\n\n🔗 ${BASE_URL}/tickets`
      );
    }
  } catch (err) { logger.error('waReasignacion:', err.message); }
};

module.exports = {
  iniciarWhatsApp,
  waTicketCreado,
  waCambioEstado,
  waNuevaRespuesta,
  waReasignacion,
  getEstado: () => ({ estado: estadoConexion, listo: clientReady }),
  getQR: () => qrCodeActual
};
