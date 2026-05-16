/**
 * MAGUS HELP DESK
 * Hook y componente: bloqueo de ticket fuera de horario
 * 
 * INSTRUCCIONES DE USO:
 * 1. Copiar este archivo a: frontend/src/utils/horarioUtils.js
 * 2. En NuevoTicketPage (extra-pages.jsx), importar y usar como se indica abajo
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL HORARIO
// El horario se lee del backend (/api/horario)
// Pero también hay un fallback hardcodeado aquí como respaldo
// ─────────────────────────────────────────────────────────────

const TZ = 'America/Lima';

/**
 * Verifica si ahora mismo está dentro del horario de atención
 * @param {object} horario - objeto del backend con dias y horarios
 * @returns {{ abierto: boolean, mensaje: string, proximaApertura: string }}
 */
export const verificarHorario = (horario) => {
  if (!horario) return { abierto: true }; // si no hay config, permitir

  const ahora = new Date();

  // Obtener día y hora actuales en Lima
  const partes = new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(ahora);

  const diaTexto = partes.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
  const horaStr = partes.find(p => p.type === 'hour')?.value || '00';
  const minStr  = partes.find(p => p.type === 'minute')?.value || '00';
  const horaActual = parseInt(horaStr) * 60 + parseInt(minStr);

  // Mapear nombre del día en español → clave del objeto horario
  const mapasDia = {
    'lunes': 'lunes', 'martes': 'martes', 'miércoles': 'miercoles',
    'miercoles': 'miercoles', 'jueves': 'jueves', 'viernes': 'viernes',
    'sábado': 'sabado', 'sabado': 'sabado', 'domingo': 'domingo'
  };
  const claveHoy = mapasDia[diaTexto] || diaTexto;
  const configHoy = horario[claveHoy];

  // Si hoy está desactivado o sin horario → cerrado
  if (!configHoy?.activo || !configHoy.desde || !configHoy.hasta) {
    return {
      abierto: false,
      diaHoy: claveHoy,
      proximaApertura: calcularProximaApertura(horario, claveHoy),
      telefono: horario.telefono_urgencias || '',
      mensaje: horario.mensaje_fuera_horario || ''
    };
  }

  // Parsear horario del día
  const [hDesde, mDesde] = configHoy.desde.split(':').map(Number);
  const [hHasta, mHasta] = configHoy.hasta.split(':').map(Number);
  const minDesde = hDesde * 60 + mDesde;
  const minHasta = hHasta * 60 + mHasta;

  const dentroDeHorario = horaActual >= minDesde && horaActual < minHasta;

  if (dentroDeHorario) {
    return { abierto: true };
  }

  // Fuera de horario — calcular cuándo abre
  return {
    abierto: false,
    diaHoy: claveHoy,
    hoyAbre: horaActual < minDesde ? configHoy.desde : null, // abre más tarde hoy
    proximaApertura: calcularProximaApertura(horario, claveHoy, horaActual < minDesde ? claveHoy : null),
    telefono: horario.telefono_urgencias || '',
    mensaje: horario.mensaje_fuera_horario || ''
  };
};

const ORDEN_DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const LABELS_DIAS = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };

const calcularProximaApertura = (horario, diaActual, mismoDia = null) => {
  // Si abre más tarde hoy
  if (mismoDia) {
    const cfg = horario[mismoDia];
    if (cfg?.activo && cfg.desde) return `hoy a las ${cfg.desde}`;
  }

  // Buscar el próximo día hábil
  const idxHoy = ORDEN_DIAS.indexOf(diaActual);
  for (let i = 1; i <= 7; i++) {
    const idx = (idxHoy + i) % 7;
    const dia = ORDEN_DIAS[idx];
    const cfg = horario[dia];
    if (cfg?.activo && cfg.desde) {
      return `${i === 1 ? 'mañana' : 'el ' + LABELS_DIAS[dia]} a las ${cfg.desde}`;
    }
  }
  return 'próximamente';
};

/**
 * Genera el horario formateado para mostrar en el mensaje
 * Ej: "Lunes a Viernes: 8:00 – 18:00 | Sábado: 9:00 – 13:00"
 */
export const formatearHorarioLegible = (horario) => {
  if (!horario) return '';
  const lineas = [];
  const dias = ORDEN_DIAS;

  // Agrupar días consecutivos con mismo horario
  let grupo = [];
  let ultimoHorario = null;

  const flushGrupo = () => {
    if (!grupo.length) return;
    const primero = LABELS_DIAS[grupo[0]];
    const ultimo  = LABELS_DIAS[grupo[grupo.length - 1]];
    const rangoLabel = grupo.length === 1 ? primero : grupo.length === 2 ? `${primero} y ${ultimo}` : `${primero} a ${ultimo}`;
    lineas.push(`• ${rangoLabel}: ${ultimoHorario}`);
    grupo = [];
    ultimoHorario = null;
  };

  for (const dia of dias) {
    const cfg = horario[dia];
    if (cfg?.activo && cfg.desde && cfg.hasta) {
      const horStr = `${cfg.desde} – ${cfg.hasta}`;
      if (horStr === ultimoHorario) {
        grupo.push(dia);
      } else {
        flushGrupo();
        grupo = [dia];
        ultimoHorario = horStr;
      }
    } else {
      flushGrupo();
    }
  }
  flushGrupo();

  return lineas.join('\n');
};
