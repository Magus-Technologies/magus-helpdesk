import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';

// ─────────────────────────────────────────
// MODAL GENÉRICO
// ─────────────────────────────────────────
function Modal({ title, onClose, children, width = 520 }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'auto',boxShadow:'0 12px 48px rgba(0,0,0,.5)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--card)',zIndex:1}}>
          <div style={{fontWeight:700,fontSize:15}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:22,lineHeight:1,cursor:'pointer',padding:'0 4px'}}>×</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
let _toastFn = null;
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _toastFn = (msg, type='success') => {
    const id = Date.now();
    setToasts(t => [...t, {id,msg,type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <div style={{position:'fixed',top:16,right:16,zIndex:99999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:t.type==='error'?'var(--red)':t.type==='warn'?'var(--amber)':'var(--green)',
          color:'#fff',padding:'11px 16px',borderRadius:8,fontSize:13,fontWeight:600,
          boxShadow:'0 4px 20px rgba(0,0,0,.35)',minWidth:240,maxWidth:380,
          animation:'fadeIn .2s ease'
        }}>{t.msg}</div>
      ))}
    </div>
  );
}
export const toast = (msg, type) => _toastFn && _toastFn(msg, type);

// ─────────────────────────────────────────
// HORARIO WIDGET — se usa en LoginPage y Encuesta también
// ─────────────────────────────────────────
export function HorarioWidget({ compact = false }) {
  const [horario, setHorario] = useState(null);
  useEffect(() => { api.get('/horario').then(r=>setHorario(r.data)).catch(()=>{}); }, []);

  if (!horario) return null;

  const dias = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const ahora = new Date();
  const diaHoy = dias[ahora.getDay()===0?6:ahora.getDay()-1];
  const hoyConfig = horario[diaHoy];
  const horaActual = ahora.getHours()*60 + ahora.getMinutes();
  let abierto = false;
  if (hoyConfig?.activo && hoyConfig.desde && hoyConfig.hasta) {
    const [dh,dm] = hoyConfig.desde.split(':').map(Number);
    const [hh,hm] = hoyConfig.hasta.split(':').map(Number);
    abierto = horaActual >= dh*60+dm && horaActual < hh*60+hm;
  }

  if (compact) return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--card)',borderRadius:8,border:'1px solid var(--border)',fontSize:13}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:abierto?'var(--green)':'var(--red)',flexShrink:0}}/>
      <span style={{fontWeight:600,color:abierto?'var(--green)':'var(--red)'}}>{abierto?'Atendiendo ahora':'Fuera de horario'}</span>
      {hoyConfig?.activo&&hoyConfig.desde&&<span style={{color:'var(--muted)'}}>· Hoy {hoyConfig.desde} – {hoyConfig.hasta}</span>}
    </div>
  );

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:abierto?'var(--green)':'var(--red)',boxShadow:`0 0 8px ${abierto?'var(--green)':'var(--red)'}`,flexShrink:0}}/>
        <span style={{fontWeight:700,fontSize:15,color:abierto?'var(--green)':'var(--red)'}}>
          {abierto?'✅ Estamos atendiendo':'⏸ Fuera de horario de atención'}
        </span>
        <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{horario.zona_horaria||'America/Lima'}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,marginBottom:12}}>
        {dias.map((d,i)=>{
          const cfg = horario[d];
          const esHoy = d===diaHoy;
          return (
            <div key={d} style={{
              textAlign:'center',padding:'8px 4px',borderRadius:8,
              background:esHoy?'rgba(79,127,255,.15)':'var(--surface)',
              border:`1px solid ${esHoy?'var(--accent)':'var(--border)'}`,
              opacity:cfg?.activo?1:.45
            }}>
              <div style={{fontSize:10,fontWeight:esHoy?700:500,color:esHoy?'var(--accent)':'var(--muted)',marginBottom:4}}>{labels[i]}</div>
              {cfg?.activo&&cfg.desde
                ? <>
                    <div style={{fontSize:10,color:'var(--text)',fontWeight:500}}>{cfg.desde}</div>
                    <div style={{fontSize:9,color:'var(--muted)'}}>–</div>
                    <div style={{fontSize:10,color:'var(--text)',fontWeight:500}}>{cfg.hasta}</div>
                  </>
                : <div style={{fontSize:10,color:'var(--muted)'}}>Cerrado</div>
              }
            </div>
          );
        })}
      </div>
      {horario.telefono_urgencias&&(
        <div style={{fontSize:12,color:'var(--amber)',background:'rgba(245,166,35,.08)',padding:'8px 10px',borderRadius:6,marginBottom:8}}>
          ☎ Urgencias: <strong>{horario.telefono_urgencias}</strong>
        </div>
      )}
      {!abierto&&horario.mensaje_fuera_horario&&(
        <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic',borderTop:'1px solid var(--border)',paddingTop:8}}>
          💬 {horario.mensaje_fuera_horario}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// NUEVO TICKET — cliente elige técnico
// ─────────────────────────────────────────
export function NuevoTicketPage() {
  const navigate = useNavigate();
  const { usuario, esAgente } = useAuthStore();
  const esCliente = usuario?.rol === 'cliente';
  const [form, setForm] = useState({asunto:'',descripcion:'',categoria_id:'',prioridad:'media',empresa_id:'',agente_id:'',canal_origen:'portal',tags:''});
  const [categorias, setCategorias] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});
    // TODOS pueden elegir técnico (clientes también)
    api.get('/usuarios').then(r => {
      const techs = r.data.filter(u=>['agente','supervisor'].includes(u.rol)&&u.activo);
      setAgentes(techs);
    }).catch(()=>{});
    if (esAgente()) {
      api.get('/empresas').then(r=>setEmpresas(r.data)).catch(()=>{});
    }
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if(!form.asunto.trim()||!form.descripcion.trim()){setError('Asunto y descripción son requeridos');return;}
    setEnviando(true);setError('');
    try {
      const payload={...form, tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]};
      delete payload.tags_raw;
      const res = await api.post('/tickets', payload);
      // subir adjuntos si hay
      if (archivos.length > 0) {
        const fd = new FormData();
        archivos.forEach(f=>fd.append('archivos',f));
        await api.post(`/tickets/${res.data.id}/adjuntos`, fd, {headers:{'Content-Type':'multipart/form-data'}});
      }
      toast('✅ Ticket creado exitosamente');
      navigate(`/tickets/${res.data.id}`);
    } catch(err) {
      setError(err.response?.data?.error||'Error al crear ticket');
    } finally { setEnviando(false); }
  };
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  return (
    <div className="fade-in" style={{maxWidth:720}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/tickets')}>← Volver</button>
        <h2 style={{fontSize:18,fontWeight:800}}>Nuevo Ticket de Soporte</h2>
      </div>

      {/* Horario compacto */}
      <div style={{marginBottom:16}}><HorarioWidget compact /></div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asunto del problema *</label>
            <input placeholder="Ej: No puedo acceder a mi cuenta, Error en facturación..." value={form.asunto} onChange={e=>sf('asunto',e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select value={form.categoria_id} onChange={e=>sf('categoria_id',e.target.value)}>
                <option value="">📁 Sin categoría</option>
                {categorias.map(c=><option key={c.id} value={c.id}>{c.icono||'📁'} {c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad *</label>
              <select value={form.prioridad} onChange={e=>sf('prioridad',e.target.value)}>
                <option value="baja">🟢 Baja — No urgente</option>
                <option value="media">🔵 Media — Normal</option>
                <option value="alta">🟡 Alta — Requiere atención pronto</option>
                <option value="critica">🔴 Crítica — Afecta operaciones</option>
              </select>
            </div>
          </div>

          {/* TÉCNICO — visible para todos */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                🧑‍💻 Técnico preferido
                <span style={{color:'var(--muted)',fontWeight:'normal',marginLeft:6,fontSize:11}}>(opcional)</span>
              </label>
              <select value={form.agente_id} onChange={e=>sf('agente_id',e.target.value)}>
                <option value="">Asignar automáticamente</option>
                {agentes.map(a=>(
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellido} — {a.rol}</option>
                ))}
              </select>
              {form.agente_id&&<div style={{fontSize:11,color:'var(--green)',marginTop:3}}>✓ Se asignará a este técnico</div>}
            </div>
            {esAgente()&&(
              <div className="form-group">
                <label className="form-label">Canal de origen</label>
                <select value={form.canal_origen} onChange={e=>sf('canal_origen',e.target.value)}>
                  <option value="portal">🌐 Portal web</option>
                  <option value="email">📧 Email</option>
                  <option value="telefono">☎ Teléfono</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="api">⚙ API</option>
                </select>
              </div>
            )}
          </div>

          {esAgente()&&(
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Empresa cliente</label>
                <select value={form.empresa_id} onChange={e=>sf('empresa_id',e.target.value)}>
                  <option value="">Sin empresa</option>
                  {empresas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Etiquetas (separadas por coma)</label>
                <input placeholder="urgente, factura, acceso..." value={form.tags} onChange={e=>sf('tags',e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Descripción detallada del problema *</label>
            <textarea
              placeholder="Describe el problema con el mayor detalle posible:&#10;• ¿Qué estabas haciendo cuando ocurrió?&#10;• ¿Qué mensaje de error apareció?&#10;• ¿Desde cuándo ocurre?&#10;• ¿En qué dispositivo/navegador?"
              value={form.descripcion}
              onChange={e=>sf('descripcion',e.target.value)}
              style={{minHeight:150}} required />
          </div>

          {/* Adjuntos */}
          <div className="form-group">
            <label className="form-label">📎 Adjuntos (capturas, documentos)</label>
            <input ref={fileRef} type="file" multiple style={{display:'none'}} onChange={e=>setArchivos(Array.from(e.target.files))} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={()=>fileRef.current.click()}>
                📎 Seleccionar archivos
              </button>
              {archivos.map((f,i)=>(
                <span key={i} style={{fontSize:11,background:'rgba(79,127,255,.1)',color:'var(--accent)',padding:'3px 8px',borderRadius:4,display:'flex',alignItems:'center',gap:4}}>
                  {f.name}
                  <span style={{cursor:'pointer',opacity:.7,fontSize:14}} onClick={()=>setArchivos(a=>a.filter((_,j)=>j!==i))}>×</span>
                </span>
              ))}
            </div>
          </div>

          {error&&<div style={{background:'rgba(240,78,78,.1)',border:'1px solid rgba(240,78,78,.3)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13,color:'var(--red)'}}>{error}</div>}
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn btn-primary" type="submit" disabled={enviando} style={{minWidth:140}}>
              {enviando?'Creando ticket...':'✓ Crear ticket'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={()=>navigate('/tickets')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// AGENTES PAGE
// ─────────────────────────────────────────
export function AgentesPage() {
  const { esAdmin } = useAuthStore();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({nombre:'',apellido:'',email:'',rol:'agente',password:'',telefono:''});
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const cargar = () => { setLoading(true); api.get('/usuarios').then(r=>{setUsuarios(r.data);setLoading(false);}).catch(()=>setLoading(false)); };
  useEffect(()=>cargar(),[]);

  const abrirNuevo = () => { setEditando(null);setForm({nombre:'',apellido:'',email:'',rol:'agente',password:'',telefono:''});setErrForm('');setModal(true); };
  const abrirEditar = u => { setEditando(u);setForm({nombre:u.nombre,apellido:u.apellido,email:u.email,rol:u.rol,password:'',telefono:u.telefono||''});setErrForm('');setModal(true); };

  const guardar = async e => {
    e.preventDefault();
    if(!form.nombre||!form.email||(!editando&&!form.password)){setErrForm('Nombre, email y contraseña son requeridos');return;}
    setGuardando(true);setErrForm('');
    try {
      if(editando){
        await api.put(`/usuarios/${editando.id}`,{nombre:form.nombre,apellido:form.apellido,rol:form.rol,telefono:form.telefono});
        if(form.password) await api.patch(`/usuarios/${editando.id}/password`,{password:form.password});
        toast('Usuario actualizado');
      } else {
        await api.post('/usuarios',form);toast('Usuario creado ✓');
      }
      setModal(false);cargar();
    } catch(err){setErrForm(err.response?.data?.error||'Error al guardar');}
    finally{setGuardando(false);}
  };

  const desactivar = async u => {
    if(!window.confirm(`¿Desactivar a ${u.nombre} ${u.apellido}?`)) return;
    try{await api.delete(`/usuarios/${u.id}`);toast('Usuario desactivado','warn');cargar();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
  };
  const reactivar = async u => {
    try{await api.put(`/usuarios/${u.id}`,{activo:true});toast('Usuario reactivado ✓');cargar();}
    catch{toast('Error','error');}
  };

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const rolColor = {admin:'var(--red)',supervisor:'var(--amber)',agente:'var(--accent)',cliente:'var(--muted)'};
  const filtrados = usuarios.filter(u=>{
    const ok=!filtroRol||u.rol===filtroRol;
    const m=!buscar||`${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(buscar.toLowerCase());
    return ok&&m;
  });

  return (
    <div className="fade-in">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input placeholder="Buscar..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{width:180}} />
          <select value={filtroRol} onChange={e=>setFiltroRol(e.target.value)} style={{width:150}}>
            <option value="">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="supervisor">Supervisor</option>
            <option value="agente">Agente</option>
            <option value="cliente">Cliente</option>
          </select>
          <span style={{color:'var(--muted)',fontSize:12}}>{filtrados.length} usuario{filtrados.length!==1?'s':''}</span>
        </div>
        {esAdmin()&&<button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo usuario</button>}
      </div>

      {loading?<div className="loading"><div className="spinner"/></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))',gap:12}}>
          {filtrados.map(u=>{
            const ini=(u.nombre[0]+(u.apellido?.[0]||'')).toUpperCase();
            return (
              <div key={u.id} className="card" style={{position:'relative',opacity:u.activo?1:.55,borderTop:`3px solid ${rolColor[u.rol]||'var(--border)'}`}}>
                {!u.activo&&<div style={{position:'absolute',top:10,right:10,fontSize:9,background:'var(--red)',color:'#fff',padding:'2px 5px',borderRadius:3,fontWeight:700}}>INACTIVO</div>}
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div className="avatar" style={{flexShrink:0}}>{ini}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.nombre} {u.apellido}</div>
                    <span style={{fontSize:11,background:`${rolColor[u.rol]}22`,color:rolColor[u.rol],padding:'1px 6px',borderRadius:3,fontWeight:600,textTransform:'capitalize'}}>{u.rol}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:2}}>✉ {u.email}</div>
                {u.telefono&&<div style={{fontSize:12,color:'var(--muted)',marginBottom:2}}>☎ {u.telefono}</div>}
                {u.ultimo_acceso&&<div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Último acceso: {new Date(u.ultimo_acceso).toLocaleDateString('es-PE')}</div>}
                {esAdmin()&&(
                  <div style={{display:'flex',gap:6,marginTop:10}}>
                    <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>abrirEditar(u)}>✏ Editar</button>
                    {u.activo
                      ?<button className="btn btn-ghost btn-sm" onClick={()=>desactivar(u)} style={{color:'var(--red)'}} title="Desactivar">✕</button>
                      :<button className="btn btn-ghost btn-sm" onClick={()=>reactivar(u)} style={{color:'var(--green)'}} title="Reactivar">✓</button>
                    }
                  </div>
                )}
              </div>
            );
          })}
          {filtrados.length===0&&<div className="empty-state"><div className="icon">◉</div><p>No hay usuarios con esos filtros</p></div>}
        </div>
      )}

      {modal&&(
        <Modal title={editando?'Editar usuario':'Nuevo usuario'} onClose={()=>setModal(false)}>
          <form onSubmit={guardar}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e=>sf('nombre',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Apellido</label><input value={form.apellido} onChange={e=>sf('apellido',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email *</label><input type="email" value={form.email} onChange={e=>sf('email',e.target.value)} disabled={!!editando} required /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input value={form.telefono} onChange={e=>sf('telefono',e.target.value)} placeholder="+51 999 999 999" /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rol *</label>
                <select value={form.rol} onChange={e=>sf('rol',e.target.value)}>
                  <option value="agente">Agente de soporte</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{editando?'Nueva contraseña (vacío = no cambiar)':'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={e=>sf('password',e.target.value)} required={!editando} />
              </div>
            </div>
            {errForm&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar':'Crear usuario'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// CLIENTES/EMPRESAS PAGE — con horario
// ─────────────────────────────────────────
export function ClientesPage() {
  const { esSupervisor } = useAuthStore();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState({nombre:'',ruc:'',email:'',telefono:'',direccion:'',plan:'starter',ejecutivo_id:''});
  const [agentes, setAgentes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');

  const cargar = () => { setLoading(true); api.get('/empresas').then(r=>{setEmpresas(r.data);setLoading(false);}).catch(()=>setLoading(false)); };
  useEffect(()=>{cargar();api.get('/usuarios?rol=agente').then(r=>setAgentes(r.data)).catch(()=>{});}, []);

  const abrirNuevo = () => { setEditando(null);setForm({nombre:'',ruc:'',email:'',telefono:'',direccion:'',plan:'starter',ejecutivo_id:''});setErrForm('');setModal(true); };
  const abrirEditar = emp => { setEditando(emp);setForm({nombre:emp.nombre,ruc:emp.ruc||'',email:emp.email||'',telefono:emp.telefono||'',direccion:emp.direccion||'',plan:emp.plan||'starter',ejecutivo_id:emp.ejecutivo_id||''});setErrForm('');setModal(true); };
  const abrirDetalle = async emp => { try{const r=await api.get(`/empresas/${emp.id}`);setDetalle(r.data);}catch{toast('Error al cargar detalle','error');} };

  const guardar = async e => {
    e.preventDefault();
    if(!form.nombre.trim()){setErrForm('El nombre es requerido');return;}
    setGuardando(true);setErrForm('');
    try{
      if(editando){await api.put(`/empresas/${editando.id}`,form);toast('Empresa actualizada');}
      else{await api.post('/empresas',form);toast('Empresa creada ✓');}
      setModal(false);cargar();
    }catch(err){setErrForm(err.response?.data?.error||'Error al guardar');}
    finally{setGuardando(false);}
  };

  const eliminar = async emp => {
    if(!window.confirm(`¿Eliminar/desactivar "${emp.nombre}"?`)) return;
    try{const r=await api.delete(`/empresas/${emp.id}`);toast(r.data.mensaje,'warn');cargar();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
  };

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const filtradas=empresas.filter(e=>!buscar||`${e.nombre}${e.ruc||''}${e.email||''}`.toLowerCase().includes(buscar.toLowerCase()));
  const planColor={enterprise:'var(--purple)',pro:'var(--accent)',starter:'var(--green)'};

  return (
    <div className="fade-in">
      {/* Horario para clientes */}
      <div style={{marginBottom:16}}><HorarioWidget /></div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Buscar empresa..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{width:220}} />
          <span style={{color:'var(--muted)',fontSize:12}}>{filtradas.length} empresa{filtradas.length!==1?'s':''}</span>
        </div>
        {esSupervisor()&&<button className="btn btn-primary" onClick={abrirNuevo}>+ Nueva empresa</button>}
      </div>

      {loading?<div className="loading"><div className="spinner"/></div>:(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table>
            <thead><tr><th>Empresa</th><th>RUC</th><th>Email / Tel</th><th>Plan</th><th>Tickets abiertos</th><th>Total</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
            <tbody>
              {filtradas.length===0
                ?<tr><td colSpan={8}><div className="empty-state"><div className="icon">🏢</div><p>No hay empresas registradas</p></div></td></tr>
                :filtradas.map(e=>(
                <tr key={e.id}>
                  <td>
                    <div style={{fontWeight:600,cursor:'pointer',color:'var(--accent)'}} onClick={()=>abrirDetalle(e)}>{e.nombre}</div>
                    {e.ejecutivo_nombre&&<div style={{fontSize:11,color:'var(--muted)'}}>Ejecutivo: {e.ejecutivo_nombre}</div>}
                  </td>
                  <td style={{color:'var(--muted)',fontSize:12}}>{e.ruc||'—'}</td>
                  <td style={{fontSize:12}}>
                    {e.email&&<div>{e.email}</div>}
                    {e.telefono&&<div style={{color:'var(--muted)'}}>{e.telefono}</div>}
                    {!e.email&&!e.telefono&&'—'}
                  </td>
                  <td>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,textTransform:'capitalize',background:`${planColor[e.plan]||'var(--muted)'}22`,color:planColor[e.plan]||'var(--muted)'}}>
                      {e.plan}
                    </span>
                  </td>
                  <td style={{color:parseInt(e.tickets_abiertos)>0?'var(--amber)':'var(--muted)',fontWeight:parseInt(e.tickets_abiertos)>0?700:'normal'}}>{e.tickets_abiertos||0}</td>
                  <td>{e.total_tickets||0}</td>
                  <td><span style={{fontSize:11,color:e.activo?'var(--green)':'var(--red)',fontWeight:600}}>{e.activo?'✓ Activa':'✕ Inactiva'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>abrirDetalle(e)} title="Ver detalle">👁</button>
                      {esSupervisor()&&<button className="btn btn-ghost btn-sm" onClick={()=>abrirEditar(e)} title="Editar">✏</button>}
                      {esSupervisor()&&<button className="btn btn-ghost btn-sm" onClick={()=>eliminar(e)} title="Eliminar" style={{color:'var(--red)'}}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal&&(
        <Modal title={editando?`Editar: ${editando.nombre}`:'Nueva empresa'} onClose={()=>setModal(false)}>
          <form onSubmit={guardar}>
            <div className="form-group"><label className="form-label">Nombre *</label><input value={form.nombre} onChange={e=>sf('nombre',e.target.value)} required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">RUC</label><input value={form.ruc} onChange={e=>sf('ruc',e.target.value)} placeholder="20XXXXXXXXX" /></div>
              <div className="form-group"><label className="form-label">Plan</label>
                <select value={form.plan} onChange={e=>sf('plan',e.target.value)}>
                  <option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.email} onChange={e=>sf('email',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input value={form.telefono} onChange={e=>sf('telefono',e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label><input value={form.direccion} onChange={e=>sf('direccion',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Ejecutivo a cargo</label>
              <select value={form.ejecutivo_id} onChange={e=>sf('ejecutivo_id',e.target.value)}>
                <option value="">Sin ejecutivo</option>
                {agentes.map(a=><option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
              </select>
            </div>
            {errForm&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar':'Crear empresa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {detalle&&(
        <Modal title={`📋 ${detalle.nombre}`} onClose={()=>setDetalle(null)} width={640}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[['RUC',detalle.ruc||'—'],['Email',detalle.email||'—'],['Teléfono',detalle.telefono||'—'],['Plan',detalle.plan],['Dirección',detalle.direccion||'—'],['Ejecutivo',detalle.ejecutivo_nombre||'—']].map(([k,v])=>(
              <div key={k}><div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>{k}</div><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          {detalle.contactos?.length>0&&(<div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Contactos ({detalle.contactos.length})</div>
            {detalle.contactos.map(c=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                <span>{c.nombre} {c.apellido}</span><span style={{color:'var(--muted)'}}>{c.email}</span>
              </div>
            ))}
          </div>)}
          {detalle.tickets_recientes?.length>0&&(<div>
            <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>Tickets recientes</div>
            {detalle.tickets_recientes.map(t=>(
              <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                <div><span style={{fontSize:11,color:'var(--muted)',marginRight:8}}>{t.codigo}</span><span style={{fontSize:13}}>{t.asunto}</span></div>
                <span className={`badge badge-${t.estado}`} style={{fontSize:10}}>{t.estado}</span>
              </div>
            ))}
          </div>)}
          <div style={{marginTop:14,display:'flex',gap:8,justifyContent:'flex-end'}}>
            {esSupervisor()&&<button className="btn btn-ghost" onClick={()=>{setDetalle(null);abrirEditar(detalle);}}>✏ Editar</button>}
            <button className="btn btn-ghost" onClick={()=>setDetalle(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SLA PAGE
// ─────────────────────────────────────────
export function SLAPage() {
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => { setLoading(true); api.get('/sla').then(r=>{setSlas(r.data);setLoading(false);}).catch(()=>setLoading(false)); };
  useEffect(()=>cargar(),[]);

  const guardar = async s => {
    setGuardando(s.id);
    try{await api.put(`/sla/${s.id}`,s);toast('SLA actualizado ✓');setEditando(null);cargar();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setGuardando(false);}
  };

  const horas = m => { if(!m||m<=0)return '—';if(m<60)return `${m}min`;const h=Math.floor(m/60),r=m%60;return r?`${h}h ${r}m`:`${h}h`; };
  const prio2color = {critica:'var(--red)',alta:'var(--amber)',media:'#4FC3F7',baja:'var(--muted)'};

  if(loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div className="fade-in">
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Políticas de SLA</h2>
        <p style={{color:'var(--muted)',fontSize:13}}>Define los tiempos de atención garantizados por nivel de prioridad.</p>
      </div>
      <div style={{display:'grid',gap:12}}>
        {slas.map(s=>{
          const isEdit=editando?.id===s.id;
          const cur=isEdit?editando:s;
          return (
            <div key={s.id} className="card" style={{borderLeft:`4px solid ${prio2color[s.prioridad]}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:isEdit?16:0,flexWrap:'wrap'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:prio2color[s.prioridad],flexShrink:0}}/>
                <div style={{fontWeight:700,textTransform:'capitalize',minWidth:72,color:prio2color[s.prioridad]}}>{s.prioridad}</div>
                {!isEdit&&(<>
                  <div style={{flex:1,display:'flex',gap:20,flexWrap:'wrap'}}>
                    {[['1ª Respuesta',horas(s.tiempo_primera_respuesta_min)],['Resolución',horas(s.tiempo_resolucion_min)],['Horario',s.horario.replace(/_/g,' ')],['Alerta',`${s.notificar_en_pct}%`]].map(([l,v])=>(
                      <div key={l}><span style={{color:'var(--muted)',fontSize:11}}>{l}: </span><strong style={{fontSize:13}}>{v}</strong></div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setEditando({...s})}>✏ Editar</button>
                </>)}
              </div>
              {isEdit&&(
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">1ª Respuesta (minutos)</label>
                      <input type="number" min={1} value={editando.tiempo_primera_respuesta_min} onChange={e=>setEditando(f=>({...f,tiempo_primera_respuesta_min:parseInt(e.target.value)||1}))} />
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>= {horas(editando.tiempo_primera_respuesta_min||0)}</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tiempo resolución (minutos)</label>
                      <input type="number" min={1} value={editando.tiempo_resolucion_min} onChange={e=>setEditando(f=>({...f,tiempo_resolucion_min:parseInt(e.target.value)||1}))} />
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>= {horas(editando.tiempo_resolucion_min||0)}</div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tipo de horario</label>
                      <select value={editando.horario} onChange={e=>setEditando(f=>({...f,horario:e.target.value}))}>
                        <option value="24_7">24/7 (todos los días)</option>
                        <option value="horario_laboral">Horario laboral (L-V)</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alertar al consumir (%)</label>
                      <input type="number" min={50} max={99} value={editando.notificar_en_pct} onChange={e=>setEditando(f=>({...f,notificar_en_pct:parseInt(e.target.value)||80}))} />
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-primary btn-sm" disabled={guardando===s.id} onClick={()=>guardar(editando)}>
                      {guardando===s.id?'Guardando...':'✓ Guardar'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setEditando(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REPORTES PAGE
// ─────────────────────────────────────────
export function ReportesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({desde:'',hasta:''});

  const cargar = async () => {
    setLoading(true);
    try{
      const q=new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([,v])=>v)));
      const [r1,r2]=await Promise.all([api.get(`/reportes/general?${q}`),api.get('/reportes/sla')]);
      setData({...r1.data,slaDetalle:r2.data});
    }catch{toast('Error al cargar reportes','error');}
    finally{setLoading(false);}
  };
  useEffect(()=>{cargar();},[]);
  const sf=(k,v)=>setFiltros(f=>({...f,[k]:v}));

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:8,marginBottom:20,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div className="form-group" style={{margin:0}}><label className="form-label">Desde</label><input type="date" value={filtros.desde} onChange={e=>sf('desde',e.target.value)} style={{width:160}} /></div>
        <div className="form-group" style={{margin:0}}><label className="form-label">Hasta</label><input type="date" value={filtros.hasta} onChange={e=>sf('hasta',e.target.value)} style={{width:160}} /></div>
        <button className="btn btn-primary" onClick={cargar}>Aplicar</button>
        <button className="btn btn-ghost" onClick={()=>{setFiltros({desde:'',hasta:''});setTimeout(cargar,50);}}>Limpiar</button>
      </div>
      {loading?<div className="loading"><div className="spinner"/></div>:!data?null:(()=>{
        const {totales,por_categoria,csat,por_agente,sla,frt,ttr,slaDetalle}=data;
        return (<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20}}>
            {[{l:'Total',v:totales?.total??0,c:'var(--accent)'},{l:'Nuevos',v:totales?.nuevos??0,c:'#4FC3F7'},{l:'Resueltos',v:totales?.resueltos??0,c:'var(--green)'},{l:'Abiertos',v:totales?.abiertos??0,c:'var(--amber)'},{l:'Vencidos SLA',v:totales?.vencidos??0,c:'var(--red)'}].map(({l,v,c})=>(
              <div key={l} className="card" style={{textAlign:'center',padding:14}}>
                <div style={{fontSize:26,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>FRT Promedio</div>
              <div style={{fontSize:22,fontWeight:700,color:'var(--accent)'}}>{frt?.frt_promedio_min?`${frt.frt_promedio_min}min`:'—'}</div>
            </div>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>Resolución Prom.</div>
              <div style={{fontSize:22,fontWeight:700,color:'var(--amber)'}}>{ttr?.ttr_promedio_min?`${Math.round(ttr.ttr_promedio_min/60)}h`:'—'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>SLA: <strong style={{color:sla?.pct_cumplimiento>=80?'var(--green)':'var(--red)'}}>{sla?.pct_cumplimiento??0}%</strong></div>
            </div>
            <div className="card" style={{textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>CSAT</div>
              <div style={{fontSize:22,fontWeight:700,color:'var(--amber)'}}>{csat?.promedio?`${csat.promedio} ★`:'—'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{csat?.total??0} encuestas</div>
            </div>
          </div>
          <div className="card" style={{marginBottom:16,padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',fontWeight:600,borderBottom:'1px solid var(--border)'}}>Cumplimiento SLA por prioridad</div>
            <table><thead><tr><th>Prioridad</th><th>1ª Respuesta</th><th>Resolución</th><th>Tickets</th><th>Cumplidos</th><th>%</th></tr></thead>
              <tbody>{slaDetalle?.map(s=>(
                <tr key={s.prioridad}>
                  <td><span className={`prio prio-${s.prioridad}`}><span className="prio-dot"/>{s.prioridad}</span></td>
                  <td style={{color:'var(--muted)'}}>{s.tiempo_primera_respuesta_min}min</td>
                  <td style={{color:'var(--muted)'}}>{Math.round(s.tiempo_resolucion_min/60)}h</td>
                  <td>{s.total_tickets}</td>
                  <td style={{color:'var(--green)'}}>{s.resolucion_ok}</td>
                  <td><span style={{fontWeight:700,color:s.pct_cumplimiento>=80?'var(--green)':'var(--red)'}}>{s.pct_cumplimiento??0}%</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div className="card">
              <div style={{fontWeight:600,marginBottom:12}}>Top categorías</div>
              {por_categoria?.map(c=>(
                <div key={c.categoria} style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
                  <span>{c.categoria||'Sin categoría'}</span>
                  <span style={{fontWeight:600,color:'var(--accent)'}}>{c.cantidad}</span>
                </div>
              ))}
              {!por_categoria?.length&&<div style={{color:'var(--muted)',fontSize:13}}>Sin datos</div>}
            </div>
            <div className="card">
              <div style={{fontWeight:600,marginBottom:12}}>Satisfacción (CSAT)</div>
              {csat?.promedio?(
                <>
                  <div style={{textAlign:'center',fontSize:32,fontWeight:700,color:'var(--amber)',marginBottom:12}}>{csat.promedio} ★</div>
                  {[{l:'5★',v:csat.cinco,c:'var(--green)'},{l:'4★',v:csat.cuatro,c:'var(--green)'},{l:'3★',v:csat.tres,c:'var(--amber)'},{l:'≤2★',v:csat.bajo,c:'var(--red)'}].map(({l,v,c})=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                      <span style={{color:'var(--muted)'}}>{l}</span><span style={{fontWeight:700,color:c}}>{v??0}</span>
                    </div>
                  ))}
                </>
              ):<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:20}}>Sin encuestas respondidas</div>}
            </div>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',fontWeight:600,borderBottom:'1px solid var(--border)'}}>Rendimiento por agente</div>
            <table><thead><tr><th>Agente</th><th>Total</th><th>Resueltos</th><th>FRT prom.</th><th>CSAT</th><th>SLA ✓</th></tr></thead>
              <tbody>{por_agente?.length===0
                ?<tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:20}}>Sin datos</td></tr>
                :por_agente?.map(a=>(
                <tr key={a.agente_id}>
                  <td style={{fontWeight:500}}>{a.agente}</td>
                  <td>{a.total_tickets}</td>
                  <td style={{color:'var(--green)',fontWeight:600}}>{a.resueltos}</td>
                  <td style={{color:'var(--muted)'}}>{a.frt_promedio?`${Math.round(a.frt_promedio)}min`:'—'}</td>
                  <td style={{color:'var(--amber)'}}>{a.csat?`${a.csat} ★`:'—'}</td>
                  <td style={{color:'var(--green)'}}>{a.sla_cumplidos}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>);
      })()}
    </div>
  );
}

// ─────────────────────────────────────────
// KB PAGE — con adjuntos de documentos
// ─────────────────────────────────────────
export function KBPage() {
  const { esAgente } = useAuthStore();
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('publicado');
  const [categorias, setCategorias] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [viendoArt, setViendoArt] = useState(null);
  const [form, setForm] = useState({titulo:'',contenido:'',resumen:'',categoria_id:'',estado:'borrador',tags:''});
  const [archivosKB, setArchivosKB] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const fileRef = useRef();

  const cargar = () => {
    setLoading(true);
    const q=new URLSearchParams({estado});
    if(buscar) q.set('buscar',buscar);
    api.get(`/kb?${q}`).then(r=>{setArticulos(r.data);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{cargar();},[estado]);
  useEffect(()=>{api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});},[]);

  const abrirNuevo = () => { setEditando(null);setForm({titulo:'',contenido:'',resumen:'',categoria_id:'',estado:'borrador',tags:''});setArchivosKB([]);setErrForm('');setModal(true); };
  const abrirEditar = a => { setEditando(a);setForm({titulo:a.titulo,contenido:a.contenido,resumen:a.resumen||'',categoria_id:a.categoria_id||'',estado:a.estado,tags:(a.tags||[]).join(', ')});setArchivosKB([]);setErrForm('');setModal(true); };
  const verArt = async a => { try{const r=await api.get(`/kb/${a.id}`);setViendoArt(r.data);}catch{setViendoArt(a);} };

  const guardar = async e => {
    e.preventDefault();
    if(!form.titulo.trim()||!form.contenido.trim()){setErrForm('Título y contenido son requeridos');return;}
    setGuardando(true);setErrForm('');
    try{
      const payload={...form,tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]};
      let artId;
      if(editando){await api.put(`/kb/${editando.id}`,payload);artId=editando.id;toast('Artículo actualizado');}
      else{const r=await api.post('/kb',payload);artId=r.data.id;toast('Artículo creado ✓');}
      // Subir adjuntos si hay
      if(archivosKB.length>0){
        const fd=new FormData();
        archivosKB.forEach(f=>fd.append('archivos',f));
        await api.post(`/kb/${artId}/adjuntos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      }
      setModal(false);cargar();
    }catch(err){setErrForm(err.response?.data?.error||'Error al guardar');}
    finally{setGuardando(false);}
  };

  const archivar = async a => {
    if(!window.confirm(`¿Archivar "${a.titulo}"?`)) return;
    try{await api.delete(`/kb/${a.id}`);toast('Artículo archivado','warn');cargar();}
    catch{toast('Error','error');}
  };

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <input placeholder="Buscar artículos..." value={buscar} onChange={e=>setBuscar(e.target.value)} onKeyDown={e=>e.key==='Enter'&&cargar()} style={{flex:1,maxWidth:280}} />
        <button className="btn btn-ghost" onClick={cargar}>Buscar</button>
        {esAgente()&&(
          <select value={estado} onChange={e=>setEstado(e.target.value)} style={{width:140}}>
            <option value="publicado">Publicados</option>
            <option value="borrador">Borradores</option>
            <option value="archivado">Archivados</option>
          </select>
        )}
        <div style={{flex:1}}/>
        {esAgente()&&<button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo artículo</button>}
      </div>

      {loading?<div className="loading"><div className="spinner"/></div>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {articulos.length===0
            ?<div className="empty-state"><div className="icon">📚</div><p>No hay artículos {estado}</p></div>
            :articulos.map(a=>(
            <div key={a.id} className="card" style={{cursor:'pointer',transition:'border-color .15s,transform .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.4,flex:1,marginRight:6}} onClick={()=>verArt(a)}>{a.titulo}</div>
                <span style={{fontSize:10,padding:'2px 6px',borderRadius:3,flexShrink:0,fontWeight:600,
                  background:a.estado==='publicado'?'rgba(34,201,122,.15)':a.estado==='borrador'?'rgba(79,127,255,.15)':'rgba(122,133,163,.15)',
                  color:a.estado==='publicado'?'var(--green)':a.estado==='borrador'?'var(--accent)':'var(--muted)'
                }}>{a.estado}</span>
              </div>
              {a.resumen&&<div style={{fontSize:12,color:'var(--muted)',marginBottom:8,lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{a.resumen}</div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--muted)',marginBottom:esAgente()?8:0}}>
                <span>📁 {a.categoria_nombre||'General'}</span>
                <span>👁 {a.vistas} · 👍 {a.util_si}</span>
              </div>
              {/* Adjuntos del artículo */}
              {a.metadatos?.adjuntos?.length>0&&(
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>
                  📎 {a.metadatos.adjuntos.length} documento{a.metadatos.adjuntos.length!==1?'s':''}
                </div>
              )}
              {esAgente()&&(
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>abrirEditar(a)}>✏ Editar</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>archivar(a)} style={{color:'var(--red)'}}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar — con adjuntos */}
      {modal&&(
        <Modal title={editando?'Editar artículo':'Nuevo artículo de Base de Conocimiento'} onClose={()=>setModal(false)} width={700}>
          <form onSubmit={guardar}>
            <div className="form-group"><label className="form-label">Título *</label><input value={form.titulo} onChange={e=>sf('titulo',e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Resumen (se muestra en el listado)</label><textarea value={form.resumen} onChange={e=>sf('resumen',e.target.value)} style={{minHeight:60}} /></div>
            <div className="form-group"><label className="form-label">Contenido completo *</label><textarea value={form.contenido} onChange={e=>sf('contenido',e.target.value)} style={{minHeight:200}} required /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select value={form.categoria_id} onChange={e=>sf('categoria_id',e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c=><option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select value={form.estado} onChange={e=>sf('estado',e.target.value)}>
                  <option value="borrador">Borrador</option>
                  <option value="publicado">Publicado</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Etiquetas (separadas por coma)</label><input value={form.tags} onChange={e=>sf('tags',e.target.value)} placeholder="ej: factura, acceso, error 404" /></div>

            {/* Adjuntos de documentos */}
            <div className="form-group">
              <label className="form-label">📎 Adjuntar documentos de soporte</label>
              <input ref={fileRef} type="file" multiple style={{display:'none'}}
                onChange={e=>setArchivosKB(Array.from(e.target.files))}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt,.zip,.jpg,.jpeg,.png" />
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>fileRef.current.click()}>📎 Seleccionar archivos</button>
                {archivosKB.map((f,i)=>(
                  <span key={i} style={{fontSize:11,background:'rgba(79,127,255,.1)',color:'var(--accent)',padding:'3px 8px',borderRadius:4,display:'flex',alignItems:'center',gap:4}}>
                    {f.name} <span style={{cursor:'pointer'}} onClick={()=>setArchivosKB(a=>a.filter((_,j)=>j!==i))}>×</span>
                  </span>
                ))}
              </div>
              {editando?.metadatos?.adjuntos?.length>0&&(
                <div style={{marginTop:6,fontSize:11,color:'var(--muted)'}}>
                  Adjuntos existentes: {editando.metadatos.adjuntos.map(a=>(
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{color:'var(--accent)',marginRight:8}}>{a.nombre}</a>
                  ))}
                </div>
              )}
            </div>

            {errForm&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar artículo':'Publicar artículo'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal ver artículo */}
      {viendoArt&&(
        <Modal title={viendoArt.titulo} onClose={()=>setViendoArt(null)} width={720}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:14,display:'flex',gap:12,flexWrap:'wrap'}}>
            <span>📁 {viendoArt.categoria_nombre||'General'}</span>
            <span>✍ {viendoArt.autor_nombre}</span>
            <span>👁 {viendoArt.vistas} vistas</span>
            <span>👍 {viendoArt.util_si} útil</span>
          </div>
          <div style={{fontSize:14,lineHeight:1.9,color:'var(--text)',whiteSpace:'pre-wrap',padding:'12px 0'}}>{viendoArt.contenido}</div>
          {viendoArt.metadatos?.adjuntos?.length>0&&(
            <div style={{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>📎 Documentos adjuntos</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {viendoArt.metadatos.adjuntos.map(a=>(
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    📄 {a.nombre}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div style={{marginTop:16,display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost" onClick={()=>{api.post(`/kb/${viendoArt.id}/util`,{util:true});toast('¡Marcado como útil 👍');}}>👍 Útil</button>
            {esAgente()&&<button className="btn btn-ghost" onClick={()=>{setViendoArt(null);abrirEditar(viendoArt);}}>✏ Editar</button>}
            <button className="btn btn-ghost" onClick={()=>setViendoArt(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// CONFIG PAGE — con horario de atención
// ─────────────────────────────────────────
export function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({nombre:'',email_soporte:''});
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [catModal, setCatModal] = useState(false);
  const [catEditando, setCatEditando] = useState(null);
  const [catForm, setCatForm] = useState({nombre:'',descripcion:'',icono:'🔧',color:'#4F7FFF',area_responsable:''});
  const [catErr, setCatErr] = useState('');
  const [catGuardando, setCatGuardando] = useState(false);
  const [passForm, setPassForm] = useState({password_actual:'',password_nuevo:'',confirmar:''});
  const [passErr, setPassErr] = useState('');
  const [passOk, setPassOk] = useState('');

  // Horario
  const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const DIA_LABELS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const defaultHorario = {
    lunes:{activo:true,desde:'08:00',hasta:'18:00'},martes:{activo:true,desde:'08:00',hasta:'18:00'},
    miercoles:{activo:true,desde:'08:00',hasta:'18:00'},jueves:{activo:true,desde:'08:00',hasta:'18:00'},
    viernes:{activo:true,desde:'08:00',hasta:'18:00'},sabado:{activo:false,desde:'09:00',hasta:'13:00'},
    domingo:{activo:false,desde:'',hasta:''},
    zona_horaria:'America/Lima',mensaje_fuera_horario:'Estamos fuera de horario. Te responderemos el próximo día hábil.',telefono_urgencias:''
  };
  const [horario, setHorario] = useState(defaultHorario);
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  const cargar = () => {
    api.get('/config').then(r=>{
      setConfig(r.data);
      setForm({nombre:r.data.nombre,email_soporte:r.data.email_soporte||''});
      if(r.data.configuracion?.horario_atencion) setHorario({...defaultHorario,...r.data.configuracion.horario_atencion});
      setLoading(false);
    }).catch(()=>setLoading(false));
    api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});
  };
  useEffect(()=>cargar(),[]);

  const guardarConfig = async e => {
    e.preventDefault();setGuardando(true);
    try{await api.put('/config',form);toast('Configuración guardada ✓');}
    catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setGuardando(false);}
  };

  const guardarHorario = async () => {
    setGuardandoHorario(true);
    try{
      const conf=config?.configuracion||{};
      await api.put('/config',{configuracion:{...conf,horario_atencion:horario}});
      toast('Horario de atención guardado ✓');
    }catch{toast('Error al guardar horario','error');}
    finally{setGuardandoHorario(false);}
  };

  const cambiarPassword = async e => {
    e.preventDefault();setPassErr('');setPassOk('');
    if(passForm.password_nuevo!==passForm.confirmar){setPassErr('Las contraseñas no coinciden');return;}
    if(passForm.password_nuevo.length<8){setPassErr('Mínimo 8 caracteres');return;}
    try{
      await api.patch('/auth/cambiar-password',{password_actual:passForm.password_actual,password_nuevo:passForm.password_nuevo});
      setPassOk('✓ Contraseña actualizada');setPassForm({password_actual:'',password_nuevo:'',confirmar:''});
    }catch(err){setPassErr(err.response?.data?.error||'Error');}
  };

  const guardarCat = async e => {
    e.preventDefault();
    if(!catForm.nombre.trim()){setCatErr('Nombre requerido');return;}
    setCatGuardando(true);setCatErr('');
    try{
      if(catEditando){await api.put(`/categorias/${catEditando.id}`,catForm);toast('Categoría actualizada');}
      else{await api.post('/categorias',catForm);toast('Categoría creada ✓');}
      setCatModal(false);cargar();
    }catch(err){setCatErr(err.response?.data?.error||'Error');}
    finally{setCatGuardando(false);}
  };

  const eliminarCat = async c => {
    if(!window.confirm(`¿Desactivar "${c.nombre}"?`)) return;
    try{await api.delete(`/categorias/${c.id}`);toast('Categoría desactivada','warn');cargar();}
    catch{toast('Error','error');}
  };

  const setDia=(dia,k,v)=>setHorario(h=>({...h,[dia]:{...h[dia],[k]:v}}));
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  if(loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div className="fade-in" style={{maxWidth:760}}>
      <h2 style={{fontSize:18,fontWeight:800,marginBottom:20}}>⚙ Configuración del sistema</h2>

      {/* Info empresa */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:700,marginBottom:14,fontSize:14}}>🏢 Información de la empresa</div>
        <form onSubmit={guardarConfig}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre</label><input value={form.nombre} onChange={e=>sf('nombre',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email de soporte</label><input type="email" value={form.email_soporte} onChange={e=>sf('email_soporte',e.target.value)} /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':'✓ Guardar'}</button>
        </form>
      </div>

      {/* HORARIO DE ATENCIÓN */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:700,marginBottom:14,fontSize:14}}>🕐 Horario de atención</div>
        <p style={{color:'var(--muted)',fontSize:13,marginBottom:16}}>Configura los días y horarios de atención. Los clientes verán esta información al crear tickets.</p>
        <div style={{display:'grid',gap:8,marginBottom:14}}>
          {DIAS.map((d,i)=>(
            <div key={d} style={{display:'grid',gridTemplateColumns:'100px 80px 1fr',gap:10,alignItems:'center',padding:'8px 10px',background:'var(--surface)',borderRadius:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" checked={horario[d]?.activo||false} onChange={e=>setDia(d,'activo',e.target.checked)} style={{width:'auto',accent:'var(--accent)'}} />
                <span style={{fontSize:13,fontWeight:500,color:horario[d]?.activo?'var(--text)':'var(--muted)'}}>{DIA_LABELS[i]}</span>
              </div>
              {horario[d]?.activo
                ?<div style={{display:'flex',gap:6,alignItems:'center',gridColumn:'3'}}>
                  <input type="time" value={horario[d].desde||''} onChange={e=>setDia(d,'desde',e.target.value)} style={{width:90,fontSize:12}} />
                  <span style={{color:'var(--muted)',fontSize:13}}>–</span>
                  <input type="time" value={horario[d].hasta||''} onChange={e=>setDia(d,'hasta',e.target.value)} style={{width:90,fontSize:12}} />
                </div>
                :<div style={{gridColumn:'3',fontSize:12,color:'var(--muted)',fontStyle:'italic'}}>Cerrado</div>
              }
            </div>
          ))}
        </div>
        <div className="form-row" style={{marginBottom:12}}>
          <div className="form-group">
            <label className="form-label">Zona horaria</label>
            <select value={horario.zona_horaria} onChange={e=>setHorario(h=>({...h,zona_horaria:e.target.value}))}>
              <option value="America/Lima">🇵🇪 America/Lima (GMT-5)</option>
              <option value="America/Bogota">🇨🇴 America/Bogota (GMT-5)</option>
              <option value="America/Santiago">🇨🇱 America/Santiago</option>
              <option value="America/Buenos_Aires">🇦🇷 America/Buenos_Aires (GMT-3)</option>
              <option value="America/Mexico_City">🇲🇽 America/Mexico_City (GMT-6)</option>
              <option value="America/New_York">🇺🇸 America/New_York (GMT-5)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono urgencias (fuera de horario)</label>
            <input value={horario.telefono_urgencias||''} onChange={e=>setHorario(h=>({...h,telefono_urgencias:e.target.value}))} placeholder="+51 999 999 999" />
          </div>
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="form-label">Mensaje fuera de horario</label>
          <textarea value={horario.mensaje_fuera_horario||''} onChange={e=>setHorario(h=>({...h,mensaje_fuera_horario:e.target.value}))} style={{minHeight:60}} />
        </div>
        <button className="btn btn-primary" onClick={guardarHorario} disabled={guardandoHorario}>
          {guardandoHorario?'Guardando...':'✓ Guardar horario'}
        </button>
      </div>

      {/* Categorías */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14}}>📁 Categorías de soporte ({categorias.length})</div>
          <button className="btn btn-primary btn-sm" onClick={()=>{setCatEditando(null);setCatForm({nombre:'',descripcion:'',icono:'🔧',color:'#4F7FFF',area_responsable:''});setCatErr('');setCatModal(true);}}>+ Nueva categoría</button>
        </div>
        <div style={{display:'grid',gap:6}}>
          {categorias.map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}}>
              <span style={{fontSize:20,width:28,textAlign:'center'}}>{c.icono||'📁'}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{c.nombre}</div>
                {c.area_responsable&&<div style={{fontSize:11,color:'var(--muted)'}}>{c.area_responsable}</div>}
                {c.descripcion&&<div style={{fontSize:11,color:'var(--muted)'}}>{c.descripcion}</div>}
              </div>
              <div style={{width:10,height:10,borderRadius:'50%',background:c.color||'var(--accent)',flexShrink:0}}/>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setCatEditando(c);setCatForm({nombre:c.nombre,descripcion:c.descripcion||'',icono:c.icono||'',color:c.color||'#4F7FFF',area_responsable:c.area_responsable||''});setCatErr('');setCatModal(true);}}>✏</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>eliminarCat(c)} style={{color:'var(--red)'}}>✕</button>
            </div>
          ))}
          {categorias.length===0&&<div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:16}}>No hay categorías — crea la primera</div>}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="card">
        <div style={{fontWeight:700,marginBottom:14,fontSize:14}}>🔐 Cambiar mi contraseña</div>
        <form onSubmit={cambiarPassword} style={{maxWidth:420}}>
          <div className="form-group"><label className="form-label">Contraseña actual</label><input type="password" value={passForm.password_actual} onChange={e=>setPassForm(f=>({...f,password_actual:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Nueva contraseña</label><input type="password" value={passForm.password_nuevo} onChange={e=>setPassForm(f=>({...f,password_nuevo:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Confirmar nueva</label><input type="password" value={passForm.confirmar} onChange={e=>setPassForm(f=>({...f,confirmar:e.target.value}))} required /></div>
          {passErr&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{passErr}</div>}
          {passOk&&<div style={{color:'var(--green)',fontSize:13,marginBottom:10,background:'rgba(34,201,122,.08)',padding:'8px 10px',borderRadius:6}}>{passOk}</div>}
          <button className="btn btn-primary" type="submit">Cambiar contraseña</button>
        </form>
      </div>

      {/* Panel WhatsApp */}
      <WhatsAppPanel />

      {/* Modal categoría */}
      {catModal&&(
        <Modal title={catEditando?'Editar categoría':'Nueva categoría'} onClose={()=>setCatModal(false)}>
          <form onSubmit={guardarCat}>
            <div className="form-group"><label className="form-label">Nombre *</label><input value={catForm.nombre} onChange={e=>setCatForm(f=>({...f,nombre:e.target.value}))} required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Ícono (emoji)</label><input value={catForm.icono} onChange={e=>setCatForm(f=>({...f,icono:e.target.value}))} placeholder="🔧" style={{fontSize:20}} /></div>
              <div className="form-group"><label className="form-label">Color</label><input type="color" value={catForm.color} onChange={e=>setCatForm(f=>({...f,color:e.target.value}))} style={{height:40,padding:4}} /></div>
            </div>
            <div className="form-group"><label className="form-label">Área responsable</label><input value={catForm.area_responsable} onChange={e=>setCatForm(f=>({...f,area_responsable:e.target.value}))} placeholder="Ej: Soporte Técnico" /></div>
            <div className="form-group"><label className="form-label">Descripción</label><textarea value={catForm.descripcion} onChange={e=>setCatForm(f=>({...f,descripcion:e.target.value}))} style={{minHeight:60}} /></div>
            {catErr&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10}}>{catErr}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setCatModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={catGuardando}>{catGuardando?'Guardando...':catEditando?'Actualizar':'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// WHATSAPP PANEL (componente interno de Config)
// ─────────────────────────────────────────
function WhatsAppPanel() {
  const [waData, setWaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState(false);
  const intervaloRef = useRef(null);

  const cargar = async () => {
    try {
      const r = await api.get('/whatsapp/qr');
      setWaData(r.data);
      // Si está listo, dejar de polling
      if (r.data.listo && intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    } catch { setWaData({estado:'error',listo:false,qr:null}); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    cargar();
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, []);

  const iniciarPolling = () => {
    if (intervaloRef.current) return;
    intervaloRef.current = setInterval(cargar, 5000);
  };

  const abrirQr = () => { setQrModal(true); iniciarPolling(); cargar(); };

  const estadoColor = { listo:'var(--green)', conectando:'var(--amber)', qr_pendiente:'var(--amber)', desconectado:'var(--muted)', error:'var(--red)' };
  const estadoLabel = { listo:'✅ Conectado y activo', conectando:'⏳ Conectando...', qr_pendiente:'📱 Escanear QR', desconectado:'⭕ Desconectado', error:'❌ Error de conexión' };

  return (
    <>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14}}>💬 WhatsApp Web</div>
          {!loading&&waData&&(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:estadoColor[waData.estado]||'var(--muted)',boxShadow:`0 0 6px ${estadoColor[waData.estado]||'var(--muted)'}`}}/>
              <span style={{fontSize:12,color:estadoColor[waData.estado]||'var(--muted)',fontWeight:600}}>
                {estadoLabel[waData.estado]||waData.estado}
              </span>
            </div>
          )}
        </div>

        <p style={{color:'var(--muted)',fontSize:13,lineHeight:1.7,marginBottom:12}}>
          Conecta un número de WhatsApp para enviar notificaciones automáticas a clientes cuando se asigna un técnico o cambia el estado del ticket.
        </p>

        {/* Qué notificaciones envía */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {[
            {e:'📋',t:'Ticket creado',d:'Al cliente + admins'},
            {e:'👤',t:'Técnico asignado',d:'Al cliente y empresa'},
            {e:'🔔',t:'Cambio de estado',d:'Al cliente en cada cambio'},
            {e:'💬',t:'Nueva respuesta',d:'Al cliente cuando el técnico responde'},
            {e:'✅',t:'Ticket resuelto',d:'Con link a encuesta de satisfacción'},
            {e:'🔒',t:'Ticket cerrado',d:'Notificación final al cliente'},
          ].map(({e,t,d})=>(
            <div key={t} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'8px 10px',background:'var(--surface)',borderRadius:7,border:'1px solid var(--border)'}}>
              <span style={{fontSize:16,flexShrink:0}}>{e}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado y acciones */}
        {loading ? (
          <div style={{display:'flex',gap:8,alignItems:'center',color:'var(--muted)',fontSize:13}}><div className="spinner" style={{width:16,height:16}}/> Verificando estado...</div>
        ) : waData?.listo ? (
          <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'rgba(34,201,122,.1)',borderRadius:8,border:'1px solid rgba(34,201,122,.2)'}}>
            <span style={{fontSize:20}}>✅</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--green)'}}>WhatsApp conectado</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Las notificaciones se envían automáticamente</div>
            </div>
          </div>
        ) : waData?.estado==='qr_pendiente'||waData?.qr ? (
          <div>
            <div style={{padding:'10px 14px',background:'rgba(245,166,35,.1)',borderRadius:8,border:'1px solid rgba(245,166,35,.2)',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--amber)',marginBottom:4}}>📱 Escanear código QR</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo</div>
            </div>
            <button className="btn btn-primary" onClick={abrirQr}>📱 Ver código QR para vincular</button>
          </div>
        ) : waData?.estado==='desconectado'||waData?.estado==='error' ? (
          <div>
            <div style={{padding:'10px 14px',background:'rgba(122,133,163,.08)',borderRadius:8,border:'1px solid var(--border)',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--muted)',marginBottom:4}}>WhatsApp no configurado</div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
                Para activar, en el servidor ejecuta:<br/>
                <code style={{background:'var(--surface)',padding:'2px 6px',borderRadius:3,fontSize:11,color:'var(--accent)'}}>npm install whatsapp-web.js qrcode-terminal</code><br/>
                Luego en <code style={{background:'var(--surface)',padding:'2px 6px',borderRadius:3,fontSize:11,color:'var(--accent)'}}>.env</code>: <code style={{background:'var(--surface)',padding:'2px 6px',borderRadius:3,fontSize:11,color:'var(--accent)'}}>WHATSAPP_ENABLED=true</code><br/>
                y reiniciar: <code style={{background:'var(--surface)',padding:'2px 6px',borderRadius:3,fontSize:11,color:'var(--accent)'}}>pm2 restart magus-helpdesk</code>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>{cargar();iniciarPolling();}}>🔄 Verificar estado</button>
          </div>
        ) : (
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-ghost btn-sm" onClick={abrirQr}>📱 Ver QR</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{cargar();iniciarPolling();}}>🔄 Actualizar</button>
          </div>
        )}
      </div>

      {/* Modal QR */}
      {qrModal && (
        <Modal title="📱 Vincular WhatsApp" onClose={()=>{setQrModal(false);if(intervaloRef.current){clearInterval(intervaloRef.current);intervaloRef.current=null;}}}>
          {waData?.listo ? (
            <div style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <div style={{fontWeight:700,fontSize:16,color:'var(--green)',marginBottom:8}}>¡WhatsApp conectado!</div>
              <div style={{color:'var(--muted)',fontSize:13}}>El número está vinculado y listo para enviar notificaciones.</div>
              <button className="btn btn-primary" style={{marginTop:16}} onClick={()=>setQrModal(false)}>Cerrar</button>
            </div>
          ) : waData?.qr ? (
            <div style={{textAlign:'center'}}>
              <p style={{color:'var(--muted)',fontSize:13,marginBottom:16,lineHeight:1.6}}>
                Abre WhatsApp en tu teléfono → <strong>⋮ Menú</strong> → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong> → Escanea este código:
              </p>
              {/* Renderizar QR usando una API de imagen */}
              <div style={{background:'#fff',padding:16,borderRadius:12,display:'inline-block',marginBottom:16}}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(waData.qr)}`}
                  alt="QR WhatsApp"
                  style={{width:250,height:250,display:'block'}}
                />
              </div>
              <div style={{color:'var(--amber)',fontSize:12,marginBottom:4}}>⏳ El QR expira en 60 segundos — se actualiza automáticamente</div>
              <div style={{color:'var(--muted)',fontSize:11}}>Actualizando cada 5 segundos...</div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:24}}>
              <div className="spinner" style={{margin:'0 auto 12px'}}/>
              <div style={{color:'var(--muted)',fontSize:13}}>Esperando código QR del servidor...</div>
              <div style={{color:'var(--muted)',fontSize:11,marginTop:6}}>Asegúrate de que WHATSAPP_ENABLED=true en el .env y el servidor esté corriendo</div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ─────────────────────────────────────────
// ENCUESTA PAGE
// ─────────────────────────────────────────
export function EncuestaPage() {
  const token = window.location.pathname.split('/').pop();
  const calParam = parseInt(new URLSearchParams(window.location.search).get('cal')||'0');
  const [rating, setRating] = useState(calParam||0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const labels=['Muy malo','Malo','Regular','Bueno','Excelente'];

  const enviar = async () => {
    if(!rating) return;
    setEnviando(true);setError('');
    try{await api.post('/tickets/encuesta',{token,calificacion:rating,comentario});setEnviado(true);}
    catch(err){setError(err.response?.data?.error||'Error al enviar');setEnviando(false);}
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:16}}>
      <div style={{fontSize:20,fontWeight:800,marginBottom:24,color:'var(--accent)'}}>● Magus Help Desk</div>
      <div className="card fade-in" style={{maxWidth:460,width:'100%',textAlign:'center',padding:36}}>
        {enviado?(
          <>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <h2 style={{marginBottom:8,fontSize:20}}>¡Gracias por tu calificación!</h2>
            <p style={{color:'var(--muted)',fontSize:14}}>Tu opinión es muy valiosa para mejorar nuestro servicio de soporte.</p>
          </>
        ):(
          <>
            <div style={{fontSize:32,marginBottom:8}}>⭐</div>
            <h2 style={{marginBottom:4,fontSize:18}}>¿Cómo fue la atención recibida?</h2>
            <p style={{color:'var(--muted)',fontSize:13,marginBottom:24}}>Tu ticket fue resuelto. Por favor califica la experiencia.</p>
            <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:8}}>
              {[1,2,3,4,5].map(n=>(
                <span key={n} onClick={()=>setRating(n)} onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
                  style={{fontSize:42,cursor:'pointer',transition:'color .1s,transform .1s',color:n<=(hover||rating)?'var(--amber)':'var(--border)',transform:n<=(hover||rating)?'scale(1.2)':'scale(1)'}}>★</span>
              ))}
            </div>
            {(hover||rating)>0&&<div style={{fontSize:14,color:'var(--amber)',fontWeight:700,marginBottom:16}}>{labels[(hover||rating)-1]}</div>}
            <textarea placeholder="Cuéntanos más (opcional)..." value={comentario} onChange={e=>setComentario(e.target.value)} style={{marginBottom:12,minHeight:80,fontSize:13,textAlign:'left'}} />
            {error&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10}}>{error}</div>}
            <button className="btn btn-primary" onClick={enviar} disabled={!rating||enviando} style={{width:'100%',justifyContent:'center',padding:13,fontSize:14}}>
              {enviando?'Enviando...':rating?`Enviar — ${labels[rating-1]}`:'Selecciona una calificación'}
            </button>
          </>
        )}
        <div style={{marginTop:20,fontSize:11,color:'var(--muted)'}}>Magus Help Desk · magus-ecommerce.com</div>
      </div>
      <div style={{marginTop:20,maxWidth:460,width:'100%'}}><HorarioWidget compact /></div>
    </div>
  );
}
