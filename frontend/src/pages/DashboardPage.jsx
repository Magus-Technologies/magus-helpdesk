import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
         LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import api from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement,
                 LineElement, PointElement, Tooltip, Legend, Filler);

const COLORES = { accent:'#4F7FFF', green:'#22C97A', amber:'#F5A623', red:'#F04E4E', muted:'#7A85A3' };

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(42,49,71,.5)' }, ticks: { color: '#7A85A3' } },
    y: { grid: { color: 'rgba(42,49,71,.5)' }, ticks: { color: '#7A85A3' } }
  }
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><div className="icon">⚠</div><p>Error al cargar dashboard</p></div>;

  const { hoy, estados, prioridades, agentes, sla, satisfaccion, tendencia7dias } = data;

  const tendenciaChart = {
    labels: (tendencia7dias || []).map(d => d.fecha?.slice(5)),
    datasets: [{
      label: 'Tickets', data: (tendencia7dias || []).map(d => d.tickets),
      borderColor: COLORES.accent, backgroundColor: 'rgba(79,127,255,.1)',
      fill: true, tension: .4, pointRadius: 4
    }]
  };

  const estadosChart = {
    labels: Object.keys(estados || {}),
    datasets: [{
      data: Object.values(estados || {}),
      backgroundColor: [COLORES.accent, COLORES.amber, COLORES.green, COLORES.muted, COLORES.red, '#9B59FF'],
      borderWidth: 0
    }]
  };

  const prioChart = {
    labels: (prioridades || []).map(p => p.prioridad),
    datasets: [{
      data: (prioridades || []).map(p => p.count),
      backgroundColor: [COLORES.red, COLORES.amber, '#4FC3F7', COLORES.muted],
      borderRadius: 4
    }]
  };

  return (
    <div className="fade-in">
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tickets hoy', value: hoy?.total ?? 0, color: COLORES.accent, icon: '◈', sub: 'Total creados hoy' },
          { label: 'Pendientes', value: hoy?.pendientes ?? 0, color: COLORES.amber, icon: '⏱', sub: 'Sin resolver' },
          { label: 'Vencidos SLA', value: hoy?.vencidos_sla ?? 0, color: COLORES.red, icon: '⚠', sub: 'Requieren atención' },
          { label: 'Cumplimiento SLA', value: `${hoy?.pct_sla ?? 0}%`, color: COLORES.green, icon: '✓', sub: 'Esta semana' },
        ].map(({ label, value, color, icon, sub }) => (
          <div key={label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 20, opacity: .25 }}>{icon}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Segunda fila: métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>FRT Promedio</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORES.accent }}>
            {sla?.frt_promedio_min ? `${Math.round(sla.frt_promedio_min)}min` : 'N/D'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Primera respuesta</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Resolución Prom.</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORES.amber }}>
            {sla?.ttr_promedio_min ? `${Math.round(sla.ttr_promedio_min / 60)}h` : 'N/D'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Tiempo resolución</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>CSAT Promedio</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORES.amber }}>
            {satisfaccion?.csat ? `${satisfaccion.csat} ★` : 'N/D'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Satisfacción ({satisfaccion?.total ?? 0} encuestas)</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Tickets últimos 7 días</div>
          <div style={{ height: 200 }}>
            <Line data={tendenciaChart} options={chartOpts} />
          </div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Por estado</div>
          <div style={{ height: 200 }}>
            <Doughnut data={estadosChart} options={{ ...chartOpts, cutout: '60%', scales: undefined,
              plugins: { legend: { position: 'bottom', labels: { color: '#7A85A3', font: { size: 11 }, padding: 8, boxWidth: 10 } } }
            }} />
          </div>
        </div>
      </div>

      {/* Carga agentes */}
      {agentes && agentes.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Carga de agentes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {agentes.slice(0, 6).map(a => (
              <div key={a.nombre} style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{a.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{a.tickets_abiertos} tickets</div>
                <div className="sla-bar" style={{ width: '100%' }}>
                  <div className={`sla-fill ${a.tickets_abiertos > 15 ? 'sla-danger' : a.tickets_abiertos > 8 ? 'sla-warn' : 'sla-ok'}`}
                    style={{ width: `${Math.min(100, (a.tickets_abiertos / 20) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo Ticket</button>
        <button className="btn btn-ghost" onClick={() => navigate('/tickets?estado=nuevo')}>Ver tickets nuevos</button>
        <button className="btn btn-ghost" onClick={() => navigate('/reportes')}>Ver reportes</button>
      </div>
    </div>
  );
}
