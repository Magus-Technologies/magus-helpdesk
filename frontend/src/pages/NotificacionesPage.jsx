import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { fmtRelativo } from '../../../responsive-update/responsive/src/utils/timeUtils';

// Página de notificaciones para móvil
export default function NotificacionesPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargar = () => {
    api.get('/notificaciones').then(r => { setNotifs(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const marcarTodas = async () => {
    await api.patch('/notificaciones/leer-todas').catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, leida: true })));
  };

  const sinLeer = notifs.filter(n => !n.leida).length;

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontSize:18, fontWeight:700 }}>Notificaciones</h2>
        {sinLeer > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={marcarTodas}>
            Marcar todas leídas
          </button>
        )}
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div>
      : notifs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔔</div>
          <p>Sin notificaciones</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n.id}
            onClick={() => {
              api.patch(`/notificaciones/${n.id}/leer`);
              if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
            }}
            style={{
              background: n.leida ? 'var(--card)' : 'rgba(79,127,255,.07)',
              border: `1px solid ${n.leida ? 'var(--border)' : 'rgba(79,127,255,.2)'}`,
              borderRadius:12, padding:'14px 16px', marginBottom:8, cursor:'pointer',
              WebkitTapHighlightColor:'transparent'
            }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              {!n.leida && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:5 }}/>}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight: n.leida ? 'normal' : 700, marginBottom:3 }}>{n.titulo}</div>
                {n.mensaje && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>{n.mensaje}</div>}
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{fmtRelativo(n.creado_en)}</div>
              </div>
              {n.ticket_id && <span style={{ color:'var(--accent)', fontSize:18 }}>›</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
