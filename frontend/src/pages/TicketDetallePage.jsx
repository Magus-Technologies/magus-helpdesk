import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';

export default function TicketDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, esAgente } = useAuthStore();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respuesta, setRespuesta] = useState('');
  const [tipoRespuesta, setTipoRespuesta] = useState('publico');
  const [enviando, setEnviando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  useEffect(() => { cargar(); }, [id]);

  const cargar = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } finally { setLoading(false); }
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;
    setEnviando(true);
    try {
      await api.post(`/tickets/${id}/comentarios`, { contenido: respuesta, tipo: tipoRespuesta });
      setRespuesta('');
      cargar();
    } finally { setEnviando(false); }
  };

  const cambiarEstado = async (estado) => {
    setCambiandoEstado(true);
    try {
      await api.patch(`/tickets/${id}`, { estado });
      cargar();
    } finally { setCambiandoEstado(false); }
  };

  const cambiarAgente = async (agente_id) => {
    await api.patch(`/tickets/${id}`, { agente_id: agente_id || null });
    cargar();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!ticket) return <div className="empty-state"><div className="icon">◈</div><p>Ticket no encontrado</p></div>;

  const pctSLA = ticket.sla_resolucion_limite && ticket.creado_en
    ? Math.min(100, Math.round((new Date() - new Date(ticket.creado_en)) /
        (new Date(ticket.sla_resolucion_limite) - new Date(ticket.creado_en)) * 100))
    : 0;
  const slaClass = ticket.sla_vencido ? 'sla-danger' : pctSLA >= 80 ? 'sla-warn' : 'sla-ok';

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>← Volver</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16 }}>
        {/* MAIN */}
        <div>
          {/* Header */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ticket.codigo}</span>
                  <span className={`badge badge-${ticket.estado}`}>{ticket.estado.replace(/_/g,' ')}</span>
                  <span className={`prio prio-${ticket.prioridad}`}>
                    <span className="prio-dot" />{ticket.prioridad}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>vía {ticket.canal_origen}</span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{ticket.asunto}</h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Creado: {new Date(ticket.creado_en).toLocaleString('es-PE')} · Cliente: <strong style={{ color: 'var(--text)' }}>{ticket.cliente_nombre}</strong>
                  {ticket.empresa_nombre && ` · ${ticket.empresa_nombre}`}
                </div>
              </div>
              {esAgente() && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {ticket.estado !== 'resuelto' && ticket.estado !== 'cerrado' && (
                    <button className="btn btn-success btn-sm" disabled={cambiandoEstado}
                      onClick={() => cambiarEstado('resuelto')}>✓ Resolver</button>
                  )}
                  {ticket.estado === 'nuevo' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado('en_progreso')}>Tomar</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Descripción</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ticket.descripcion}</div>
          </div>

          {/* Timeline / Comentarios */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Historial de actividad</div>
            {ticket.comentarios?.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 8, marginTop: 5, position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c.tipo === 'interno' ? 'var(--purple)' : c.autor_rol === 'cliente' ? 'var(--muted)' : 'var(--accent)'
                  }} />
                  {i < ticket.comentarios.length - 1 && (
                    <div style={{ position: 'absolute', left: 3, top: 8, width: 1, height: 'calc(100% + 8px)', background: 'var(--border)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.autor_nombre}
                    {c.tipo === 'interno' && (
                      <span style={{ fontSize: 10, background: 'rgba(155,89,255,.15)', color: 'var(--purple)', padding: '1px 6px', borderRadius: 4 }}>Nota interna</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.contenido}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {new Date(c.creado_en).toLocaleString('es-PE')}
                  </div>
                </div>
              </div>
            ))}
            {(!ticket.comentarios || ticket.comentarios.length === 0) && (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sin respuestas aún</div>
            )}
          </div>

          {/* Reply Box */}
          {ticket.estado !== 'cerrado' && ticket.estado !== 'cancelado' && (
            <div className="card">
              <form onSubmit={enviarRespuesta}>
                {esAgente() && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {['publico','interno'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setTipoRespuesta(t)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                          border: '1px solid var(--border)',
                          background: tipoRespuesta === t ? (t === 'interno' ? 'rgba(155,89,255,.2)' : 'rgba(79,127,255,.2)') : 'none',
                          color: tipoRespuesta === t ? (t === 'interno' ? 'var(--purple)' : 'var(--accent)') : 'var(--muted)'
                        }}>
                        {t === 'publico' ? '↩ Responder al cliente' : '🔒 Nota interna'}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  placeholder={tipoRespuesta === 'interno' ? 'Nota interna (solo visible para el equipo)...' : 'Escribe una respuesta al cliente...'}
                  value={respuesta}
                  onChange={e => setRespuesta(e.target.value)}
                  style={{ marginBottom: 10, minHeight: 90 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={enviando || !respuesta.trim()}>
                    {enviando ? 'Enviando...' : tipoRespuesta === 'interno' ? 'Guardar nota' : 'Enviar respuesta'}
                  </button>
                  {esAgente() && ticket.estado === 'en_progreso' && (
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => cambiarEstado('en_espera_cliente')}>
                      Poner en espera
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Estado */}
          {esAgente() && (
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Estado</div>
              <select value={ticket.estado} onChange={e => cambiarEstado(e.target.value)} disabled={cambiandoEstado}>
                <option value="nuevo">Nuevo</option>
                <option value="asignado">Asignado</option>
                <option value="en_progreso">En progreso</option>
                <option value="en_espera_cliente">En espera (cliente)</option>
                <option value="en_espera_interno">En espera (interno)</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          )}

          {/* SLA */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>SLA</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)' }}>Consumido</span>
              <span style={{ fontWeight: 600, color: ticket.sla_vencido ? 'var(--red)' : pctSLA >= 80 ? 'var(--amber)' : 'var(--green)' }}>
                {ticket.sla_vencido ? 'VENCIDO' : `${pctSLA}%`}
              </span>
            </div>
            <div className="sla-bar" style={{ width: '100%' }}>
              <div className={`sla-fill ${slaClass}`} style={{ width: `${pctSLA}%` }} />
            </div>
            {ticket.sla_resolucion_limite && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Límite: {new Date(ticket.sla_resolucion_limite).toLocaleString('es-PE')}
              </div>
            )}
          </div>

          {/* Detalles */}
          <div className="card">
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Detalles</div>
            {[
              { label: 'Categoría', value: ticket.categoria_nombre },
              { label: 'Subcategoría', value: ticket.subcategoria_nombre },
              { label: 'Empresa', value: ticket.empresa_nombre },
              { label: 'Agente', value: ticket.agente_nombre },
              { label: 'Supervisor', value: ticket.supervisor_nombre },
              { label: 'Canal', value: ticket.canal_origen },
              { label: 'Tiempo trabajado', value: ticket.tiempo_trabajado_min ? `${ticket.tiempo_trabajado_min} min` : '—' },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ display: 'flex', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)', minWidth: 100, fontSize: 12 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>ETIQUETAS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ticket.tags.map(tag => (
                  <span key={tag} style={{
                    background: 'rgba(79,127,255,.15)', color: 'var(--accent)',
                    fontSize: 11, padding: '2px 8px', borderRadius: 4
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
