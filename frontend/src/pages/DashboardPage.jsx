import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';
import { useDevice } from '../hooks/useDevice';

const PRIO_COLOR = { critica:'var(--red)', alta:'var(--amber)', media:'#4FC3F7', baja:'var(--muted)' };

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuthStore();
  const { isMobile } = useDevice();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;
  if (!data) return <div className="empty-state"><div className="icon">⚠</div><p>Error al cargar</p></div>;

  const { hoy, estados, prioridades, agentes, sla, satisfaccion, tendencia7dias } = data;

  if (isMobile) {
    return (
      <div className="fade-in">
        {/* Saludo */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:800 }}>Hola, {usuario?.nombre} 👋</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Aquí está el resumen de hoy</div>
        </div>

        {/* KPIs 2x2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Tickets hoy',    value:hoy?.total??0,        color:'var(--accent)',  icon:'◈' },
            { label:'Pendientes',     value:hoy?.pendientes??0,   color:'var(--amber)',   icon:'⏱' },
            { label:'Vencidos SLA',   value:hoy?.vencidos_sla??0, color:'var(--red)',     icon:'⚠' },
            { label:'% SLA OK',       value:`${hoy?.pct_sla??0}%`,color:'var(--green)',  icon:'✓' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="card" style={{ position:'relative', overflow:'hidden', padding:14 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
              <div style={{ fontSize:26, fontWeight:800, color, marginBottom:2 }}>{value}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Métricas clave */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { label:'FRT',   value:sla?.frt_promedio_min?`${sla.frt_promedio_min}m`:'—', color:'var(--accent)' },
            { label:'Resolución', value:sla?.ttr_promedio_min?`${Math.round(sla.ttr_promedio_min/60)}h`:'—', color:'var(--amber)' },
            { label:'CSAT',  value:satisfaccion?.csat?`${satisfaccion.csat}★`:'—', color:'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ textAlign:'center', padding:'12px 8px' }}>
              <div style={{ fontSize:20, fontWeight:800, color }}>{value}</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Estados */}
        {estados && Object.keys(estados).length > 0 && (
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>📊 Por estado</div>
            {Object.entries(estados).filter(([,v]) => v > 0).map(([estado, cant]) => (
              <div key={estado} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}
                onClick={() => navigate(`/tickets?estado=${estado}`)} >
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span className={`badge badge-${estado}`} style={{ fontSize:10 }}>{estado.replace(/_/g,' ')}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:80, height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, (cant/Math.max(...Object.values(estados)))*100)}%`, background:'var(--accent)', borderRadius:2 }}/>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)', minWidth:20, textAlign:'right' }}>{cant}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carga agentes (solo admin) */}
        {agentes && agentes.length > 0 && (
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>🧑‍💻 Carga del equipo</div>
            {agentes.slice(0, 5).map(a => (
              <div key={a.nombre} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--purple))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {a.nombre?.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nombre}</div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:2, marginTop:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(a.tickets_abiertos/20)*100)}%`, background:a.tickets_abiertos>15?'var(--red)':a.tickets_abiertos>8?'var(--amber)':'var(--green)', borderRadius:2 }}/>
                  </div>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>{a.tickets_abiertos}</span>
              </div>
            ))}
          </div>
        )}

        {/* Acciones rápidas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo Ticket</button>
          <button className="btn btn-ghost" onClick={() => navigate('/tickets?estado=nuevo')}>Ver nuevos</button>
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div className="fade-in">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Tickets hoy', value:hoy?.total??0, color:'var(--accent)', sub:'Total creados hoy' },
          { label:'Pendientes',  value:hoy?.pendientes??0, color:'var(--amber)', sub:'Sin resolver' },
          { label:'Vencidos SLA',value:hoy?.vencidos_sla??0, color:'var(--red)', sub:'Requieren atención' },
          { label:'Cumpl. SLA',  value:`${hoy?.pct_sla??0}%`, color:'var(--green)', sub:'Esta semana' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="card" style={{ position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }}/>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:700, color }}>{value}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'FRT Promedio', value:sla?.frt_promedio_min?`${sla.frt_promedio_min}min`:'N/D', color:'var(--accent)' },
          { label:'Resolución Prom.', value:sla?.ttr_promedio_min?`${Math.round(sla.ttr_promedio_min/60)}h`:'N/D', color:'var(--amber)' },
          { label:'CSAT', value:satisfaccion?.csat?`${satisfaccion.csat} ★`:'N/D', color:'var(--amber)', sub:`${satisfaccion?.total??0} encuestas` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:24, fontWeight:700, color }}>{value}</div>
            {sub && <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {agentes && agentes.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ fontWeight:600, marginBottom:12 }}>Carga de agentes</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
            {agentes.slice(0,6).map(a => (
              <div key={a.nombre} style={{ padding:12, background:'var(--surface)', borderRadius:8 }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>{a.nombre}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>{a.tickets_abiertos} tickets</div>
                <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                  <div className={`sla-fill ${a.tickets_abiertos>15?'sla-danger':a.tickets_abiertos>8?'sla-warn':'sla-ok'}`} style={{ width:`${Math.min(100,(a.tickets_abiertos/20)*100)}%`, height:'100%', borderRadius:2 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo Ticket</button>
        <button className="btn btn-ghost" onClick={() => navigate('/tickets?estado=nuevo')}>Ver tickets nuevos</button>
        <button className="btn btn-ghost" onClick={() => navigate('/reportes')}>Ver reportes</button>
      </div>
    </div>
  );
}
