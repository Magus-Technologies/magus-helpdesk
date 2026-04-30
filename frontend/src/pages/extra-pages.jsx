// ============================================================
// NuevoTicketPage.jsx
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';

export function NuevoTicketPage() {
  const navigate = useNavigate();
  const { usuario, esAgente } = useAuthStore();
  const [form, setForm] = useState({ asunto:'', descripcion:'', categoria_id:'', prioridad:'media', empresa_id:'', agente_id:'', canal_origen:'portal' });
  const [categorias, setCategorias] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data)).catch(()=>{});
    if (esAgente()) {
      api.get('/empresas').then(r => setEmpresas(r.data)).catch(()=>{});
      api.get('/usuarios').then(r => setAgentes(r.data.filter(u => ['agente','supervisor'].includes(u.rol)))).catch(()=>{});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asunto.trim() || !form.descripcion.trim()) { setError('Asunto y descripción son requeridos'); return; }
    setEnviando(true);
    try {
      const res = await api.post('/tickets', form);
      navigate(`/tickets/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear ticket');
    } finally { setEnviando(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Nuevo Ticket</h2>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asunto *</label>
            <input placeholder="Describe brevemente el problema" value={form.asunto} onChange={e => set('asunto', e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>
          {esAgente() && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignar a</label>
                <select value={form.agente_id} onChange={e => set('agente_id', e.target.value)}>
                  <option value="">Auto-asignar</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <textarea placeholder="Describe el problema con el mayor detalle posible..." value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)} style={{ minHeight: 120 }} required />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={enviando}>{enviando ? 'Creando...' : 'Crear ticket'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/tickets')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AgentesPage.jsx
// ============================================================
export function AgentesPage() {
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/usuarios').then(r => {
      setAgentes(r.data.filter(u => ['agente','supervisor','admin'].includes(u.rol)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{agentes.length} agentes</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {agentes.map(a => {
          const ini = (a.nombre[0] + (a.apellido?.[0]||'')).toUpperCase();
          return (
            <div key={a.id} className="card" style={{ textAlign: 'center', padding: 20 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, margin: '0 auto 10px' }}>{ini}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.activo ? 'var(--green)' : 'var(--muted)' }} />
                <div style={{ fontWeight: 600 }}>{a.nombre} {a.apellido}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize', marginBottom: 12 }}>{a.rol}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.email}</div>
              {a.ultimo_acceso && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  Último acceso: {new Date(a.ultimo_acceso).toLocaleDateString('es-PE')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ClientesPage.jsx
// ============================================================
export function ClientesPage() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/empresas').then(r => { setEmpresas(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Empresa</th><th>RUC</th><th>Email</th><th>Plan</th><th>Tickets abiertos</th><th>Total tickets</th></tr></thead>
          <tbody>
            {empresas.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 500 }}>{e.nombre}</td>
                <td style={{ color: 'var(--muted)' }}>{e.ruc || '—'}</td>
                <td style={{ color: 'var(--muted)' }}>{e.email || '—'}</td>
                <td><span className="badge badge-nuevo" style={{ textTransform: 'capitalize' }}>{e.plan}</span></td>
                <td>{e.tickets_abiertos || 0}</td>
                <td>{e.total_tickets || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SLAPage.jsx
// ============================================================
export function SLAPage() {
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    api.get('/sla').then(r => { setSlas(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const guardar = async (sla) => {
    await api.put(`/sla/${sla.id}`, sla);
    setEditando(null);
    api.get('/sla').then(r => setSlas(r.data));
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Prioridad</th><th>Primera respuesta</th><th>Resolución</th><th>Horario</th><th>Alerta en</th><th>Acciones</th></tr></thead>
          <tbody>
            {slas.map(s => (
              <tr key={s.id}>
                <td><span className={`prio prio-${s.prioridad}`}><span className="prio-dot" />{s.prioridad}</span></td>
                <td>{editando?.id === s.id ? <input type="number" value={editando.tiempo_primera_respuesta_min} onChange={e => setEditando(f => ({ ...f, tiempo_primera_respuesta_min: e.target.value }))} style={{ width: 80 }} /> : `${s.tiempo_primera_respuesta_min} min`}</td>
                <td>{editando?.id === s.id ? <input type="number" value={editando.tiempo_resolucion_min} onChange={e => setEditando(f => ({ ...f, tiempo_resolucion_min: e.target.value }))} style={{ width: 80 }} /> : `${Math.round(s.tiempo_resolucion_min / 60)}h`}</td>
                <td style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--muted)' }}>{s.horario.replace(/_/g,' ')}</td>
                <td>{s.notificar_en_pct}% consumido</td>
                <td>
                  {editando?.id === s.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-success btn-sm" onClick={() => guardar(editando)}>Guardar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditando({ ...s })}>Editar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ReportesPage.jsx
// ============================================================
export function ReportesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '' });

  const cargar = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([,v]) => v)));
      const [r1, r2] = await Promise.all([api.get(`/reportes/general?${q}`), api.get('/reportes/sla')]);
      setData({ ...r1.data, slaDetalle: r2.data });
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return null;

  const { totales, por_categoria, csat, por_agente, tendencia_diaria, sla: slaGlobal, slaDetalle } = data;

  return (
    <div className="fade-in">
      {/* Filtros fecha */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Desde</label>
          <input type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} style={{ width: 160 }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} style={{ width: 160 }} />
        </div>
        <button className="btn btn-primary" onClick={cargar}>Aplicar</button>
        <button className="btn btn-ghost" onClick={() => { setFiltros({ desde:'', hasta:'' }); setTimeout(cargar,0); }}>Limpiar</button>
      </div>

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l:'Total tickets', v: totales?.total ?? 0, c:'var(--accent)' },
          { l:'Resueltos', v: totales?.resueltos ?? 0, c:'var(--green)' },
          { l:'Abiertos', v: totales?.abiertos ?? 0, c:'var(--amber)' },
          { l:'Vencidos SLA', v: totales?.vencidos ?? 0, c:'var(--red)' },
        ].map(({ l, v, c }) => (
          <div key={l} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* SLA por prioridad */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Cumplimiento SLA por prioridad</div>
        <table>
          <thead><tr><th>Prioridad</th><th>Tiempo respuesta</th><th>Tiempo resolución</th><th>Total</th><th>Cumplidos</th><th>%</th></tr></thead>
          <tbody>
            {slaDetalle?.map(s => (
              <tr key={s.prioridad}>
                <td><span className={`prio prio-${s.prioridad}`}><span className="prio-dot" />{s.prioridad}</span></td>
                <td style={{ color:'var(--muted)' }}>{s.tiempo_primera_respuesta_min}min</td>
                <td style={{ color:'var(--muted)' }}>{Math.round(s.tiempo_resolucion_min/60)}h</td>
                <td>{s.total_tickets}</td>
                <td>{s.resolucion_ok}</td>
                <td style={{ fontWeight: 600, color: s.pct_cumplimiento >= 80 ? 'var(--green)' : 'var(--red)' }}>
                  {s.pct_cumplimiento ?? 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Categorías y agentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Por categoría</div>
          {por_categoria?.map(c => (
            <div key={c.categoria} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span>{c.categoria || '(sin categoría)'}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{c.cantidad}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>CSAT</div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>
              {csat?.promedio ? `${csat.promedio} ★` : '—'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{csat?.total ?? 0} encuestas respondidas</div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {csat && [
                { l:'5★', v: csat.cinco, c:'var(--green)' },
                { l:'4★', v: csat.cuatro, c:'var(--green)' },
                { l:'3★', v: csat.tres, c:'var(--amber)' },
                { l:'≤2★', v: csat.bajo, c:'var(--red)' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v ?? 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agentes */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontWeight: 600 }}>Rendimiento por agente</div>
        <table>
          <thead><tr><th>Agente</th><th>Total</th><th>Resueltos</th><th>Abiertos</th><th>FRT prom.</th><th>CSAT</th><th>SLA cumplidos</th></tr></thead>
          <tbody>
            {por_agente?.map(a => (
              <tr key={a.agente_id}>
                <td style={{ fontWeight: 500 }}>{a.agente}</td>
                <td>{a.total_tickets}</td>
                <td style={{ color:'var(--green)' }}>{a.resueltos}</td>
                <td>{a.abiertos}</td>
                <td style={{ color:'var(--muted)' }}>{a.frt_promedio ? `${a.frt_promedio}min` : '—'}</td>
                <td style={{ color:'var(--amber)' }}>{a.csat ? `${a.csat} ★` : '—'}</td>
                <td>{a.sla_cumplidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// KBPage.jsx
// ============================================================
export function KBPage() {
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');

  const cargar = async () => {
    setLoading(true);
    const q = buscar ? `?buscar=${buscar}` : '';
    api.get(`/kb${q}`).then(r => { setArticulos(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Buscar artículos..." value={buscar} onChange={e => setBuscar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()} style={{ flex: 1, maxWidth: 400 }} />
        <button className="btn btn-ghost" onClick={cargar}>Buscar</button>
      </div>
      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {articulos.length === 0
            ? <div className="empty-state"><div className="icon">◉</div><p>No hay artículos publicados</p></div>
            : articulos.map(a => (
              <div key={a.id} className="card" style={{ cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>{a.resumen}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                  <span>{a.categoria_nombre || 'General'}</span>
                  <span>👁 {a.vistas} vistas</span>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ============================================================
// ConfigPage.jsx
// ============================================================
export function ConfigPage() {
  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Configuración</h2>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Empresa</div>
          <div className="form-group"><label className="form-label">Nombre</label><input defaultValue="Magus Technology" /></div>
          <div className="form-group"><label className="form-label">Email soporte</label><input defaultValue="soporte@magus-ecommerce.com" /></div>
          <div className="form-group"><label className="form-label">Dominio portal</label><input defaultValue="magus-ecommerce.com" /></div>
          <button className="btn btn-primary">Guardar cambios</button>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Notificaciones</div>
          {['Email al crear ticket','Alerta SLA por vencer','Notificar respuesta al cliente','Enviar encuesta al cerrar','Cierre automático 48h'].map(n => (
            <label key={n} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, marginBottom:12 }}>
              <span>{n}</span>
              <input type="checkbox" defaultChecked={!n.includes('48h')} style={{ width:'auto' }} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EncuestaPage.jsx
// ============================================================
export function EncuestaPage() {
  const { token } = { token: window.location.pathname.split('/').pop() };
  const calParam = parseInt(new URLSearchParams(window.location.search).get('cal') || '0');
  const [rating, setRating] = useState(calParam || 0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!rating) return;
    setEnviando(true);
    try {
      await api.post('/tickets/encuesta', { token, calificacion: rating, comentario });
      setEnviado(true);
    } catch { setEnviando(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>{enviado ? '✅' : '⭐'}</div>
        {enviado ? (
          <>
            <h2 style={{ marginBottom: 8 }}>¡Gracias!</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Tu calificación fue registrada. Nos ayuda a mejorar.</p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 4 }}>¿Cómo fue tu experiencia?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Tu ticket fue resuelto. Califica la atención recibida.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} onClick={() => setRating(n)}
                  style={{ fontSize: 32, cursor: 'pointer', color: n <= rating ? 'var(--amber)' : 'var(--border)', transition: 'color .15s' }}>★</span>
              ))}
            </div>
            <textarea placeholder="Comentario opcional..." value={comentario} onChange={e => setComentario(e.target.value)}
              style={{ marginBottom: 12, minHeight: 70, fontSize: 13 }} />
            <button className="btn btn-primary" onClick={enviar} disabled={!rating || enviando}
              style={{ width: '100%', justifyContent: 'center' }}>
              {enviando ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
