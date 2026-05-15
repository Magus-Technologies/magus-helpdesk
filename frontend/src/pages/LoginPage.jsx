import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';
import { HorarioWidget } from './extra-pages.jsx';
import { useDevice } from '../hooks/useDevice';

export default function LoginPage() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [showPass, setShowPass] = useState(false);
  const { login, cargando, error } = useAuthStore();
  const { isMobile } = useDevice();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) navigate('/');
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding: isMobile ? '20px 16px' : 16
    }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom: isMobile ? 28 : 32 }}>
        <div style={{ fontSize: isMobile ? 28 : 32, fontWeight:800, marginBottom:6 }}>
          ● <span style={{ color:'var(--accent)' }}>Magus</span> Help Desk
        </div>
        <div style={{ color:'var(--muted)', fontSize: isMobile ? 14 : 15 }}>
          Portal de soporte empresarial
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{
        width:'100%', maxWidth: isMobile ? '100%' : 400,
        padding: isMobile ? 20 : 32
      }}>
        <h2 style={{ marginBottom:20, fontSize: isMobile ? 18 : 20, fontWeight:700 }}>
          Iniciar sesión
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              type="email" required
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              autoCapitalize="none"
              style={{ fontSize:16 }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} required
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                style={{ fontSize:16, paddingRight:44 }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'var(--muted)', cursor:'pointer',
                  fontSize:16, padding:4, lineHeight:1
                }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background:'rgba(240,78,78,.1)', border:'1px solid rgba(240,78,78,.3)',
              borderRadius:8, padding:'10px 12px', marginBottom:14,
              fontSize:13, color:'var(--red)'
            }}>{error}</div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={cargando}
            style={{ fontSize: isMobile ? 16 : 14, padding: isMobile ? '14px' : '11px', marginTop:4 }}>
            {cargando ? '⏳ Ingresando...' : 'Ingresar →'}
          </button>
        </form>

        <div style={{ marginTop:16, fontSize:12, color:'var(--muted)', textAlign:'center' }}>
          ¿Olvidaste tu contraseña?{' '}
          <a href="mailto:soporte@magus-ecommerce.com">Contacta al administrador</a>
        </div>
      </div>

      {/* Horario en login */}
      <div style={{ width:'100%', maxWidth: isMobile ? '100%' : 400, marginTop:16 }}>
        <HorarioWidget compact />
      </div>

      <div style={{ marginTop:16, fontSize:11, color:'var(--muted)', textAlign:'center' }}>
        © 2026 Magus Technology · magus-ecommerce.com
      </div>
    </div>
  );
}
