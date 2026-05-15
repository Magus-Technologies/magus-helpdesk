import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';
import { toast } from './extra-pages.jsx';
import { fmtFechaHora, fmtRelativo, fmtDuracion, fmtTooltip } from '../utils/timeUtils';

export default function TicketDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, esAgente, esAdmin } = useAuthStore();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentes, setAgentes] = useState([]);
  const [respuesta, setRespuesta] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState('publico');
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => { cargar(); }, [id]);
  useEffect(() => {
    if (esAgente()) {
      api.get('/usuarios').then(r =>
        setAgentes(r.data.filter(u => ['agente','supervisor','admin'].includes(u.rol) && u.activo))
      ).catch(() => {});
    }
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } catch {
      toast('Error al cargar ticket', 'error');
    } finally { setLoading(false); }
  };

  // ── SLA cálculo real ──
  const calcSLA = (t) => {
    if (!t?.sla_resolucion_limite || !t?.creado_en) return { pct:0, label:'Sin SLA', color:'var(--muted)', vencido:false };
    const total = new Date(t.sla_resolucion_limite) - new Date(t.creado_en);
    const transcurrido = (t.resuelto_en ? new Date(t.resuelto_en) : new Date()) - new Date(t.creado_en);
    const pct = Math.min(100, Math.max(0, Math.round(transcurrido / total * 100)));
    const vencido = t.sla_vencido || (new Date() > new Date(t.sla_resolucion_limite) && !['resuelto','cerrado'].includes(t.estado));
    const restanteMs = Math.max(0, new Date(t.sla_resolucion_limite) - new Date());
    let label = '';
    if (t.sla_resolucion_ok === true) label = '✓ Cumplido';
    else if (t.sla_resolucion_ok === false) label = '✗ Vencido';
    else if (vencido) label = 'VENCIDO';
    else label = `${pct}% · resta ${fmtDuracion(new Date(), new Date(t.sla_resolucion_limite))}`;
    const color = vencido ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';
    return { pct, label, color, vencido };
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/tickets/${id}/comentarios`, { contenido: respuesta, tipo: tipoRespuesta });
      if (archivos.length > 0) {
        const fd = new FormData();
        archivos.forEach(f => fd.append('archivos', f));
        await api.post(`/tickets/${id}/adjuntos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setArchivos([]);
      }
      setRespuesta('');
      toast(tipoRespuesta === 'interno' ? 'Nota interna guardada' : 'Respuesta enviada');
      cargar();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 300);
    } catch {
      toast('Error al enviar respuesta', 'error');
    } finally { setEnviando(false); }
  };

  const cambiarEstado = async (estado) => {
    setCambiando(true);
    try {
      await api.patch(`/tickets/${id}`, { estado });
      toast(`Estado: ${estado.replace(/_/g,' ')}`);
      cargar();
    } catch { toast('Error al cambiar estado', 'error'); }
    finally { setCambiando(false); }
  };

  const reasignarAgente = async (agente_id) => {
    try {
      await api.patch(`/tickets/${id}`, { agente_id: agente_id || null, estado: agente_id ? 'asignado' : 'nuevo' });
      toast(agente_id ? 'Ticket reasignado' : 'Ticket sin asignar');
      cargar();
    } catch { toast('Error al reasignar', 'error'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!ticket) return <div className="empty-state"><div className="icon">◈</div><p>Ticket no encontrado</p></div>;

  const sla = calcSLA(ticket);
  const esCliente = usuario?.rol === 'cliente';
  const puedeReasignar = esAdmin() || usuario?.rol === 'supervisor';
  const puedeResponder = ticket.estado !== 'cerrado' && ticket.estado !== 'cancelado';

  const estadoColors = {
    nuevo:'var(--accent)', asignado:'#4FC3F7', en_progreso:'var(--amber)',
    en_espera_cliente:'var(--purple)', en_espera_interno:'#9B59FF',
    resuelto:'var(--green)', cerrado:'var(--muted)', cancelado:'var(--red)'
  };

  return (
    <div className="fade-in">
      {/* Barra superior */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>← Mis tickets</button>
        <div style={{ flex:1 }} />
        {esAgente() && puedeResponder && (
          <div style={{ display:'flex', gap:6 }}>
            {ticket.estado !== 'resuelto' && ticket.estado !== 'cerrado' && (
              <button className="btn btn-success btn-sm" disabled={cambiando}
                onClick={() => cambiarEstado('resuelto')}>✓ Marcar resuelto</button>
            )}
            {ticket.estado === 'nuevo' && (
              <button className="btn btn-primary btn-sm" onClick={() => cambiarEstado('en_progreso')}>
                ▶ Tomar ticket
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>

        {/* ──── COLUMNA PRINCIPAL ──── */}
        <div>

          {/* HEADER */}
          <div className="card" style={{ marginBottom:12, borderLeft:`4px solid ${estadoColors[ticket.estado]||'var(--accent)'}`, paddingLeft:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--surface)', padding:'2px 8px', borderRadius:4, color:'var(--muted)', fontWeight:700 }}>
                {ticket.codigo}
              </span>
              <span className={`badge badge-${ticket.estado}`}>{ticket.estado.replace(/_/g,' ')}</span>
              <span className={`prio prio-${ticket.prioridad}`}><span className="prio-dot" />{ticket.prioridad}</span>
              {ticket.canal_origen && (
                <span style={{ fontSize:11, color:'var(--muted)', background:'var(--surface)', padding:'2px 6px', borderRadius:4 }}>
                  📡 {ticket.canal_origen}
                </span>
              )}
              {ticket.tags?.map(t => (
                <span key={t} style={{ fontSize:10, background:'rgba(79,127,255,.1)', color:'var(--accent)', padding:'1px 6px', borderRadius:3 }}>{t}</span>
              ))}
            </div>

            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:8, lineHeight:1.3 }}>
              {ticket.asunto}
            </h1>

            {/* Fechas con zona horaria Lima */}
            <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--muted)', flexWrap:'wrap' }}>
              <span title={fmtTooltip(ticket.creado_en)}>
                📅 Creado: <strong style={{ color:'var(--text)' }}>{fmtFechaHora(ticket.creado_en)}</strong>
                <span style={{ marginLeft:4, color:'var(--muted)', fontSize:11 }}>({fmtRelativo(ticket.creado_en)})</span>
              </span>
              <span>👤 <strong style={{ color:'var(--text)' }}>{ticket.cliente_nombre}</strong></span>
              {ticket.empresa_nombre && <span>🏢 {ticket.empresa_nombre}</span>}
              {ticket.agente_nombre && (
                <span>🧑‍💻 <strong style={{ color:'var(--text)' }}>{ticket.agente_nombre}</strong></span>
              )}
              {ticket.categoria_nombre && <span>📁 {ticket.categoria_nombre}</span>}
            </div>
          </div>

          {/* DESCRIPCIÓN resaltada */}
          <div className="card" style={{
            marginBottom:12,
            background:'linear-gradient(135deg,rgba(79,127,255,.08),rgba(124,92,252,.05))',
            border:'1px solid rgba(79,127,255,.25)'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:20, background:'var(--accent)', borderRadius:2 }} />
              <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.8, color:'var(--accent)' }}>
                Descripción del problema
              </span>
            </div>
            <div style={{
              fontSize:14, color:'var(--text)', lineHeight:1.8, whiteSpace:'pre-wrap',
              padding:'12px 16px', background:'rgba(0,0,0,.15)', borderRadius:8,
              border:'1px solid rgba(79,127,255,.15)'
            }}>
              {ticket.descripcion}
            </div>
          </div>

          {/* ADJUNTOS */}
          {ticket.adjuntos?.length > 0 && (
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>
                📎 Adjuntos ({ticket.adjuntos.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ticket.adjuntos.map(a => {
                  const icono = a.mime_type?.includes('pdf') ? '📄' : a.mime_type?.includes('image') ? '🖼' : '📎';
                  return (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{
                      display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
                      background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6,
                      fontSize:12, color:'var(--text)', textDecoration:'none'
                    }}>
                      <span>{icono}</span>
                      <span style={{ maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {a.nombre_original}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ fontWeight:700, marginBottom:16, fontSize:14 }}>💬 Historial de actividad</div>
            {(!ticket.comentarios || ticket.comentarios.length === 0) && (
              <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>💬</div>
                Sin respuestas aún
              </div>
            )}
            {ticket.comentarios?.map((c, i) => {
              const esMio = c.autor_id === usuario?.id;
              const esInterno = c.tipo === 'interno';
              const esDeCliente = c.autor_rol === 'cliente';
              return (
                <div key={c.id} style={{ display:'flex', gap:10, marginBottom:20, flexDirection:esMio?'row-reverse':'row' }}>
                  <div style={{
                    width:34, height:34, borderRadius:'50%', flexShrink:0,
                    background: esInterno ? 'linear-gradient(135deg,#9B59FF,#7C5CFC)' :
                                esDeCliente ? 'linear-gradient(135deg,var(--muted),#5a6480)' :
                                'linear-gradient(135deg,var(--accent),#3d6ef0)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:700, color:'#fff'
                  }}>
                    {c.autor_nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex:1, maxWidth:'75%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexDirection:esMio?'row-reverse':'row' }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{esMio ? 'Tú' : c.autor_nombre}</span>
                      {esInterno && (
                        <span style={{ fontSize:10, background:'rgba(155,89,255,.2)', color:'var(--purple)', padding:'1px 6px', borderRadius:3, fontWeight:600 }}>
                          🔒 Nota interna
                        </span>
                      )}
                      {/* Hora en Lima */}
                      <span title={fmtTooltip(c.creado_en)} style={{ fontSize:10, color:'var(--muted)', cursor:'default' }}>
                        {fmtFechaHora(c.creado_en)}
                      </span>
                    </div>
                    <div style={{
                      padding:'10px 14px', borderRadius:10, fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap',
                      background: esInterno ? 'rgba(155,89,255,.1)' : esMio ? 'rgba(79,127,255,.15)' : 'var(--surface)',
                      border:`1px solid ${esInterno?'rgba(155,89,255,.2)':esMio?'rgba(79,127,255,.2)':'var(--border)'}`,
                      color:'var(--text)',
                      borderBottomRightRadius: esMio ? 2 : 10,
                      borderBottomLeftRadius: esMio ? 10 : 2
                    }}>
                      {c.contenido}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* REPLY BOX */}
          {puedeResponder && (
            <div className="card">
              {esAgente() && (
                <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                  {[
                    { v:'publico', label:'↩ Responder al cliente', color:'var(--accent)' },
                    { v:'interno', label:'🔒 Nota interna', color:'var(--purple)' }
                  ].map(({ v, label, color }) => (
                    <button key={v} type="button" onClick={() => setTipoRespuesta(v)} style={{
                      padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
                      border:`1px solid ${tipoRespuesta===v ? color : 'var(--border)'}`,
                      background: tipoRespuesta===v ? `${color}22` : 'none',
                      color: tipoRespuesta===v ? color : 'var(--muted)',
                      fontWeight: tipoRespuesta===v ? 600 : 'normal'
                    }}>{label}</button>
                  ))}
                </div>
              )}
              <form onSubmit={enviarRespuesta}>
                <textarea
                  placeholder={tipoRespuesta==='interno'
                    ? 'Nota interna (solo visible para el equipo)...'
                    : esCliente ? 'Escribe tu mensaje...' : 'Escribe una respuesta al cliente...'}
                  value={respuesta}
                  onChange={e => setRespuesta(e.target.value)}
                  style={{ marginBottom:8, minHeight:100 }}
                />
                <div style={{ marginBottom:10 }}>
                  <input ref={fileRef} type="file" multiple style={{ display:'none' }}
                    onChange={e => setArchivos(Array.from(e.target.files))} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
                    📎 Adjuntar
                  </button>
                  {archivos.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                      {archivos.map((f, i) => (
                        <span key={i} style={{ fontSize:11, background:'rgba(79,127,255,.1)', color:'var(--accent)', padding:'2px 8px', borderRadius:4, display:'flex', alignItems:'center', gap:4 }}>
                          📎 {f.name}
                          <span style={{ cursor:'pointer' }} onClick={() => setArchivos(a => a.filter((_,j) => j!==i))}>×</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button className="btn btn-primary" type="submit" disabled={enviando || !respuesta.trim()}>
                    {enviando ? 'Enviando...' : tipoRespuesta==='interno' ? '💾 Guardar nota' : '✉ Enviar respuesta'}
                  </button>
                  {esAgente() && ticket.estado==='en_progreso' && (
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => cambiarEstado('en_espera_cliente')}>⏸ En espera</button>
                  )}
                  {esAgente() && ticket.estado==='en_espera_cliente' && (
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => cambiarEstado('en_progreso')}>▶ Reactivar</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {(ticket.estado === 'cerrado' || ticket.estado === 'cancelado') && (
            <div style={{ textAlign:'center', padding:20, background:'rgba(122,133,163,.07)', borderRadius:10, color:'var(--muted)', fontSize:13, marginTop:8 }}>
              Ticket <strong>{ticket.estado}</strong>
              {ticket.cerrado_en && ` · ${fmtFechaHora(ticket.cerrado_en)}`}
            </div>
          )}
        </div>

        {/* ──── SIDEBAR DERECHO ──── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Estado */}
          {esAgente() && (
            <div className="card">
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, fontWeight:600 }}>Estado</div>
              <select value={ticket.estado} onChange={e => cambiarEstado(e.target.value)} disabled={cambiando}
                style={{ borderColor:estadoColors[ticket.estado]||'var(--border)', color:estadoColors[ticket.estado]||'var(--text)', fontWeight:600 }}>
                <option value="nuevo">🔵 Nuevo</option>
                <option value="asignado">🔷 Asignado</option>
                <option value="en_progreso">🟡 En progreso</option>
                <option value="en_espera_cliente">🟣 Espera cliente</option>
                <option value="en_espera_interno">🟣 Espera interno</option>
                <option value="resuelto">🟢 Resuelto</option>
                <option value="cerrado">⚫ Cerrado</option>
              </select>
            </div>
          )}

          {/* Reasignar técnico */}
          {puedeReasignar && (
            <div className="card">
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, fontWeight:600 }}>
                🔄 Reasignar técnico
              </div>
              <select value={ticket.agente_id || ''} onChange={e => reasignarAgente(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {agentes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.rol})</option>
                ))}
              </select>
              {ticket.agente_nombre && (
                <div style={{ fontSize:11, color:'var(--green)', marginTop:6, fontWeight:500 }}>
                  ✓ {ticket.agente_nombre}
                </div>
              )}
            </div>
          )}

          {/* SLA */}
          <div className="card" style={{ borderTop:`3px solid ${sla.color}` }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, fontWeight:600 }}>⏱ SLA</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Consumido</span>
              <span style={{ fontWeight:700, color:sla.color, fontSize:13 }}>{sla.label}</span>
            </div>
            <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${sla.pct}%`, background:sla.color, borderRadius:4, transition:'width .5s' }} />
            </div>
            {ticket.sla_resolucion_limite && (
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }} title={fmtTooltip(ticket.sla_resolucion_limite)}>
                📅 Límite: {fmtFechaHora(ticket.sla_resolucion_limite)}
              </div>
            )}
            {ticket.sla_primera_respuesta_limite && (
              <div style={{ fontSize:11, color:'var(--muted)' }}>
                1ª resp.: {ticket.primera_respuesta_en
                  ? <span style={{ color:'var(--green)' }}>✓ {fmtFechaHora(ticket.primera_respuesta_en)}</span>
                  : fmtFechaHora(ticket.sla_primera_respuesta_limite)}
              </div>
            )}
            {(ticket.sla_resolucion_ok === true || ticket.sla_resolucion_ok === false) && (
              <div style={{ marginTop:8, fontSize:12, fontWeight:600, color:ticket.sla_resolucion_ok?'var(--green)':'var(--red)' }}>
                {ticket.sla_resolucion_ok ? '✅ SLA cumplido' : '❌ SLA incumplido'}
              </div>
            )}
          </div>

          {/* Tiempos de atención */}
          <div className="card">
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, fontWeight:600 }}>
              🕐 Tiempos
            </div>
            {[
              {
                l: 'Abierto hace',
                v: fmtDuracion(ticket.creado_en, null),
                c: 'var(--text)'
              },
              {
                l: 'Primera respuesta',
                v: ticket.primera_respuesta_en
                  ? fmtDuracion(ticket.creado_en, ticket.primera_respuesta_en)
                  : 'Pendiente',
                c: ticket.primera_respuesta_en ? 'var(--green)' : 'var(--amber)'
              },
              ticket.tiempo_trabajado_min > 0 && {
                l: 'Tiempo trabajado',
                v: fmtDuracion(0, ticket.tiempo_trabajado_min * 60000),
                c: 'var(--accent)'
              },
              ticket.resuelto_en && {
                l: 'Tiempo resolución',
                v: fmtDuracion(ticket.creado_en, ticket.resuelto_en),
                c: 'var(--green)'
              }
            ].filter(Boolean).map(({ l, v, c }) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:13 }}>
                <span style={{ color:'var(--muted)', fontSize:12 }}>{l}</span>
                <span style={{ fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Detalles */}
          <div className="card">
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, fontWeight:600 }}>Detalles</div>
            {[
              { l:'Categoría', v:ticket.categoria_nombre, i:'📁' },
              { l:'Empresa',   v:ticket.empresa_nombre,   i:'🏢' },
              { l:'Supervisor',v:ticket.supervisor_nombre, i:'👔' },
              { l:'Canal',     v:ticket.canal_origen,      i:'📡' },
              { l:'SLA',       v:ticket.sla_nombre,        i:'📋' },
            ].filter(x => x.v).map(({ l, v, i }) => (
              <div key={l} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8, fontSize:13 }}>
                <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>{i}</span>
                <span style={{ color:'var(--muted)', minWidth:80, fontSize:12, flexShrink:0 }}>{l}</span>
                <span style={{ fontWeight:500, wordBreak:'break-word' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8, fontSize:13 }}>
              <span style={{ fontSize:12, flexShrink:0 }}>📅</span>
              <span style={{ color:'var(--muted)', minWidth:80, fontSize:12, flexShrink:0 }}>Creado</span>
              <span style={{ fontWeight:500, fontSize:12 }} title={fmtTooltip(ticket.creado_en)}>
                {fmtFechaHora(ticket.creado_en)}
              </span>
            </div>
            {ticket.actualizado_en && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:6, fontSize:13 }}>
                <span style={{ fontSize:12, flexShrink:0 }}>🔄</span>
                <span style={{ color:'var(--muted)', minWidth:80, fontSize:12, flexShrink:0 }}>Actualizado</span>
                <span style={{ fontWeight:500, fontSize:12 }} title={fmtTooltip(ticket.actualizado_en)}>
                  {fmtFechaHora(ticket.actualizado_en)}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {ticket.tags?.length > 0 && (
            <div className="card">
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8, fontWeight:600 }}>🏷 Etiquetas</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {ticket.tags.map(t => (
                  <span key={t} style={{ background:'rgba(79,127,255,.12)', color:'var(--accent)', fontSize:11, padding:'3px 8px', borderRadius:4, fontWeight:500 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
