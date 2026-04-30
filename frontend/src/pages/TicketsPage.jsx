import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const ESTADOS = ['todos','nuevo','asignado','en_progreso','en_espera_cliente','en_espera_interno','resuelto','cerrado'];
const ESTADO_LABEL = { todos:'Todos', nuevo:'Nuevo', asignado:'Asignado', en_progreso:'En progreso',
  en_espera_cliente:'Espera cliente', en_espera_interno:'Espera interno', resuelto:'Resuelto', cerrado:'Cerrado' };

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ estado: 'todos', prioridad: '', page: 1, buscar: '' });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const buscarParam = searchParams.get('buscar') || '';
    const estadoParam = searchParams.get('estado') || 'todos';
    setParams(p => ({ ...p, buscar: buscarParam, estado: estadoParam }));
  }, []);

  useEffect(() => {
    cargar();
  }, [params]);

  const cargar = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (params.estado && params.estado !== 'todos') q.set('estado', params.estado);
      if (params.prioridad) q.set('prioridad', params.prioridad);
      if (params.buscar) q.set('buscar', params.buscar);
      q.set('page', params.page);
      q.set('limit', 20);
      const res = await api.get(`/tickets?${q}`);
      setTickets(res.data.tickets);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  const slaClass = (t) => {
    if (t.sla_vencido) return 'sla-danger';
    if (!t.sla_resolucion_limite) return 'sla-ok';
    const pct = (new Date() - new Date(t.creado_en)) / (new Date(t.sla_resolucion_limite) - new Date(t.creado_en)) * 100;
    return pct >= 80 ? 'sla-warn' : 'sla-ok';
  };

  return (
    <div className="fade-in">
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {ESTADOS.map(e => (
          <button key={e}
            onClick={() => setParams(p => ({ ...p, estado: e, page: 1 }))}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: params.estado === e ? 'var(--accent)' : 'none',
              color: params.estado === e ? '#fff' : 'var(--muted)',
              transition: 'all .15s'
            }}>
            {ESTADO_LABEL[e]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select value={params.prioridad} onChange={e => setParams(p => ({ ...p, prioridad: e.target.value, page: 1 }))}
            style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}>
            <option value="">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◈</div>
            <p>No hay tickets con estos filtros</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Asunto</th><th>Cliente</th><th>Categoría</th>
                <th>Prioridad</th><th>Estado</th><th>Agente</th><th>SLA</th><th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{t.codigo}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {t.sla_vencido && <span title="SLA vencido" style={{ color: 'var(--red)', marginRight: 4 }}>⚠</span>}
                    {t.asunto}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div>{t.cliente_nombre}</div>
                    {t.empresa_nombre && <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t.empresa_nombre}</div>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.categoria_nombre || '—'}</td>
                  <td>
                    <span className={`prio prio-${t.prioridad}`}>
                      <span className="prio-dot" /> {t.prioridad}
                    </span>
                  </td>
                  <td><span className={`badge badge-${t.estado}`}>{t.estado.replace(/_/g,' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.agente_nombre || '—'}</td>
                  <td>
                    <div className="sla-bar">
                      <div className={`sla-fill ${slaClass(t)}`} style={{ width: t.sla_vencido ? '100%' : '60%' }} />
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(t.creado_en).toLocaleDateString('es-PE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
        <span>{total} tickets encontrados</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" disabled={params.page <= 1}
            onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}>← Anterior</button>
          <button className="btn btn-ghost btn-sm"
            disabled={params.page * 20 >= total}
            onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}
