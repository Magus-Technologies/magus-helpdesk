import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';
import { useDevice } from '../hooks/useDevice';
import { toast } from './extra-pages.jsx';
import { fmtFechaHora, fmtDuracion, fmtTooltip } from '../utils/timeUtils';

export default function TicketDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, esAgente, esAdmin } = useAuthStore();
  const { isMobile } = useDevice();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentes, setAgentes] = useState([]);
  const [respuesta, setRespuesta] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState('publico');
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [tabActiva, setTabActiva] = useState('conversacion'); // mobile tabs
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => { cargar(); }, [id]);
  useEffect(() => {
    if (esAgente()) {
      api.get('/usuarios').then(r => setAgentes(r.data.filter(u => ['agente','supervisor','admin'].includes(u.rol) && u.activo))).catch(() => {});
    }
  }, []);

  const cargar = async () => {
    setLoading(true);
    try { const res = await api.get(`/tickets/${id}`); setTicket(res.data); }
    catch { toast('Error al cargar ticket', 'error'); }
    finally { setLoading(false); }
  };

  const calcSLA = (t) => {
    if (!t?.sla_resolucion_limite) return { pct:0, label:'Sin SLA', color:'var(--muted)' };
    const total = new Date(t.sla_resolucion_limite) - new Date(t.creado_en);
    const trans = (t.resuelto_en ? new Date(t.resuelto_en) : new Date()) - new Date(t.creado_en);
    const pct = Math.min(100, Math.max(0, Math.round(trans / total * 100)));
    const vencido = t.sla_vencido || (new Date() > new Date(t.sla_resolucion_limite) && !['resuelto','cerrado'].includes(t.estado));
    const color = vencido ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';
    const label = t.sla_resolucion_ok === true ? '✓ Cumplido' : vencido ? 'VENCIDO' :
      `${pct}% · resta ${fmtDuracion(new Date(), new Date(t.sla_resolucion_limite))}`;
    return { pct, label, color };
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/tickets/${id}/comentarios`, { contenido: respuesta, tipo: tipoRespuesta });
      if (archivos.length > 0) {
        const fd = new FormData(); archivos.forEach(f => fd.append('archivos', f));
        await api.post(`/tickets/${id}/adjuntos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setArchivos([]);
      }
      setRespuesta('');
      toast(tipoRespuesta === 'interno' ? 'Nota guardada' : 'Respuesta enviada');
      cargar();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 300);
    } catch { toast('Error al enviar', 'error'); }
    finally { setEnviando(false); }
  };

  const cambiarEstado = async (estado) => {
    setCambiando(true);
    try { await api.patch(`/tickets/${id}`, { estado }); toast(`Estado: ${estado.replace(/_/g,' ')}`); cargar(); }
    catch { toast('Error', 'error'); }
    finally { setCambiando(false); }
  };

  const reasignarAgente = async (agente_id) => {
    try { await api.patch(`/tickets/${id}`, { agente_id: agente_id||null, estado: agente_id?'asignado':'nuevo' }); toast(agente_id?'Reasignado':'Sin asignar'); cargar(); }
    catch { toast('Error', 'error'); }
  };

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!ticket) return <div className="empty-state"><div className="icon">◈</div><p>No encontrado</p></div>;

  const sla = calcSLA(ticket);
  const esCliente = usuario?.rol === 'cliente';
  const puedeReasignar = esAdmin() || usuario?.rol === 'supervisor';
  const puedeResponder = !['cerrado','cancelado'].includes(ticket.estado);
  const estadoColors = { nuevo:'var(--accent)', asignado:'#4FC3F7', en_progreso:'var(--amber)', en_espera_cliente:'var(--purple)', resuelto:'var(--green)', cerrado:'var(--muted)', cancelado:'var(--red)' };

  // ─── MOBILE VIEW ───
  if (isMobile) {
    return (
      <div className="fade-in">
        {/* Header compacto */}
        <div style={{ marginBottom:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')} style={{ marginBottom:10 }}>← Volver</button>

          <div style={{ background:'var(--card)', borderRadius:12, padding:14, borderLeft:`4px solid ${estadoColors[ticket.estado]||'var(--accent)'}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)', background:'var(--surface)', padding:'2px 6px', borderRadius:3 }}>{ticket.codigo}</span>
              <span className={`badge badge-${ticket.estado}`}>{ticket.estado.replace(/_/g,' ')}</span>
              <span className={`prio prio-${ticket.prioridad}`}><span className="prio-dot"/>{ticket.prioridad}</span>
            </div>
            <h2 style={{ fontSize:17, fontWeight:800, color:'var(--text)', marginBottom:8, lineHeight:1.3 }}>{ticket.asunto}</h2>
            <div style={{ fontSize:12, color:'var(--muted)', display:'flex', flexWrap:'wrap', gap:8 }}>
              <span>👤 {ticket.cliente_nombre}</span>
              {ticket.empresa_nombre && <span>🏢 {ticket.empresa_nombre}</span>}
              {ticket.agente_nombre && <span>🧑‍💻 {ticket.agente_nombre}</span>}
            </div>
          </div>
        </div>

        {/* Acciones rápidas mobile */}
        {esAgente() && puedeResponder && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {ticket.estado !== 'resuelto' && (
              <button className="btn btn-success" disabled={cambiando} onClick={() => cambiarEstado('resuelto')}>✓ Resolver</button>
            )}
            {ticket.estado === 'nuevo' && (
              <button className="btn btn-primary" onClick={() => cambiarEstado('en_progreso')}>▶ Tomar</button>
            )}
            {ticket.estado === 'en_progreso' && (
              <button className="btn btn-ghost" onClick={() => cambiarEstado('en_espera_cliente')}>⏸ En espera</button>
            )}
          </div>
        )}

        {/* Tabs mobile */}
        <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:'2px solid var(--border)' }}>
          {[
            { id:'conversacion', label:'💬 Conversación' },
            { id:'detalles',     label:'📋 Detalles' },
            { id:'responder',    label:'✉ Responder', hide: !puedeResponder }
          ].filter(t => !t.hide).map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)}
              style={{
                flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
                fontSize:12, fontWeight: tabActiva===tab.id ? 700 : 400,
                color: tabActiva===tab.id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: tabActiva===tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:-2, WebkitTapHighlightColor:'transparent'
              }}>{tab.label}</button>
          ))}
        </div>

        {/* Tab: Conversación */}
        {tabActiva === 'conversacion' && (
          <div>
            {/* Descripción */}
            <div style={{ background:'linear-gradient(135deg,rgba(79,127,255,.08),rgba(124,92,252,.05))', border:'1px solid rgba(79,127,255,.2)', borderRadius:10, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--accent)', marginBottom:8 }}>📝 Descripción</div>
              <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{ticket.descripcion}</div>
            </div>

            {/* Comentarios */}
            {ticket.comentarios?.map(c => {
              const esMio = c.autor_id === usuario?.id;
              return (
                <div key={c.id} style={{ marginBottom:14, display:'flex', gap:8, flexDirection: esMio ? 'row-reverse' : 'row' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: esMio?'linear-gradient(135deg,var(--accent),#3d6ef0)':'linear-gradient(135deg,var(--muted),#5a6480)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {c.autor_nombre?.charAt(0)?.toUpperCase()||'?'}
                  </div>
                  <div style={{ maxWidth:'80%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexDirection: esMio?'row-reverse':'row' }}>
                      <span style={{ fontSize:11, fontWeight:600 }}>{esMio?'Tú':c.autor_nombre}</span>
                      {c.tipo==='interno' && <span style={{ fontSize:9, background:'rgba(155,89,255,.2)', color:'var(--purple)', padding:'1px 5px', borderRadius:3 }}>🔒 interno</span>}
                      <span style={{ fontSize:10, color:'var(--muted)' }}>{fmtFechaHora(c.creado_en)}</span>
                    </div>
                    <div style={{ padding:'10px 13px', borderRadius:10, fontSize:14, lineHeight:1.7, whiteSpace:'pre-wrap', background: esMio?'rgba(79,127,255,.15)':'var(--card)', border:`1px solid ${esMio?'rgba(79,127,255,.2)':'var(--border)'}`, color:'var(--text)', borderBottomRightRadius:esMio?2:10, borderBottomLeftRadius:esMio?10:2 }}>
                      {c.contenido}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!ticket.comentarios||ticket.comentarios.length===0) && (
              <div style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:13 }}>Sin respuestas aún</div>
            )}
            <div ref={bottomRef}/>
          </div>
        )}

        {/* Tab: Detalles */}
        {tabActiva === 'detalles' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* SLA */}
            <div className="card" style={{ borderTop:`3px solid ${sla.color}` }}>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:10 }}>⏱ SLA</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:13, color:'var(--muted)' }}>Consumido</span>
                <span style={{ fontWeight:700, color:sla.color }}>{sla.label}</span>
              </div>
              <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:`${sla.pct}%`, background:sla.color, borderRadius:4 }}/>
              </div>
              {ticket.sla_resolucion_limite && <div style={{ fontSize:12, color:'var(--muted)' }}>📅 Límite: {fmtFechaHora(ticket.sla_resolucion_limite)}</div>}
            </div>

            {/* Tiempos */}
            <div className="card">
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:12 }}>🕐 Tiempos</div>
              {[
                { l:'Abierto hace', v:fmtDuracion(ticket.creado_en), c:'var(--text)' },
                { l:'Primera respuesta', v: ticket.primera_respuesta_en ? fmtDuracion(ticket.creado_en, ticket.primera_respuesta_en) : 'Pendiente', c: ticket.primera_respuesta_en?'var(--green)':'var(--amber)' },
                ticket.resuelto_en && { l:'Tiempo resolución', v:fmtDuracion(ticket.creado_en, ticket.resuelto_en), c:'var(--green)' }
              ].filter(Boolean).map(({ l, v, c }) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:14 }}>
                  <span style={{ color:'var(--muted)' }}>{l}</span>
                  <span style={{ fontWeight:700, color:c }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Estado (agentes) */}
            {esAgente() && (
              <div className="card">
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:10 }}>Estado</div>
                <select value={ticket.estado} onChange={e => cambiarEstado(e.target.value)} disabled={cambiando}
                  style={{ fontWeight:600, color:estadoColors[ticket.estado]||'var(--text)', borderColor:estadoColors[ticket.estado]||'var(--border)' }}>
                  <option value="nuevo">🔵 Nuevo</option>
                  <option value="asignado">🔷 Asignado</option>
                  <option value="en_progreso">🟡 En progreso</option>
                  <option value="en_espera_cliente">🟣 Espera cliente</option>
                  <option value="resuelto">🟢 Resuelto</option>
                  <option value="cerrado">⚫ Cerrado</option>
                </select>
              </div>
            )}

            {/* Reasignar */}
            {puedeReasignar && (
              <div className="card">
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:10 }}>🔄 Técnico asignado</div>
                <select value={ticket.agente_id||''} onChange={e => reasignarAgente(e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
                </select>
                {ticket.agente_nombre && <div style={{ fontSize:12, color:'var(--green)', marginTop:6 }}>✓ {ticket.agente_nombre}</div>}
              </div>
            )}

            {/* Info */}
            <div className="card">
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', marginBottom:12 }}>📋 Información</div>
              {[
                { l:'Creado', v:fmtFechaHora(ticket.creado_en) },
                { l:'Categoría', v:ticket.categoria_nombre },
                { l:'Empresa', v:ticket.empresa_nombre },
                { l:'Canal', v:ticket.canal_origen },
              ].filter(x=>x.v).map(({ l, v }) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:14 }}>
                  <span style={{ color:'var(--muted)' }}>{l}</span>
                  <span style={{ fontWeight:500, textAlign:'right', maxWidth:'60%' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Responder */}
        {tabActiva === 'responder' && puedeResponder && (
          <div className="card">
            {esAgente() && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {[
                  { v:'publico', label:'↩ Al cliente', color:'var(--accent)' },
                  { v:'interno', label:'🔒 Nota interna', color:'var(--purple)' }
                ].map(({ v, label, color }) => (
                  <button key={v} onClick={() => setTipoRespuesta(v)}
                    style={{ padding:'10px', borderRadius:8, border:`1px solid ${tipoRespuesta===v?color:'var(--border)'}`, background:tipoRespuesta===v?`${color}22`:'none', color:tipoRespuesta===v?color:'var(--muted)', fontWeight:tipoRespuesta===v?700:400, cursor:'pointer', fontSize:13 }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={enviarRespuesta}>
              <textarea
                placeholder={esCliente?'Escribe tu mensaje...':'Escribe respuesta al cliente...'}
                value={respuesta} onChange={e => setRespuesta(e.target.value)}
                style={{ minHeight:120, marginBottom:10, fontSize:15 }} />
              <div style={{ marginBottom:10 }}>
                <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e => setArchivos(Array.from(e.target.files))} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>📎 Adjuntar</button>
                {archivos.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                    {archivos.map((f, i) => (
                      <span key={i} style={{ fontSize:11, background:'rgba(79,127,255,.1)', color:'var(--accent)', padding:'3px 8px', borderRadius:4, display:'flex', alignItems:'center', gap:4 }}>
                        📎 {f.name} <span style={{ cursor:'pointer' }} onClick={() => setArchivos(a => a.filter((_,j) => j!==i))}>×</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={enviando||!respuesta.trim()}>
                {enviando ? 'Enviando...' : tipoRespuesta==='interno' ? '💾 Guardar nota' : '✉ Enviar respuesta'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ─── DESKTOP VIEW ─── (mismo que antes)
  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>← Mis tickets</button>
        <div style={{ flex:1 }}/>
        {esAgente() && puedeResponder && (
          <div style={{ display:'flex', gap:6 }}>
            {ticket.estado !== 'resuelto' && ticket.estado !== 'cerrado' && (
              <button className="btn btn-success btn-sm" disabled={cambiando} onClick={() => cambiarEstado('resuelto')}>✓ Resolver</button>
            )}
            {ticket.estado === 'nuevo' && (
              <button className="btn btn-primary btn-sm" onClick={() => cambiarEstado('en_progreso')}>▶ Tomar</button>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
        <div>
          {/* Header */}
          <div className="card" style={{ marginBottom:12, borderLeft:`4px solid ${estadoColors[ticket.estado]||'var(--accent)'}`, paddingLeft:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--surface)', padding:'2px 8px', borderRadius:4, color:'var(--muted)', fontWeight:700 }}>{ticket.codigo}</span>
              <span className={`badge badge-${ticket.estado}`}>{ticket.estado.replace(/_/g,' ')}</span>
              <span className={`prio prio-${ticket.prioridad}`}><span className="prio-dot"/>{ticket.prioridad}</span>
            </div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:8, lineHeight:1.3 }}>{ticket.asunto}</h1>
            <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--muted)', flexWrap:'wrap' }}>
              <span title={fmtTooltip(ticket.creado_en)}>📅 <strong style={{ color:'var(--text)' }}>{fmtFechaHora(ticket.creado_en)}</strong></span>
              <span>👤 <strong style={{ color:'var(--text)' }}>{ticket.cliente_nombre}</strong></span>
              {ticket.empresa_nombre && <span>🏢 {ticket.empresa_nombre}</span>}
              {ticket.agente_nombre && <span>🧑‍💻 <strong style={{ color:'var(--text)' }}>{ticket.agente_nombre}</strong></span>}
            </div>
          </div>

          {/* Descripción */}
          <div className="card" style={{ marginBottom:12, background:'linear-gradient(135deg,rgba(79,127,255,.08),rgba(124,92,252,.05))', border:'1px solid rgba(79,127,255,.25)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:3, height:20, background:'var(--accent)', borderRadius:2 }}/>
              <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.8, color:'var(--accent)' }}>Descripción del problema</span>
            </div>
            <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, whiteSpace:'pre-wrap', padding:'12px 16px', background:'rgba(0,0,0,.15)', borderRadius:8, border:'1px solid rgba(79,127,255,.15)' }}>{ticket.descripcion}</div>
          </div>

          {/* Adjuntos */}
          {ticket.adjuntos?.length > 0 && (
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>📎 Adjuntos</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ticket.adjuntos.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text)', textDecoration:'none' }}>
                    📎 <span style={{ maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nombre_original}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ fontWeight:700, marginBottom:16, fontSize:14 }}>💬 Historial</div>
            {(!ticket.comentarios||ticket.comentarios.length===0) && (
              <div style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:13 }}>Sin respuestas aún</div>
            )}
            {ticket.comentarios?.map(c => {
              const esMio = c.autor_id === usuario?.id;
              return (
                <div key={c.id} style={{ display:'flex', gap:10, marginBottom:20, flexDirection:esMio?'row-reverse':'row' }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:esMio?'linear-gradient(135deg,var(--accent),#3d6ef0)':'linear-gradient(135deg,var(--muted),#5a6480)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>
                    {c.autor_nombre?.charAt(0)?.toUpperCase()||'?'}
                  </div>
                  <div style={{ flex:1, maxWidth:'75%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexDirection:esMio?'row-reverse':'row' }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{esMio?'Tú':c.autor_nombre}</span>
                      {c.tipo==='interno' && <span style={{ fontSize:10, background:'rgba(155,89,255,.2)', color:'var(--purple)', padding:'1px 6px', borderRadius:3 }}>🔒 Nota interna</span>}
                      <span style={{ fontSize:10, color:'var(--muted)' }}>{fmtFechaHora(c.creado_en)}</span>
                    </div>
                    <div style={{ padding:'10px 14px', borderRadius:10, fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap', background:esMio?'rgba(79,127,255,.15)':'var(--surface)', border:`1px solid ${esMio?'rgba(79,127,255,.2)':'var(--border)'}`, color:'var(--text)', borderBottomRightRadius:esMio?2:10, borderBottomLeftRadius:esMio?10:2 }}>
                      {c.contenido}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Reply box */}
          {puedeResponder && (
            <div className="card">
              {esAgente() && (
                <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                  {[{v:'publico',label:'↩ Responder al cliente',color:'var(--accent)'},{v:'interno',label:'🔒 Nota interna',color:'var(--purple)'}].map(({ v, label, color }) => (
                    <button key={v} type="button" onClick={() => setTipoRespuesta(v)}
                      style={{ padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer', border:`1px solid ${tipoRespuesta===v?color:'var(--border)'}`, background:tipoRespuesta===v?`${color}22`:'none', color:tipoRespuesta===v?color:'var(--muted)', fontWeight:tipoRespuesta===v?600:'normal' }}>{label}</button>
                  ))}
                </div>
              )}
              <form onSubmit={enviarRespuesta}>
                <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} style={{ minHeight:100, marginBottom:8 }} placeholder={esCliente?'Escribe tu mensaje...':'Respuesta al cliente...'} />
                <div style={{ marginBottom:10 }}>
                  <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e => setArchivos(Array.from(e.target.files))} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>📎 Adjuntar</button>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary" type="submit" disabled={enviando||!respuesta.trim()}>
                    {enviando?'Enviando...':tipoRespuesta==='interno'?'💾 Nota':'✉ Enviar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar derecho desktop */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {esAgente() && (
            <div className="card">
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Estado</div>
              <select value={ticket.estado} onChange={e => cambiarEstado(e.target.value)} disabled={cambiando} style={{ fontWeight:600, color:estadoColors[ticket.estado]||'var(--text)' }}>
                <option value="nuevo">🔵 Nuevo</option><option value="asignado">🔷 Asignado</option>
                <option value="en_progreso">🟡 En progreso</option><option value="en_espera_cliente">🟣 Espera cliente</option>
                <option value="resuelto">🟢 Resuelto</option><option value="cerrado">⚫ Cerrado</option>
              </select>
            </div>
          )}
          {puedeReasignar && (
            <div className="card">
              <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>🔄 Reasignar técnico</div>
              <select value={ticket.agente_id||''} onChange={e => reasignarAgente(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
              </select>
              {ticket.agente_nombre && <div style={{ fontSize:11, color:'var(--green)', marginTop:6 }}>✓ {ticket.agente_nombre}</div>}
            </div>
          )}
          <div className="card" style={{ borderTop:`3px solid ${sla.color}` }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>⏱ SLA</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Consumido</span>
              <span style={{ fontWeight:700, color:sla.color }}>{sla.label}</span>
            </div>
            <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden', marginBottom:6 }}>
              <div style={{ height:'100%', width:`${sla.pct}%`, background:sla.color, borderRadius:4 }}/>
            </div>
            {ticket.sla_resolucion_limite && <div style={{ fontSize:11, color:'var(--muted)' }}>📅 {fmtFechaHora(ticket.sla_resolucion_limite)}</div>}
          </div>
          <div className="card">
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>🕐 Tiempos</div>
            {[
              { l:'Abierto hace', v:fmtDuracion(ticket.creado_en), c:'var(--text)' },
              { l:'Primera respuesta', v:ticket.primera_respuesta_en?fmtDuracion(ticket.creado_en,ticket.primera_respuesta_en):'Pendiente', c:ticket.primera_respuesta_en?'var(--green)':'var(--amber)' },
              ticket.resuelto_en && { l:'Resolución', v:fmtDuracion(ticket.creado_en,ticket.resuelto_en), c:'var(--green)' }
            ].filter(Boolean).map(({ l, v, c }) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                <span style={{ color:'var(--muted)', fontSize:12 }}>{l}</span>
                <span style={{ fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Detalles</div>
            {[
              { l:'Categoría', v:ticket.categoria_nombre },
              { l:'Empresa', v:ticket.empresa_nombre },
              { l:'Canal', v:ticket.canal_origen },
              { l:'Creado', v:fmtFechaHora(ticket.creado_en) },
            ].filter(x=>x.v).map(({ l, v }) => (
              <div key={l} style={{ display:'flex', gap:6, marginBottom:8, fontSize:13 }}>
                <span style={{ color:'var(--muted)', minWidth:80, fontSize:12 }}>{l}</span>
                <span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
