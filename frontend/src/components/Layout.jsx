import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⬡', exact: true },
  { to: '/tickets', label: 'Tickets', icon: '◈' },
  { to: '/tickets/nuevo', label: 'Nuevo Ticket', icon: '+' },
];
const navGestion = [
  { to: '/agentes', label: 'Agentes', icon: '◉', roles: ['admin','supervisor'] },
  { to: '/clientes', label: 'Clientes', icon: '◎', roles: ['admin','supervisor','agente'] },
  { to: '/sla', label: 'SLA', icon: '◷', roles: ['admin','supervisor'] },
];
const navAnalisis = [
  { to: '/reportes', label: 'Reportes', icon: '◫', roles: ['admin','supervisor'] },
  { to: '/kb', label: 'Base Conocimiento', icon: '◉' },
];
const navSistema = [
  { to: '/config', label: 'Configuración', icon: '⚙', roles: ['admin'] },
];

const getLinkClass = ({ isActive }) =>
  `nav-item${isActive ? ' active' : ''}`;

export default function Layout() {
  const { usuario, logout, esSupervisor, esAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [notifCount] = useState(3);

  const canSee = (roles) => !roles || roles.includes(usuario?.rol);

  const iniciales = usuario
    ? (usuario.nombre[0] + (usuario.apellido?.[0] || '')).toUpperCase()
    : 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 220, minWidth: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            ● <span style={{ color: 'var(--accent)' }}>Magus</span> Desk
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Help Desk Platform</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <style>{`
            .nav-item {
              display: flex; align-items: center; gap: 10px;
              padding: 9px 12px; border-radius: 8px; cursor: pointer;
              font-size: 13px; color: var(--muted); text-decoration: none;
              transition: all .15s; margin-bottom: 2px; border: none;
              background: none; width: 100%;
            }
            .nav-item:hover { background: var(--card); color: var(--text); text-decoration: none; }
            .nav-item.active { background: rgba(79,127,255,.15); color: var(--accent); }
            .nav-section {
              font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
              color: var(--muted); padding: 12px 12px 6px;
            }
          `}</style>

          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} className={getLinkClass}>
              <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
            </NavLink>
          ))}

          {navGestion.some(i => canSee(i.roles)) && (
            <div className="nav-section">Gestión</div>
          )}
          {navGestion.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
            </NavLink>
          ))}

          {navAnalisis.some(i => canSee(i.roles)) && (
            <div className="nav-section">Análisis</div>
          )}
          {navAnalisis.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
            </NavLink>
          ))}

          {navSistema.some(i => canSee(i.roles)) && (
            <div className="nav-section">Sistema</div>
          )}
          {navSistema.filter(i => canSee(i.roles)).map(item => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 8, borderRadius: 8, background: 'var(--card)'
          }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{iniciales}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{usuario?.rol}</div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, padding: 4 }}>
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOPBAR */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <input placeholder="🔍 Buscar tickets, clientes..."
            style={{ flex: 1, maxWidth: 300, fontSize: 13 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value) {
                navigate(`/tickets?buscar=${e.target.value}`);
              }
            }}
          />
          <div style={{ flex: 1 }} />
          <NavLink to="/tickets/nuevo">
            <button className="btn btn-primary">+ Nuevo Ticket</button>
          </NavLink>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative', fontSize: 16
          }}>
            🔔
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--red)', color: '#fff',
                fontSize: 10, fontWeight: 700, borderRadius: '50%',
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{notifCount}</span>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
