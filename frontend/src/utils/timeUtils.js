/**
 * MAGUS HELP DESK — Utilidades de fecha/hora
 * Zona horaria forzada: America/Lima (GMT-5, Perú)
 */

const TZ = 'America/Lima';

// El servidor devuelve UTC — si no tiene Z lo agregamos
const parseFecha = (fecha) => {
  if (!fecha) return null;
  const str = String(fecha);
  if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    return new Date(str + 'Z');
  }
  return new Date(str);
};

// Formato: "15/05/2026, 09:48"
export const fmtFechaHora = (fecha) => {
  if (!fecha) return '—';
  const dt = parseFecha(fecha);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleString('es-PE', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
};

// Solo fecha: "15/05/2026"
export const fmtFecha = (fecha) => {
  if (!fecha) return '—';
  const dt = parseFecha(fecha);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleDateString('es-PE', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

// Solo hora: "09:48"
export const fmtHora = (fecha) => {
  if (!fecha) return '—';
  const dt = parseFecha(fecha);
  if (!dt || isNaN(dt)) return '—';
  return dt.toLocaleTimeString('es-PE', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false
  });
};

// Tiempo relativo — nunca negativo
export const fmtRelativo = (fecha) => {
  if (!fecha) return '—';
  const dt = parseFecha(fecha);
  if (!dt || isNaN(dt)) return '—';
  const diff = Date.now() - dt.getTime();
  if (diff < 0) return 'ahora mismo';
  if (diff < 60000) return diff < 5000 ? 'ahora mismo' : `hace ${Math.floor(diff/1000)}s`;
  if (diff < 3600000) return `hace ${Math.floor(diff/60000)}min`;
  if (diff < 86400000) {
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    return m > 0 ? `hace ${h}h ${m}m` : `hace ${h}h`;
  }
  if (diff < 604800000) return `hace ${Math.floor(diff/86400000)}d`;
  return fmtFecha(fecha);
};

// Duración entre dos fechas
export const fmtDuracion = (inicio, fin) => {
  if (!inicio) return '—';
  let desde, hasta;
  if (typeof inicio === 'number') {
    desde = inicio; hasta = typeof fin === 'number' ? fin : Date.now();
  } else {
    const di = parseFecha(inicio);
    const df = fin ? parseFecha(fin) : new Date();
    if (!di || isNaN(di)) return '—';
    desde = di.getTime(); hasta = df ? df.getTime() : Date.now();
  }
  const diff = Math.max(0, hasta - desde);
  const s = Math.floor(diff/1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m/60); const rm = m%60;
  if (h < 24) return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h/24); const rh = h%24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
};

// Tooltip completo
export const fmtTooltip = (fecha) => {
  if (!fecha) return '';
  const dt = parseFecha(fecha);
  if (!dt || isNaN(dt)) return '';
  return dt.toLocaleString('es-PE', {
    timeZone: TZ, weekday:'long', day:'numeric', month:'long',
    year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false
  });
};

// Reloj en tiempo real
export const horaActualLima = () => new Date().toLocaleTimeString('es-PE', {
  timeZone: TZ, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false
});
