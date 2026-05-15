/**
 * MAGUS HELP DESK — Utilidades de fecha/hora
 * Zona horaria: America/Lima (GMT-5, Perú)
 */

const TZ = 'America/Lima';

// Formato completo: "15/05/2026 14:32"
export const fmtFechaHora = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-PE', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Solo fecha: "15/05/2026"
export const fmtFecha = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-PE', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Solo hora: "14:32"
export const fmtHora = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleTimeString('es-PE', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Tiempo relativo desde ahora: "hace 2h 15m" o "hace 30s"
// Siempre positivo, nunca negativo
export const fmtRelativo = (fecha) => {
  if (!fecha) return '—';
  // Convertir a hora Lima para calcular diferencia correcta
  const ahora = new Date();
  const dt = new Date(fecha);
  const diff = ahora - dt; // ms

  if (diff < 0) return 'ahora'; // nunca negativo
  if (diff < 60000) return `hace ${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return m > 0 ? `hace ${h}h ${m}m` : `hace ${h}h`;
  }
  if (diff < 604800000) {
    const d = Math.floor(diff / 86400000);
    return `hace ${d} día${d !== 1 ? 's' : ''}`;
  }
  // Más de 7 días: mostrar fecha
  return fmtFecha(fecha);
};

// Duración entre dos fechas: "2h 15m" o "45min" o "3d 2h"
export const fmtDuracion = (inicio, fin) => {
  if (!inicio) return '—';
  const desde = new Date(inicio);
  const hasta = fin ? new Date(fin) : new Date();
  const diff = Math.max(0, hasta - desde); // nunca negativo

  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
};

// Formato tooltip: "Jueves 15 de mayo 2026, 14:32:05"
export const fmtTooltip = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleString('es-PE', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};
