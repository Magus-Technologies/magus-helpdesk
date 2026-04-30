import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, cargando, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
            ● <span style={{ color: 'var(--accent)' }}>Magus</span> Help Desk
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Plataforma de soporte empresarial</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 24, fontSize: 18, fontWeight: 600 }}>Iniciar sesión</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                type="email" required placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password" required placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            {error && (
              <div style={{
                background: 'rgba(240,78,78,.12)', border: '1px solid rgba(240,78,78,.3)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 12,
                fontSize: 13, color: 'var(--red)'
              }}>{error}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={cargando}
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}>
              {cargando ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            ¿Olvidaste tu contraseña? <a href="mailto:soporte@magus-ecommerce.com">Contacta al administrador</a>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          © 2025 Magus Technology · magus-ecommerce.com
        </div>
      </div>
    </div>
  );
}
