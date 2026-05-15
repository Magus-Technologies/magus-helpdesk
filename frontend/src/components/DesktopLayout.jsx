import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';
import { ToastContainer } from '../pages/extra-pages.jsx';
import api from '../utils/api';

const getLinkClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;

export default function DesktopLayout() {
  const { usuario, logout, esAdmin, esSupervisor, esAgente } = useAuthStore();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    api.get('/notificaciones').then(r => setNotifs(r.data)).catch(() => {});
  }, []);

  const sinLeer = notifs.filter(n => !n.leida).length;
  const iniciales = usuario ? (usuario.nombre[0] + (usuario.apellido?.[0] || '')).toUpperCase() : 'U';

  const marcarTodas = async () => {
    await api.patch('/notificaciones/leer-todas').catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, leida: true })));
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '⬡', exact: true },
    { to: '/tickets', label: 'Tickets', icon: '◈' },
    { to: '/tickets/nuevo', label: 'Nuevo Ticket', icon: '+' },
  ];
  const navGestion = [
    { to: '/agentes',  label: 'Usuarios / Agentes',  icon: '◉', roles: ['admin','supervisor'] },
    { to: '/clientes', label: 'Empresas / Clientes',  icon: '🏢', roles: ['admin','supervisor','agente'] },
    { to: '/sla',      label: 'Políticas SLA',        icon: '◷', roles: ['admin','supervisor'] },
  ];
  const navAnalisis = [
    { to: '/reportes', label: 'Reportes',          icon: '◫', roles: ['admin','supervisor'] },
    { to: '/kb',       label: 'Base Conocimiento', icon: '📚' },
  ];
  const navSistema = [
    { to: '/config', label: 'Configuración', icon: '⚙', roles: ['admin'] },
  ];

  const canSee = (roles) => !roles || roles.includes(usuario?.rol);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <ToastContainer />

      {/* SIDEBAR */}
      <aside style={{ width: 'var(--sidebar-w)', minWidth: 'var(--sidebar-w)', background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:-.3 }}>
            <span style={{ color:'var(--accent)' }}>●</span> Magus Help Desk
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>magus-ecommerce.com</div>
        </div>

        <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
          <style>{`
            .nav-item { display:flex; align-items:center; gap:9px; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; color:var(--muted); text-decoration:none; transition:all .15s; margin-bottom:2px; border:none; background:none; width:100%; }
            .nav-item:hover { background:var(--card); color:var(--text); text-decoration:none; }
            .nav-item.active { background:rgba(79,127,255,.15); color:var(--accent); font-weight:600; }
            .nav-section { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--muted); padding:10px 12px 5px; opacity:.7; }
          `}</style>

          <div className="nav-section">Principal</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} className={getLinkClass}>
              <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
            </NavLink>
          ))}

          {navGestion.some(i => canSee(i.roles)) && <div className="nav-section">Gestión</div>}
          {navGestion.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
            </NavLink>
          ))}

          {navAnalisis.some(i => canSee(i.roles)) && <div className="nav-section">Análisis</div>}
          {navAnalisis.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
            </NavLink>
          ))}

          {navSistema.some(i => canSee(i.roles)) && <div className="nav-section">Sistema</div>}
          {navSistema.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding:10, borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'var(--card)', border:'1px solid var(--border)' }}>
            <div className="avatar" style={{ width:30, height:30, fontSize:11, flexShrink:0 }}>{iniciales}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'capitalize' }}>{usuario?.rol}</div>
            </div>
            <button onClick={async () => { await logout(); navigate('/login'); }}
              title="Cerrar sesión"
              style={{ background:'none', border:'none', color:'var(--muted)', fontSize:16, cursor:'pointer', padding:'2px 4px', lineHeight:1 }}>⏻</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* TOPBAR */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
          <input placeholder="🔍 Buscar tickets..." style={{ flex:1, maxWidth:280, fontSize:13 }}
            onKeyDown={e => { if (e.key === 'Enter' && e.target.value) navigate(`/tickets?buscar=${e.target.value}`); }} />
          <div style={{ flex:1 }} />
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/tickets/nuevo')}>+ Nuevo Ticket</button>

          {/* Notificaciones */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setNotifOpen(o => !o)}
              style={{ width:36, height:36, borderRadius:8, background:'var(--card)', border:'1px solid var(--border)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              🔔
              {sinLeer > 0 && (
                <span style={{ position:'absolute', top:-3, right:-3, background:'var(--red)', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sinLeer > 9 ? '9+' : sinLeer}
                </span>
              )}
            </button>
            {notifOpen && (
              <div onClick={e => e.stopPropagation()}
                style={{ position:'absolute', top:'100%', right:0, marginTop:8, background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, width:320, boxShadow:'0 8px 32px rgba(0,0,0,.3)', zIndex:999, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>Notificaciones</div>
                  {sinLeer > 0 && <button className="btn btn-ghost btn-sm" onClick={marcarTodas} style={{ fontSize:11 }}>Marcar leídas</button>}
                </div>
                <div style={{ maxHeight:300, overflowY:'auto' }}>
                  {notifs.length === 0
                    ? <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Sin notificaciones</div>
                    : notifs.slice(0, 15).map(n => (
                      <div key={n.id}
                        style={{ padding:'10px 14px', borderBottom:'1px solid rgba(42,49,71,.4)', background:n.leida?'none':'rgba(79,127,255,.05)', cursor:'pointer' }}
                        onClick={() => { api.patch(`/notificaciones/${n.id}/leer`); if (n.ticket_id) { setNotifOpen(false); navigate(`/tickets/${n.ticket_id}`); } }}>
                        <div style={{ fontSize:13, fontWeight:n.leida?'normal':600, marginBottom:2 }}>{n.titulo}</div>
                        {n.mensaje && <div style={{ fontSize:12, color:'var(--muted)' }}>{n.mensaje}</div>}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }} onClick={() => setNotifOpen(false)}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
