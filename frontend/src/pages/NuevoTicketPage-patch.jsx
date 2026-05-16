/**
 * MAGUS HELP DESK
 * Archivo: NuevoTicketPage actualizado con bloqueo fuera de horario
 * 
 * INSTRUCCIONES:
 * En tu extra-pages.jsx, reemplaza SOLO la función NuevoTicketPage
 * con el contenido de esta función.
 * 
 * También necesitas copiar horarioUtils.js a:
 *   frontend/src/utils/horarioUtils.js
 * 
 * Y agregar este import al inicio de extra-pages.jsx:
 *   import { verificarHorario, formatearHorarioLegible } from '../utils/horarioUtils';
 */

// ─────────────────────────────────────────────────────────────
// COMPONENTE: Pantalla de fuera de horario
// ─────────────────────────────────────────────────────────────
// PEGA ESTE COMPONENTE antes de la función NuevoTicketPage en extra-pages.jsx

function FueraDeHorario({ horario, estado }) {
  const horarioLegible = formatearHorarioLegible(horario);

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: '0 4px'
    }}>
      {/* Card principal */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,127,255,.08), rgba(124,92,252,.05))',
        border: '1px solid rgba(79,127,255,.25)',
        borderRadius: 16,
        padding: '32px 28px',
        textAlign: 'center',
        animation: 'fadeIn .3s ease'
      }}>
        {/* Ícono animado */}
        <div style={{
          fontSize: 56,
          marginBottom: 16,
          lineHeight: 1,
          filter: 'drop-shadow(0 4px 12px rgba(79,127,255,.3))'
        }}>
          🕐
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 16,
          lineHeight: 1.3
        }}>
          Fuera de horario de atención
        </h2>

        {/* Mensaje principal */}
        <div style={{
          background: 'rgba(0,0,0,.2)',
          border: '1px solid rgba(79,127,255,.15)',
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 20,
          textAlign: 'left'
        }}>
          <p style={{
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.8,
            margin: 0,
            whiteSpace: 'pre-line'
          }}>
{`👋 Hola, gracias por comunicarte con Magus Help Desk.

En este momento nos encontramos fuera de horario de atención, por lo que temporalmente no es posible generar nuevos tickets.`}
          </p>
        </div>

        {/* Horario */}
        <div style={{
          background: 'rgba(79,127,255,.08)',
          border: '1px solid rgba(79,127,255,.2)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: .8,
            color: 'var(--accent)',
            marginBottom: 10
          }}>
            ⏰ Horario de soporte
          </div>
          <div style={{
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 2,
            whiteSpace: 'pre-line',
            fontWeight: 500
          }}>
            {horarioLegible || `• Lunes a Viernes: 9:00 – 17:00\n• Sábados: 9:00 – 13:00`}
          </div>
        </div>

        {/* Próxima apertura */}
        {estado?.proximaApertura && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'rgba(34,201,122,.08)',
            border: '1px solid rgba(34,201,122,.2)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20
          }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              Podrás crear tu ticket {estado.proximaApertura}
            </span>
          </div>
        )}

        {/* Mensaje de cierre */}
        <p style={{
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.7,
          margin: '0 0 20px'
        }}>
          Apenas iniciemos nuestro próximo horario, podrás registrar tu solicitud con normalidad.
          Gracias por tu comprensión y confianza 💙
        </p>

        {/* Urgencias */}
        {horario?.telefono_urgencias && (
          <div style={{
            background: 'rgba(245,166,35,.08)',
            border: '1px solid rgba(245,166,35,.2)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20
          }}>
            <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700, marginBottom: 4 }}>
              ☎ Urgencias fuera de horario
            </div>
            <a href={`tel:${horario.telefono_urgencias}`}
              style={{ fontSize: 16, color: 'var(--amber)', fontWeight: 800, textDecoration: 'none' }}>
              {horario.telefono_urgencias}
            </a>
          </div>
        )}

        {/* Botón volver */}
        <button
          className="btn btn-ghost"
          onClick={() => window.history.back()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Widget horario pequeño abajo */}
      <div style={{ marginTop: 12 }}>
        <HorarioWidget />
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// FUNCIÓN NuevoTicketPage ACTUALIZADA
// Reemplaza la función NuevoTicketPage existente en extra-pages.jsx
// ─────────────────────────────────────────────────────────────
export function NuevoTicketPage() {
  const navigate = useNavigate();
  const { usuario, esAgente } = useAuthStore();
  const esCliente = usuario?.rol === 'cliente';

  // Estado horario
  const [horario, setHorario] = useState(null);
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  // Estado form
  const [form, setForm] = useState({
    asunto: '', descripcion: '', categoria_id: '', prioridad: 'media',
    empresa_id: '', agente_id: '', canal_origen: 'portal', tags: ''
  });
  const [categorias, setCategorias] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  // Verificar horario al montar
  useEffect(() => {
    const cargarHorario = async () => {
      try {
        const r = await api.get('/horario');
        const h = r.data;
        setHorario(h);
        // Clientes y empresas respetan horario — admins/agentes pueden siempre
        if (esCliente) {
          const estado = verificarHorario(h);
          setEstadoHorario(estado);
        } else {
          setEstadoHorario({ abierto: true });
        }
      } catch {
        // Si falla la verificación, permitir crear ticket
        setEstadoHorario({ abierto: true });
      } finally {
        setVerificando(false);
      }
    };
    cargarHorario();
  }, []);

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {});
    api.get('/usuarios').then(r => {
      setAgentes(r.data.filter(u => ['agente','supervisor'].includes(u.rol) && u.activo));
    }).catch(() => {});
    if (esAgente()) {
      api.get('/empresas').then(r => setEmpresas(r.data)).catch(() => {});
    }
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();

    // Doble verificación al enviar (por si cambió el horario)
    if (esCliente && horario) {
      const estadoActual = verificarHorario(horario);
      if (!estadoActual.abierto) {
        setEstadoHorario(estadoActual);
        return;
      }
    }

    if (!form.asunto.trim() || !form.descripcion.trim()) {
      setError('Asunto y descripción son requeridos');
      return;
    }
    setEnviando(true); setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      const res = await api.post('/tickets', payload);
      if (archivos.length > 0) {
        const fd = new FormData();
        archivos.forEach(f => fd.append('archivos', f));
        await api.post(`/tickets/${res.data.id}/adjuntos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      toast('✅ Ticket creado exitosamente');
      navigate(`/tickets/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear ticket');
    } finally { setEnviando(false); }
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Cargando verificación ──
  if (verificando) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Verificando disponibilidad...</span>
      </div>
    );
  }

  // ── FUERA DE HORARIO (solo clientes) ──
  if (esCliente && estadoHorario && !estadoHorario.abierto) {
    return <FueraDeHorario horario={horario} estado={estadoHorario} />;
  }

  // ── FORMULARIO NORMAL ──
  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tickets')}>← Volver</button>
        <h2 style={{ fontSize:18, fontWeight:800 }}>Nuevo Ticket de Soporte</h2>
      </div>

      {/* Horario compacto (solo cuando está abierto) */}
      <div style={{ marginBottom:16 }}>
        <HorarioWidget compact />
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asunto del problema *</label>
            <input
              placeholder="Ej: No puedo acceder a mi cuenta, Error en facturación..."
              value={form.asunto}
              onChange={e => sf('asunto', e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select value={form.categoria_id} onChange={e => sf('categoria_id', e.target.value)}>
                <option value="">📁 Sin categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.icono || '📁'} {c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad *</label>
              <select value={form.prioridad} onChange={e => sf('prioridad', e.target.value)}>
                <option value="baja">🟢 Baja — No urgente</option>
                <option value="media">🔵 Media — Normal</option>
                <option value="alta">🟡 Alta — Requiere atención pronto</option>
                <option value="critica">🔴 Crítica — Afecta operaciones</option>
              </select>
            </div>
          </div>

          {/* Técnico preferido — todos pueden elegir */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                🧑‍💻 Técnico preferido
                <span style={{ color:'var(--muted)', fontWeight:'normal', marginLeft:6, fontSize:11 }}>(opcional)</span>
              </label>
              <select value={form.agente_id} onChange={e => sf('agente_id', e.target.value)}>
                <option value="">Asignar automáticamente</option>
                {agentes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido} — {a.rol}</option>
                ))}
              </select>
              {form.agente_id && (
                <div style={{ fontSize:11, color:'var(--green)', marginTop:3 }}>✓ Se asignará a este técnico</div>
              )}
            </div>
            {esAgente() && (
              <div className="form-group">
                <label className="form-label">Canal de origen</label>
                <select value={form.canal_origen} onChange={e => sf('canal_origen', e.target.value)}>
                  <option value="portal">🌐 Portal web</option>
                  <option value="email">📧 Email</option>
                  <option value="telefono">☎ Teléfono</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="api">⚙ API</option>
                </select>
              </div>
            )}
          </div>

          {esAgente() && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Empresa cliente</label>
                <select value={form.empresa_id} onChange={e => sf('empresa_id', e.target.value)}>
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Etiquetas (separadas por coma)</label>
                <input placeholder="urgente, factura, acceso..." value={form.tags} onChange={e => sf('tags', e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Descripción detallada *</label>
            <textarea
              placeholder={`Describe el problema con el mayor detalle posible:\n• ¿Qué estabas haciendo cuando ocurrió?\n• ¿Qué mensaje de error apareció?\n• ¿Desde cuándo ocurre?\n• ¿En qué dispositivo/navegador?`}
              value={form.descripcion}
              onChange={e => sf('descripcion', e.target.value)}
              style={{ minHeight:140 }}
              required
            />
          </div>

          {/* Adjuntos */}
          <div className="form-group">
            <label className="form-label">📎 Adjuntos (capturas, documentos)</label>
            <input ref={fileRef} type="file" multiple style={{ display:'none' }}
              onChange={e => setArchivos(Array.from(e.target.files))}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
                📎 Seleccionar archivos
              </button>
              {archivos.map((f, i) => (
                <span key={i} style={{ fontSize:11, background:'rgba(79,127,255,.1)', color:'var(--accent)', padding:'3px 8px', borderRadius:4, display:'flex', alignItems:'center', gap:4 }}>
                  {f.name}
                  <span style={{ cursor:'pointer', opacity:.7 }} onClick={() => setArchivos(a => a.filter((_,j) => j !== i))}>×</span>
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background:'rgba(240,78,78,.1)', border:'1px solid rgba(240,78,78,.3)', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:13, color:'var(--red)' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-primary" type="submit" disabled={enviando} style={{ minWidth:140 }}>
              {enviando ? 'Creando ticket...' : '✓ Crear ticket'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/tickets')}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
