import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';
import { useDevice } from '../hooks/useDevice';
import { fmtFechaHora, fmtRelativo, fmtDuracion, fmtTooltip } from '../utils/timeUtils';

const ESTADOS = ['todos','nuevo','asignado','en_progreso','en_espera_cliente','resuelto','cerrado'];
const E_LABEL = { todos:'Todos', nuevo:'Nuevo', asignado:'Asignado', en_progreso:'En progreso', en_espera_cliente:'En espera', resuelto:'Resuelto', cerrado:'Cerrado' };
const E_COLOR = { nuevo:'var(--accent)', asignado:'#4FC3F7', en_progreso:'var(--amber)', en_espera_cliente:'var(--purple)', resuelto:'var(--green)', cerrado:'var(--muted)' };
const PRIO_EMOJI = { critica:'🔴', alta:'🟡', media:'🔵', baja:'🟢' };

export default function TicketsPage() {
  const { usuario } = useAuthStore();
  const { isMobile } = useDevice();
  const esAdmin = ['admin','supervisor'].includes(usuario?.rol);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ estado:'todos', prioridad:'', page:1, buscar:'', solo_mios: !esAdmin });
  const [agentes, setAgentes] = useState([]);
  const [filtroAgente, setFiltroAgente] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const b = searchParams.get('buscar') || '';
    const e = searchParams.get('estado') || 'todos';
    setParams(p => ({ ...p, buscar: b, estado: e }));
    if (esAdmin) api.get('/usuarios').then(r => setAgentes(r.data.filter(u => ['agente','supervisor','admin'].includes(u.rol)))).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [params, filtroAgente]);

  const cargar = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (params.estado && params.estado !== 'todos') q.set('estado', params.estado);
      if (params.prioridad) q.set('prioridad', params.prioridad);
      if (params.buscar) q.set('buscar', params.buscar);
      if (params.solo_mios && usuario?.rol === 'agente') q.set('agente_id', usuario.id);
      if (filtroAgente && esAdmin) q.set('agente_id', filtroAgente);
      q.set('page', params.page); q.set('limit', 25);
      const res = await api.get(`/tickets?${q}`);
      setTickets(res.data.tickets); setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  const sp = (k, v) => setParams(p => ({ ...p, [k]: v, page: 1 }));

  const slaInfo = (t) => {
    if (!t.sla_resolucion_limite) return { pct: 0, color: 'var(--muted)' };
    const tot = new Date(t.sla_resolucion_limite) - new Date(t.creado_en);
    const trans = new Date() - new Date(t.creado_en);
    const pct = Math.min(100, Math.max(0, Math.round(trans / tot * 100)));
    return { pct, color: t.sla_vencido ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)' };
  };

  // ── MOBILE VIEW ──
  if (isMobile) {
    return (
      <div className="fade-in">
        {/* Búsqueda + filtro */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input placeholder="🔍 Buscar tickets..."
              value={params.buscar}
              onChange={e => setParams(p => ({ ...p, buscar: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && cargar()}
              style={{ flex:1, fontSize:16 }} />
            <button className="btn btn-ghost btn-icon" onClick={() => setMostrarFiltros(f => !f)}>
              ⚙
            </button>
          </div>

          {/* Filtros expandibles */}
          {mostrarFiltros && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:12, marginBottom:8 }}>
              <select value={params.prioridad} onChange={e => sp('prioridad', e.target.value)} style={{ marginBottom:8 }}>
                <option value="">Todas las prioridades</option>
                <option value="critica">🔴 Crítica</option>
                <option value="alta">🟡 Alta</option>
                <option value="media">🔵 Media</option>
                <option value="baja">🟢 Baja</option>
              </select>
              {esAdmin && (
                <select value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)}>
                  <option value="">Todos los técnicos</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Pills de estado — scroll horizontal */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
            {ESTADOS.map(e => (
              <button key={e} onClick={() => sp('estado', e)}
                style={{
                  padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                  border:`1px solid ${params.estado===e ? E_COLOR[e]||'var(--accent)' : 'var(--border)'}`,
                  background: params.estado===e ? `${E_COLOR[e]||'var(--accent)'}22` : 'none',
                  color: params.estado===e ? (E_COLOR[e]||'var(--accent)') : 'var(--muted)',
                  fontWeight: params.estado===e ? 700 : 'normal', minHeight: 34
                }}>{E_LABEL[e]}</button>
            ))}
          </div>
        </div>

        {/* Contador */}
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>
          {total} ticket{total !== 1 ? 's' : ''}
          {usuario?.rol === 'agente' && (
            <button onClick={() => sp('solo_mios', !params.solo_mios)}
              style={{ marginLeft:10, fontSize:11, background:'none', border:'1px solid var(--border)', borderRadius:12, padding:'2px 10px', color:'var(--muted)', cursor:'pointer' }}>
              {params.solo_mios ? '🧑‍💻 Solo míos' : '🌐 Todos'}
            </button>
          )}
        </div>

        {/* Lista de tickets como cards */}
        {loading ? (
          <div className="loading"><div className="spinner" /> Cargando...</div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◈</div>
            <p>No hay tickets con estos filtros</p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/tickets/nuevo')}>
              + Crear nuevo ticket
            </button>
          </div>
        ) : (
          <>
            {tickets.map(t => {
              const sla = slaInfo(t);
              const abierto = !['resuelto','cerrado','cancelado'].includes(t.estado);
              return (
                <div key={t.id} className="ticket-card-mobile" onClick={() => navigate(`/tickets/${t.id}`)}>
                  {/* Fila 1: código + prioridad + estado */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)', background:'var(--surface)', padding:'2px 6px', borderRadius:4 }}>{t.codigo}</span>
                    <span style={{ fontSize:14 }}>{PRIO_EMOJI[t.prioridad]||'⚪'}</span>
                    <span className={`badge badge-${t.estado}`} style={{ fontSize:10 }}>{t.estado.replace(/_/g,' ')}</span>
                    {t.sla_vencido && <span style={{ fontSize:12 }}>⚠️</span>}
                    <div style={{ flex:1 }}/>
                    {t.total_respuestas > 0 && <span style={{ fontSize:11, color:'var(--muted)' }}>💬 {t.total_respuestas}</span>}
                  </div>

                  {/* Fila 2: Asunto */}
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6, lineHeight:1.3 }}>
                    {t.asunto}
                  </div>

                  {/* Fila 3: cliente + empresa */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>👤 {t.cliente_nombre}</span>
                    {t.empresa_nombre && <span style={{ fontSize:11, color:'var(--muted)' }}>· {t.empresa_nombre}</span>}
                  </div>

                  {/* Fila 4: técnico + fecha + tiempo */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    {esAdmin && t.agente_nombre && (
                      <span style={{ fontSize:11, background:'rgba(34,201,122,.1)', color:'var(--green)', padding:'2px 8px', borderRadius:10 }}>
                        🧑‍💻 {t.agente_nombre}
                      </span>
                    )}
                    {esAdmin && !t.agente_nombre && (
                      <span style={{ fontSize:11, background:'rgba(240,78,78,.1)', color:'var(--red)', padding:'2px 8px', borderRadius:10 }}>
                        ⚠ Sin técnico
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--muted)' }}>📅 {fmtFechaHora(t.creado_en)}</span>
                    <span style={{ fontSize:11, color: abierto ? 'var(--amber)' : 'var(--green)', fontWeight:600 }}>
                      {abierto ? `⏱ ${fmtDuracion(t.creado_en)}` : `✓ ${fmtDuracion(t.creado_en, t.resuelto_en||t.actualizado_en)}`}
                    </span>
                  </div>

                  {/* SLA barra */}
                  {t.sla_resolucion_limite && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:3, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${sla.pct}%`, background:sla.color, borderRadius:2 }}/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Paginación mobile */}
            {total > 25 && (
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} disabled={params.page <= 1}
                  onClick={() => sp('page', params.page - 1)}>← Anterior</button>
                <button className="btn btn-ghost" style={{ flex:1 }} disabled={params.page * 25 >= total}
                  onClick={() => sp('page', params.page + 1)}>Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── DESKTOP VIEW ──
  return (
    <div className="fade-in">
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        {ESTADOS.map(e => (
          <button key={e} onClick={() => sp('estado', e)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
            border:`1px solid ${params.estado===e ? E_COLOR[e]||'var(--accent)' : 'var(--border)'}`,
            background: params.estado===e ? `${E_COLOR[e]||'var(--accent)'}22` : 'none',
            color: params.estado===e ? (E_COLOR[e]||'var(--accent)') : 'var(--muted)',
            fontWeight: params.estado===e ? 700 : 'normal', transition:'all .15s'
          }}>{E_LABEL[e]}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="🔍 Buscar tickets..." value={params.buscar}
          onChange={e => setParams(p => ({ ...p, buscar: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && cargar()} style={{ width:220 }} />
        <select value={params.prioridad} onChange={e => sp('prioridad', e.target.value)} style={{ width:150 }}>
          <option value="">Todas las prioridades</option>
          <option value="critica">🔴 Crítica</option>
          <option value="alta">🟡 Alta</option>
          <option value="media">🔵 Media</option>
          <option value="baja">🟢 Baja</option>
        </select>
        {esAdmin && (
          <select value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)} style={{ width:180 }}>
            <option value="">Todos los técnicos</option>
            {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
          </select>
        )}
        {usuario?.rol === 'agente' && (
          <button className={`btn btn-sm ${params.solo_mios ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => sp('solo_mios', !params.solo_mios)}>
            {params.solo_mios ? '🧑‍💻 Mis tickets' : '🌐 Todos'}
          </button>
        )}
        <div style={{ flex:1 }}/>
        <span style={{ color:'var(--muted)', fontSize:12 }}>{total} tickets</span>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo</button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? <div className="loading"><div className="spinner"/></div>
        : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◈</div>
            <p>No hay tickets</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => navigate('/tickets/nuevo')}>+ Crear</button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Asunto</th><th>Cliente</th><th>Categoría</th>
                <th>Prioridad</th><th>Estado</th>
                {esAdmin && <th>Técnico</th>}
                <th>SLA</th><th>Creado</th><th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => {
                const sla = slaInfo(t);
                const abierto = !['resuelto','cerrado','cancelado'].includes(t.estado);
                return (
                  <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{ cursor:'pointer' }}>
                    <td style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>{t.codigo}</td>
                    <td style={{ maxWidth:240 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        {t.sla_vencido && <span style={{ color:'var(--red)', fontSize:12 }}>⚠</span>}
                        {t.total_respuestas > 0 && <span style={{ color:'var(--muted)', fontSize:11 }}>💬{t.total_respuestas}</span>}
                        <span style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>{t.asunto}</span>
                      </div>
                      {t.empresa_nombre && <div style={{ fontSize:11, color:'var(--muted)' }}>{t.empresa_nombre}</div>}
                    </td>
                    <td style={{ fontSize:12 }}>{t.cliente_nombre}</td>
                    <td style={{ color:'var(--muted)', fontSize:12 }}>{t.categoria_nombre||'—'}</td>
                    <td><span className={`prio prio-${t.prioridad}`}><span className="prio-dot"/>{t.prioridad}</span></td>
                    <td><span className={`badge badge-${t.estado}`}>{t.estado.replace(/_/g,' ')}</span></td>
                    {esAdmin && <td style={{ fontSize:12, color:t.agente_nombre?'var(--text)':'var(--red)', fontWeight:t.agente_nombre?400:600 }}>{t.agente_nombre||'⚠ Sin asignar'}</td>}
                    <td>
                      <div style={{ height:5, width:64, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${sla.pct}%`, background:sla.color, borderRadius:3 }}/>
                      </div>
                      {t.sla_vencido && <div style={{ fontSize:9, color:'var(--red)', fontWeight:700, marginTop:1 }}>VENCIDO</div>}
                    </td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      <div style={{ fontSize:12, fontWeight:500 }} title={fmtTooltip(t.creado_en)}>{fmtFechaHora(t.creado_en)}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{fmtRelativo(t.creado_en)}</div>
                    </td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      {abierto
                        ? <div><div style={{ fontSize:12, fontWeight:600, color:'var(--amber)' }}>⏱ {fmtDuracion(t.creado_en)}</div><div style={{ fontSize:10, color:'var(--muted)' }}>en curso</div></div>
                        : <div><div style={{ fontSize:12, fontWeight:600, color:'var(--green)' }}>✓ {fmtDuracion(t.creado_en, t.resuelto_en||t.actualizado_en)}</div><div style={{ fontSize:10, color:'var(--muted)' }}>para resolver</div></div>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 25 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, fontSize:13, color:'var(--muted)' }}>
          <span>Página {params.page} · {total} total</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-ghost btn-sm" disabled={params.page <= 1} onClick={() => sp('page', params.page - 1)}>← Anterior</button>
            <button className="btn btn-ghost btn-sm" disabled={params.page * 25 >= total} onClick={() => sp('page', params.page + 1)}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}
