import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';
import { ToastContainer } from '../pages/extra-pages.jsx';
import api from '../utils/api';

export default function MobileLayout() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const esAdmin = ['admin','supervisor'].includes(usuario?.rol);
  const esAgente = ['admin','supervisor','agente'].includes(usuario?.rol);
  const [notifs, setNotifs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/notificaciones').then(r => setNotifs(r.data)).catch(() => {});
  }, []);

  const sinLeer = notifs.filter(n => !n.leida).length;
  const iniciales = usuario ? (usuario.nombre[0] + (usuario.apellido?.[0] || '')).toUpperCase() : 'U';
  const path = location.pathname;

  const isActive = (p) => p === '/' ? path === '/' : path.startsWith(p);

  // Nav items según rol
  const navItems = [
    { path: '/',        icon: '⬡', label: 'Inicio',   show: true },
    { path: '/tickets', icon: '◈', label: 'Tickets',  show: true },
    { path: '/tickets/nuevo', icon: '+', label: 'Nuevo', show: true, special: true },
    { path: '/reportes', icon: '◫', label: 'Reportes', show: esAdmin },
    { path: '/menu',    icon: '☰', label: 'Más',       show: true, isMenu: true },
  ].filter(x => x.show);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <ToastContainer />

      {/* ── HEADER MÓVIL ── */}
      <div className="mobile-header">
        <div style={{ fontSize: 16, fontWeight: 800 }}>
          <span style={{ color: 'var(--accent)' }}>●</span> Magus Desk
        </div>
        <div style={{ flex: 1 }} />

        {/* Notificaciones */}
        <button onClick={() => navigate('/notificaciones')}
          style={{ position: 'relative', background: 'none', border: 'none', padding: 8, color: 'var(--text)' }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          {sinLeer > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff',
              fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 14, height: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{sinLeer > 9 ? '9+' : sinLeer}</span>
          )}
        </button>

        {/* Avatar */}
        <div onClick={() => setMenuOpen(true)}
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {iniciales}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="mobile-page">
        <Outlet />
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav">
        {navItems.map(item => {
          if (item.isMenu) {
            return (
              <button key="menu" className={`mobile-nav-item${menuOpen ? ' active' : ''}`}
                onClick={() => setMenuOpen(true)}>
                <span className="nav-icon">☰</span>
                <span>Más</span>
              </button>
            );
          }
          if (item.special) {
            return (
              <button key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff', boxShadow: '0 2px 12px rgba(79,127,255,.5)',
                  marginBottom: 2
                }}>+</div>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Nuevo</span>
              </button>
            );
          }
          return (
            <button key={item.path}
              className={`mobile-nav-item${isActive(item.path) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── DRAWER MENÚ ── */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--card)', borderRadius: '20px 20px 0 0',
              padding: '8px 0 calc(env(safe-area-inset-bottom) + 16px)',
              maxHeight: '85vh', overflowY: 'auto'
            }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '8px auto 16px' }} />

            {/* User info */}
            <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{iniciales}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{usuario?.nombre} {usuario?.apellido}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{usuario?.rol} · {usuario?.email}</div>
              </div>
            </div>

            {/* Menu items */}
            {[
              { path: '/',          icon: '⬡', label: 'Dashboard',          show: true },
              { path: '/tickets',   icon: '◈', label: 'Mis Tickets',        show: true },
              { path: '/agentes',   icon: '◉', label: 'Usuarios / Agentes', show: esAdmin },
              { path: '/clientes',  icon: '🏢', label: 'Empresas',          show: esAgente },
              { path: '/sla',       icon: '◷', label: 'Políticas SLA',      show: esAdmin },
              { path: '/reportes',  icon: '◫', label: 'Reportes',           show: esAdmin },
              { path: '/kb',        icon: '📚', label: 'Base Conocimiento', show: true },
              { path: '/config',    icon: '⚙', label: 'Configuración',      show: esAdmin },
            ].filter(x => x.show).map(item => (
              <button key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', background: isActive(item.path) ? 'rgba(79,127,255,.1)' : 'none',
                  border: 'none', color: isActive(item.path) ? 'var(--accent)' : 'var(--text)',
                  fontSize: 15, fontWeight: isActive(item.path) ? 600 : 400, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <button onClick={async () => { await logout(); navigate('/login'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', background: 'none', border: 'none',
                  color: 'var(--red)', fontSize: 15, fontWeight: 500, cursor: 'pointer'
                }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>⏻</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
