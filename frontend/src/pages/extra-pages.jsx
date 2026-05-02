import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../hooks/useAuthStore';

// ============================================================
// MODAL GENÉRICO
// ============================================================
function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:9999,padding:16
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,
        width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'auto',
        boxShadow:'0 8px 40px rgba(0,0,0,.5)'
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:15}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:20,lineHeight:1,cursor:'pointer',padding:2}}>×</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
let toastFn = null;
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  toastFn = (msg, type='success') => {
    const id = Date.now();
    setToasts(t => [...t, {id,msg,type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  return (
    <div style={{position:'fixed',top:16,right:16,zIndex:99999,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type==='error' ? 'var(--red)' : t.type==='warn' ? 'var(--amber)' : 'var(--green)',
          color:'#fff',padding:'10px 16px',borderRadius:8,fontSize:13,fontWeight:500,
          boxShadow:'0 4px 16px rgba(0,0,0,.3)',minWidth:220,maxWidth:360,
          animation:'fadeIn .2s ease'
        }}>{t.msg}</div>
      ))}
    </div>
  );
}
export const toast = (msg, type) => toastFn && toastFn(msg, type);

// ============================================================
// NUEVO TICKET
// ============================================================
export function NuevoTicketPage() {
  const navigate = useNavigate();
  const { esAgente } = useAuthStore();
  const [form, setForm] = useState({asunto:'',descripcion:'',categoria_id:'',prioridad:'media',empresa_id:'',agente_id:'',canal_origen:'portal',tags:''});
  const [categorias, setCategorias] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});
    if(esAgente()){
      api.get('/empresas').then(r=>setEmpresas(r.data)).catch(()=>{});
      api.get('/usuarios').then(r=>setAgentes(r.data.filter(u=>['agente','supervisor'].includes(u.rol)))).catch(()=>{});
    }
  },[]);

  const handleSubmit = async e => {
    e.preventDefault();
    if(!form.asunto.trim()||!form.descripcion.trim()){setError('Asunto y descripción son requeridos');return;}
    setEnviando(true);setError('');
    try{
      const payload={...form, tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]};
      const res=await api.post('/tickets',payload);
      toast('Ticket creado exitosamente');
      navigate(`/tickets/${res.data.id}`);
    }catch(err){setError(err.response?.data?.error||'Error al crear ticket');}
    finally{setEnviando(false);}
  };
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  return (
    <div className="fade-in" style={{maxWidth:680}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/tickets')}>← Volver</button>
        <h2 style={{fontSize:18,fontWeight:700}}>Nuevo Ticket de Soporte</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asunto *</label>
            <input placeholder="Describe brevemente el problema" value={form.asunto} onChange={e=>sf('asunto',e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select value={form.categoria_id} onChange={e=>sf('categoria_id',e.target.value)}>
                <option value="">Sin categoría</option>
                {categorias.map(c=><option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad *</label>
              <select value={form.prioridad} onChange={e=>sf('prioridad',e.target.value)}>
                <option value="baja">🟢 Baja</option>
                <option value="media">🔵 Media</option>
                <option value="alta">🟡 Alta</option>
                <option value="critica">🔴 Crítica</option>
              </select>
            </div>
          </div>
          {esAgente() && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Empresa cliente</label>
                <select value={form.empresa_id} onChange={e=>sf('empresa_id',e.target.value)}>
                  <option value="">Sin empresa</option>
                  {empresas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignar a agente</label>
                <select value={form.agente_id} onChange={e=>sf('agente_id',e.target.value)}>
                  <option value="">Sin asignar</option>
                  {agentes.map(a=><option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.rol})</option>)}
                </select>
              </div>
            </div>
          )}
          {esAgente() && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Canal de origen</label>
                <select value={form.canal_origen} onChange={e=>sf('canal_origen',e.target.value)}>
                  <option value="portal">Portal web</option>
                  <option value="email">Email</option>
                  <option value="telefono">Teléfono</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="api">API</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Etiquetas (separadas por coma)</label>
                <input placeholder="ej: urgente, factura, acceso" value={form.tags} onChange={e=>sf('tags',e.target.value)} />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Descripción detallada *</label>
            <textarea placeholder="Describe el problema con el mayor detalle posible. Incluye pasos para reproducir, mensajes de error, etc."
              value={form.descripcion} onChange={e=>sf('descripcion',e.target.value)} style={{minHeight:140}} required />
          </div>
          {error&&<div style={{background:'rgba(240,78,78,.1)',border:'1px solid rgba(240,78,78,.3)',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:13,color:'var(--red)'}}>{error}</div>}
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" type="submit" disabled={enviando} style={{minWidth:120}}>
              {enviando?'Creando...':'✓ Crear ticket'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={()=>navigate('/tickets')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// AGENTES PAGE - con crear / editar / desactivar
// ============================================================
export function AgentesPage() {
  const { esAdmin } = useAuthStore();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({nombre:'',apellido:'',email:'',rol:'agente',password:'',telefono:''});
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const cargar = () => {
    setLoading(true);
    api.get('/usuarios').then(r=>{setUsuarios(r.data);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{ cargar(); },[]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({nombre:'',apellido:'',email:'',rol:'agente',password:'',telefono:''});
    setErrForm('');setModalOpen(true);
  };
  const abrirEditar = u => {
    setEditando(u);
    setForm({nombre:u.nombre,apellido:u.apellido,email:u.email,rol:u.rol,password:'',telefono:u.telefono||''});
    setErrForm('');setModalOpen(true);
  };

  const guardar = async e => {
    e.preventDefault();
    if(!form.nombre||!form.email||(!editando&&!form.password)) {setErrForm('Nombre, email y contraseña son requeridos');return;}
    setGuardando(true);setErrForm('');
    try{
      if(editando){
        const payload={nombre:form.nombre,apellido:form.apellido,rol:form.rol,telefono:form.telefono};
        await api.put(`/usuarios/${editando.id}`,payload);
        if(form.password) await api.patch(`/usuarios/${editando.id}/password`,{password:form.password});
        toast('Usuario actualizado');
      } else {
        await api.post('/usuarios',form);
        toast('Usuario creado');
      }
      setModalOpen(false);cargar();
    }catch(err){setErrForm(err.response?.data?.error||'Error al guardar');}
    finally{setGuardando(false);}
  };

  const desactivar = async u => {
    if(!window.confirm(`¿Desactivar a ${u.nombre} ${u.apellido}?`)) return;
    try{await api.delete(`/usuarios/${u.id}`);toast('Usuario desactivado','warn');cargar();}
    catch(err){toast(err.response?.data?.error||'Error','error');}
  };
  const reactivar = async u => {
    try{await api.put(`/usuarios/${u.id}`,{activo:true});toast('Usuario reactivado');cargar();}
    catch(err){toast('Error','error');}
  };

  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const filtrados = usuarios.filter(u => {
    const ok = (!filtroRol || u.rol===filtroRol);
    const match = !buscar || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(buscar.toLowerCase());
    return ok && match;
  });

  return (
    <div className="fade-in">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input placeholder="Buscar..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{width:180}} />
          <select value={filtroRol} onChange={e=>setFiltroRol(e.target.value)} style={{width:140}}>
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="agente">Agente</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>
        {esAdmin() && <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo usuario</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {filtrados.map(u => {
            const ini=(u.nombre[0]+(u.apellido?.[0]||'')).toUpperCase();
            return (
              <div key={u.id} className="card" style={{position:'relative',opacity:u.activo?1:.6}}>
                {!u.activo && <div style={{position:'absolute',top:10,right:10,fontSize:10,background:'var(--red)',color:'#fff',padding:'2px 6px',borderRadius:4}}>INACTIVO</div>}
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                  <div className="avatar">{ini}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.nombre} {u.apellido}</div>
                    <div style={{fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{u.rol}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>{u.email}</div>
                {u.telefono && <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>📞 {u.telefono}</div>}
                {u.ultimo_acceso && <div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>Último acceso: {new Date(u.ultimo_acceso).toLocaleDateString('es-PE')}</div>}
                {esAdmin() && (
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>abrirEditar(u)} style={{flex:1}}>✏ Editar</button>
                    {u.activo
                      ? <button className="btn btn-ghost btn-sm" onClick={()=>desactivar(u)} style={{color:'var(--red)'}}>✕</button>
                      : <button className="btn btn-ghost btn-sm" onClick={()=>reactivar(u)} style={{color:'var(--green)'}}>✓</button>
                    }
                  </div>
                )}
              </div>
            );
          })}
          {filtrados.length===0 && <div className="empty-state"><div className="icon">◉</div><p>No hay usuarios con esos filtros</p></div>}
        </div>
      )}

      {modalOpen && (
        <Modal title={editando?'Editar usuario':'Nuevo usuario'} onClose={()=>setModalOpen(false)}>
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
                  <option value="agente">Agente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{editando?'Nueva contraseña (dejar vacío para no cambiar)':'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={e=>sf('password',e.target.value)} placeholder={editando?'••••••••':''} required={!editando} />
              </div>
            </div>
            {errForm && <div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar':'Crear usuario'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// EMPRESAS (CLIENTES) PAGE - CRUD completo
// ============================================================
export function ClientesPage() {
  const { esSupervisor } = useAuthStore();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalleEmpresa, setDetalleEmpresa] = useState(null);
  const [form, setForm] = useState({nombre:'',ruc:'',email:'',telefono:'',direccion:'',plan:'starter',ejecutivo_id:''});
  const [agentes, setAgentes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');
  const navigate = useNavigate();

  const cargar = () => {
    setLoading(true);
    api.get('/empresas').then(r=>{setEmpresas(r.data);setLoading(false);}).catch(()=>setLoading(false));
    api.get('/usuarios?rol=agente').then(r=>setAgentes(r.data)).catch(()=>{});
  };
  useEffect(()=>cargar(),[]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({nombre:'',ruc:'',email:'',telefono:'',direccion:'',plan:'starter',ejecutivo_id:''});
    setErrForm('');setModalOpen(true);
  };
  const abrirEditar = async emp => {
    setEditando(emp);
    setForm({nombre:emp.nombre,ruc:emp.ruc||'',email:emp.email||'',telefono:emp.telefono||'',direccion:emp.direccion||'',plan:emp.plan||'starter',ejecutivo_id:emp.ejecutivo_id||''});
    setErrForm('');setModalOpen(true);
  };
  const abrirDetalle = async emp => {
    try{const r=await api.get(`/empresas/${emp.id}`);setDetalleEmpresa(r.data);}
    catch{toast('Error al cargar detalle','error');}
  };

  const guardar = async e => {
    e.preventDefault();
    if(!form.nombre.trim()){setErrForm('El nombre es requerido');return;}
    setGuardando(true);setErrForm('');
    try{
      if(editando){await api.put(`/empresas/${editando.id}`,form);toast('Empresa actualizada');}
      else{await api.post('/empresas',form);toast('Empresa creada');}
      setModalOpen(false);cargar();
    }catch(err){setErrForm(err.response?.data?.error||'Error al guardar');}
    finally{setGuardando(false);}
  };

  const eliminar = async emp => {
    if(!window.confirm(`¿Eliminar/desactivar "${emp.nombre}"?`)) return;
    try{
      const r=await api.delete(`/empresas/${emp.id}`);
      toast(r.data.mensaje||'Empresa eliminada','warn');cargar();
    }catch(err){toast(err.response?.data?.error||'Error','error');}
  };

  const sf = (k,v)=>setForm(f=>({...f,[k]:v}));
  const filtradas = empresas.filter(e=>!buscar||`${e.nombre}${e.ruc||''}${e.email||''}`.toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div className="fade-in">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Buscar empresa..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{width:220}} />
          <span style={{color:'var(--muted)',fontSize:13}}>{filtradas.length} empresa{filtradas.length!==1?'s':''}</span>
        </div>
        {esSupervisor() && <button className="btn btn-primary" onClick={abrirNuevo}>+ Nueva empresa</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table>
            <thead>
              <tr>
                <th>Empresa</th><th>RUC</th><th>Email</th><th>Teléfono</th>
                <th>Plan</th><th>Tickets abiertos</th><th>Total</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length===0
                ? <tr><td colSpan={9}><div className="empty-state"><div className="icon">🏢</div><p>No hay empresas registradas</p></div></td></tr>
                : filtradas.map(e=>(
                <tr key={e.id}>
                  <td>
                    <div style={{fontWeight:600,cursor:'pointer',color:'var(--accent)'}} onClick={()=>abrirDetalle(e)}>{e.nombre}</div>
                    {e.ejecutivo_nombre && <div style={{fontSize:11,color:'var(--muted)'}}>Ejecutivo: {e.ejecutivo_nombre}</div>}
                  </td>
                  <td style={{color:'var(--muted)'}}>{e.ruc||'—'}</td>
                  <td style={{fontSize:12}}>{e.email||'—'}</td>
                  <td style={{color:'var(--muted)',fontSize:12}}>{e.telefono||'—'}</td>
                  <td>
                    <span style={{
                      background:e.plan==='enterprise'?'rgba(155,89,255,.15)':e.plan==='pro'?'rgba(79,127,255,.15)':'rgba(34,201,122,.15)',
                      color:e.plan==='enterprise'?'var(--purple)':e.plan==='pro'?'var(--accent)':'var(--green)',
                      fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,textTransform:'capitalize'
                    }}>{e.plan}</span>
                  </td>
                  <td style={{color:parseInt(e.tickets_abiertos)>0?'var(--amber)':'var(--muted)',fontWeight:parseInt(e.tickets_abiertos)>0?600:'normal'}}>{e.tickets_abiertos||0}</td>
                  <td>{e.total_tickets||0}</td>
                  <td>
                    <span style={{fontSize:11,color:e.activo?'var(--green)':'var(--red)',fontWeight:600}}>{e.activo?'Activa':'Inactiva'}</span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
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

      {/* Modal crear/editar empresa */}
      {modalOpen && (
        <Modal title={editando?`Editar: ${editando.nombre}`:'Nueva empresa'} onClose={()=>setModalOpen(false)}>
          <form onSubmit={guardar}>
            <div className="form-group"><label className="form-label">Nombre de la empresa *</label><input value={form.nombre} onChange={e=>sf('nombre',e.target.value)} placeholder="Ej: Magus Technology S.A.C." required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">RUC</label><input value={form.ruc} onChange={e=>sf('ruc',e.target.value)} placeholder="20XXXXXXXXX" /></div>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select value={form.plan} onChange={e=>sf('plan',e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email corporativo</label><input type="email" value={form.email} onChange={e=>sf('email',e.target.value)} placeholder="contacto@empresa.com" /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input value={form.telefono} onChange={e=>sf('telefono',e.target.value)} placeholder="+51 01 XXX-XXXX" /></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label><input value={form.direccion} onChange={e=>sf('direccion',e.target.value)} placeholder="Av. ..." /></div>
            <div className="form-group">
              <label className="form-label">Ejecutivo a cargo</label>
              <select value={form.ejecutivo_id} onChange={e=>sf('ejecutivo_id',e.target.value)}>
                <option value="">Sin ejecutivo asignado</option>
                {agentes.map(a=><option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
              </select>
            </div>
            {errForm && <div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar':'Crear empresa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal detalle empresa */}
      {detalleEmpresa && (
        <Modal title={`Detalle: ${detalleEmpresa.nombre}`} onClose={()=>setDetalleEmpresa(null)} width={640}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            {[['RUC',detalleEmpresa.ruc||'—'],['Email',detalleEmpresa.email||'—'],['Teléfono',detalleEmpresa.telefono||'—'],['Plan',detalleEmpresa.plan],['Dirección',detalleEmpresa.direccion||'—'],['Ejecutivo',detalleEmpresa.ejecutivo_nombre||'—']].map(([k,v])=>(
              <div key={k}><div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>{k}</div><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          {detalleEmpresa.contactos?.length>0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Contactos ({detalleEmpresa.contactos.length})</div>
              {detalleEmpresa.contactos.map(c=>(
                <div key={c.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span>{c.nombre} {c.apellido}</span><span style={{color:'var(--muted)'}}>{c.email}</span>
                </div>
              ))}
            </div>
          )}
          {detalleEmpresa.tickets_recientes?.length>0 && (
            <div>
              <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Tickets recientes</div>
              {detalleEmpresa.tickets_recientes.map(t=>(
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <div>
                    <span style={{fontSize:11,color:'var(--muted)',marginRight:8}}>{t.codigo}</span>
                    <span style={{fontSize:13}}>{t.asunto}</span>
                  </div>
                  <span className={`badge badge-${t.estado}`} style={{fontSize:10}}>{t.estado}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{marginTop:16,display:'flex',gap:8,justifyContent:'flex-end'}}>
            {esSupervisor()&&<button className="btn btn-ghost" onClick={()=>{setDetalleEmpresa(null);abrirEditar(detalleEmpresa);}}>✏ Editar</button>}
            <button className="btn btn-ghost" onClick={()=>setDetalleEmpresa(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// SLA PAGE - editar in-line
// ============================================================
export function SLAPage() {
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => { setLoading(true); api.get('/sla').then(r=>{setSlas(r.data);setLoading(false);}).catch(()=>setLoading(false)); };
  useEffect(()=>cargar(),[]);

  const guardar = async sla => {
    setGuardando(sla.id);
    try{
      await api.put(`/sla/${sla.id}`,sla);
      toast('SLA actualizado');setEditando(null);cargar();
    }catch(err){toast(err.response?.data?.error||'Error al guardar','error');}
    finally{setGuardando(false);}
  };

  const horas = min => {
    if(min<60) return `${min}min`;
    const h=Math.floor(min/60),m=min%60;
    return m>0?`${h}h ${m}m`:`${h}h`;
  };

  if(loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div className="fade-in">
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Políticas de SLA</h2>
        <p style={{color:'var(--muted)',fontSize:13}}>Define los tiempos de respuesta y resolución por prioridad. Haz clic en "Editar" para modificar.</p>
      </div>
      <div style={{display:'grid',gap:12}}>
        {slas.map(s => {
          const isEdit = editando?.id===s.id;
          const cur = isEdit ? editando : s;
          const colores = {critica:'var(--red)',alta:'var(--amber)',media:'#4FC3F7',baja:'var(--muted)'};
          return (
            <div key={s.id} className="card">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:isEdit?16:0,flexWrap:'wrap'}}>
                <div style={{width:12,height:12,borderRadius:'50%',background:colores[s.prioridad],flexShrink:0}} />
                <div style={{fontWeight:700,textTransform:'capitalize',minWidth:70}}>{s.prioridad}</div>
                {!isEdit && (
                  <>
                    <div style={{flex:1,display:'flex',gap:24,flexWrap:'wrap'}}>
                      <div><span style={{color:'var(--muted)',fontSize:12}}>1ª Respuesta: </span><strong>{horas(s.tiempo_primera_respuesta_min)}</strong></div>
                      <div><span style={{color:'var(--muted)',fontSize:12}}>Resolución: </span><strong>{horas(s.tiempo_resolucion_min)}</strong></div>
                      <div><span style={{color:'var(--muted)',fontSize:12}}>Horario: </span><strong style={{textTransform:'uppercase',fontSize:12}}>{s.horario.replace(/_/g,' ')}</strong></div>
                      <div><span style={{color:'var(--muted)',fontSize:12}}>Alertar al: </span><strong>{s.notificar_en_pct}%</strong></div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setEditando({...s})}>✏ Editar</button>
                  </>
                )}
              </div>
              {isEdit && (
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Primera respuesta (minutos)</label>
                      <input type="number" min={1} value={editando.tiempo_primera_respuesta_min}
                        onChange={e=>setEditando(f=>({...f,tiempo_primera_respuesta_min:parseInt(e.target.value)}))} />
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>= {horas(editando.tiempo_primera_respuesta_min||0)}</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tiempo de resolución (minutos)</label>
                      <input type="number" min={1} value={editando.tiempo_resolucion_min}
                        onChange={e=>setEditando(f=>({...f,tiempo_resolucion_min:parseInt(e.target.value)}))} />
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>= {horas(editando.tiempo_resolucion_min||0)}</div>
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
                      <label className="form-label">Alertar cuando se consume (%)</label>
                      <input type="number" min={1} max={99} value={editando.notificar_en_pct}
                        onChange={e=>setEditando(f=>({...f,notificar_en_pct:parseInt(e.target.value)}))} />
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-primary btn-sm" disabled={guardando===s.id}
                      onClick={()=>guardar(editando)}>{guardando===s.id?'Guardando...':'✓ Guardar cambios'}</button>
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

// ============================================================
// REPORTES PAGE
// ============================================================
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
    }catch(e){toast('Error al cargar reportes','error');}
    finally{setLoading(false);}
  };
  useEffect(()=>{cargar();},[]);

  const sf=(k,v)=>setFiltros(f=>({...f,[k]:v}));

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:8,marginBottom:20,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div className="form-group" style={{margin:0}}>
          <label className="form-label">Desde</label>
          <input type="date" value={filtros.desde} onChange={e=>sf('desde',e.target.value)} style={{width:160}} />
        </div>
        <div className="form-group" style={{margin:0}}>
          <label className="form-label">Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e=>sf('hasta',e.target.value)} style={{width:160}} />
        </div>
        <button className="btn btn-primary" onClick={cargar}>Aplicar filtros</button>
        <button className="btn btn-ghost" onClick={()=>{setFiltros({desde:'',hasta:''});setTimeout(cargar,50);}}>Limpiar</button>
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : !data ? null : (() => {
        const {totales,por_estado,por_prioridad,por_categoria,sla,frt,ttr,csat,tendencia_diaria,por_agente,slaDetalle}=data;
        return (
          <>
            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
              {[
                {l:'Total tickets',v:totales?.total??0,c:'var(--accent)'},
                {l:'Nuevos',v:totales?.nuevos??0,c:'#4FC3F7'},
                {l:'En progreso',v:totales?.en_progreso??0,c:'var(--amber)'},
                {l:'Resueltos',v:totales?.resueltos??0,c:'var(--green)'},
                {l:'Abiertos',v:totales?.abiertos??0,c:'var(--purple)'},
                {l:'Vencidos SLA',v:totales?.vencidos??0,c:'var(--red)'},
              ].map(({l,v,c})=>(
                <div key={l} className="card" style={{textAlign:'center',padding:14}}>
                  <div style={{fontSize:26,fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Métricas clave */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
              <div className="card" style={{textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>FRT Promedio</div>
                <div style={{fontSize:22,fontWeight:700,color:'var(--accent)'}}>{frt?.frt_promedio_min?`${frt.frt_promedio_min}min`:'—'}</div>
                {frt?.frt_min&&<div style={{fontSize:11,color:'var(--muted)'}}>Mín: {frt.frt_min}min · Máx: {frt.frt_max}min</div>}
              </div>
              <div className="card" style={{textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>Resolución Prom.</div>
                <div style={{fontSize:22,fontWeight:700,color:'var(--amber)'}}>{ttr?.ttr_promedio_min?`${Math.round(ttr.ttr_promedio_min/60)}h`:'—'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>SLA cumplimiento: <strong style={{color:sla?.pct_cumplimiento>=80?'var(--green)':'var(--red)'}}>{sla?.pct_cumplimiento??0}%</strong></div>
              </div>
              <div className="card" style={{textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>CSAT</div>
                <div style={{fontSize:22,fontWeight:700,color:'var(--amber)'}}>{csat?.promedio?`${csat.promedio} ★`:'—'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{csat?.total??0} encuestas respondidas</div>
              </div>
            </div>

            {/* SLA por prioridad */}
            <div className="card" style={{marginBottom:16,padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',fontWeight:600,borderBottom:'1px solid var(--border)'}}>Cumplimiento SLA por prioridad</div>
              <table>
                <thead><tr><th>Prioridad</th><th>1ª Respuesta</th><th>Resolución</th><th>Tickets evaluados</th><th>Cumplidos</th><th>% Cumplimiento</th></tr></thead>
                <tbody>
                  {slaDetalle?.map(s=>(
                    <tr key={s.prioridad}>
                      <td><span className={`prio prio-${s.prioridad}`}><span className="prio-dot"/>{s.prioridad}</span></td>
                      <td style={{color:'var(--muted)'}}>{s.tiempo_primera_respuesta_min}min</td>
                      <td style={{color:'var(--muted)'}}>{Math.round(s.tiempo_resolucion_min/60)}h</td>
                      <td>{s.total_tickets}</td>
                      <td style={{color:'var(--green)'}}>{s.resolucion_ok}</td>
                      <td><span style={{fontWeight:700,color:s.pct_cumplimiento>=80?'var(--green)':'var(--red)'}}>{s.pct_cumplimiento??0}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Categorías + CSAT desglose */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div className="card">
                <div style={{fontWeight:600,marginBottom:12}}>Top categorías</div>
                {por_categoria?.length===0?<div style={{color:'var(--muted)',fontSize:13}}>Sin datos</div>:por_categoria?.map(c=>(
                  <div key={c.categoria} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{fontSize:13}}>{c.categoria||'Sin categoría'}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="sla-bar" style={{width:60}}>
                        <div className="sla-fill sla-ok" style={{width:`${Math.min(100,(c.cantidad/((por_categoria[0]?.cantidad)||1))*100)}%`}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--accent)',minWidth:24,textAlign:'right'}}>{c.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{fontWeight:600,marginBottom:12}}>Satisfacción (CSAT)</div>
                {csat?.promedio ? (
                  <>
                    <div style={{textAlign:'center',padding:'8px 0 16px',fontSize:32,fontWeight:700,color:'var(--amber)'}}>{csat.promedio} ★</div>
                    {[{l:'5 estrellas',v:csat.cinco,c:'var(--green)'},{l:'4 estrellas',v:csat.cuatro,c:'var(--green)'},{l:'3 estrellas',v:csat.tres,c:'var(--amber)'},{l:'1-2 estrellas',v:csat.bajo,c:'var(--red)'}].map(({l,v,c})=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
                        <span style={{color:'var(--muted)'}}>{l}</span>
                        <span style={{fontWeight:600,color:c}}>{v??0}</span>
                      </div>
                    ))}
                  </>
                ) : <div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:20}}>Sin encuestas respondidas</div>}
              </div>
            </div>

            {/* Agentes */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',fontWeight:600,borderBottom:'1px solid var(--border)'}}>Rendimiento por agente</div>
              <table>
                <thead><tr><th>Agente</th><th>Total</th><th>Resueltos</th><th>Abiertos</th><th>FRT prom.</th><th>CSAT</th><th>SLA ✓</th></tr></thead>
                <tbody>
                  {por_agente?.length===0
                    ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:20}}>Sin datos en este período</td></tr>
                    : por_agente?.map(a=>(
                    <tr key={a.agente_id}>
                      <td style={{fontWeight:500}}>{a.agente}</td>
                      <td>{a.total_tickets}</td>
                      <td style={{color:'var(--green)',fontWeight:600}}>{a.resueltos}</td>
                      <td>{parseInt(a.total_tickets)-parseInt(a.resueltos||0)}</td>
                      <td style={{color:'var(--muted)'}}>{a.frt_promedio?`${Math.round(a.frt_promedio)}min`:'—'}</td>
                      <td style={{color:'var(--amber)'}}>{a.csat?`${a.csat} ★`:'—'}</td>
                      <td style={{color:'var(--green)'}}>{a.sla_cumplidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ============================================================
// KB PAGE - listar + crear + editar + archivar
// ============================================================
export function KBPage() {
  const { esAgente } = useAuthStore();
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('publicado');
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [viendoArticulo, setViendoArticulo] = useState(null);
  const [form, setForm] = useState({titulo:'',contenido:'',resumen:'',categoria_id:'',estado:'borrador',tags:''});
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState('');

  const cargar = () => {
    setLoading(true);
    const q=new URLSearchParams({estado});
    if(buscar) q.set('buscar',buscar);
    api.get(`/kb?${q}`).then(r=>{setArticulos(r.data);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{cargar();},[estado]);
  useEffect(()=>{api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});},[]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({titulo:'',contenido:'',resumen:'',categoria_id:'',estado:'borrador',tags:''});
    setErrForm('');setModalOpen(true);
  };
  const abrirEditar = a => {
    setEditando(a);
    setForm({titulo:a.titulo,contenido:a.contenido,resumen:a.resumen||'',categoria_id:a.categoria_id||'',estado:a.estado,tags:(a.tags||[]).join(', ')});
    setErrForm('');setModalOpen(true);
  };
  const verArticulo = async a => {
    try{const r=await api.get(`/kb/${a.id}`);setViendoArticulo(r.data);}
    catch{setViendoArticulo(a);}
  };

  const guardar = async e => {
    e.preventDefault();
    if(!form.titulo.trim()||!form.contenido.trim()){setErrForm('Título y contenido son requeridos');return;}
    setGuardando(true);setErrForm('');
    try{
      const payload={...form,tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[]};
      if(editando){await api.put(`/kb/${editando.id}`,payload);toast('Artículo actualizado');}
      else{await api.post('/kb',payload);toast('Artículo creado');}
      setModalOpen(false);cargar();
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
        <input placeholder="Buscar artículos..." value={buscar} onChange={e=>setBuscar(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&cargar()} style={{flex:1,maxWidth:300}} />
        <button className="btn btn-ghost" onClick={cargar}>Buscar</button>
        {esAgente() && (
          <select value={estado} onChange={e=>setEstado(e.target.value)} style={{width:140}}>
            <option value="publicado">Publicados</option>
            <option value="borrador">Borradores</option>
            <option value="archivado">Archivados</option>
          </select>
        )}
        <div style={{flex:1}}/>
        {esAgente() && <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo artículo</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {articulos.length===0
            ? <div className="empty-state"><div className="icon">📚</div><p>No hay artículos {estado==='publicado'?'publicados':estado}</p></div>
            : articulos.map(a=>(
            <div key={a.id} className="card" style={{cursor:'pointer',transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:14,lineHeight:1.4,flex:1,marginRight:8}} onClick={()=>verArticulo(a)}>{a.titulo}</div>
                <span style={{
                  fontSize:10,padding:'2px 6px',borderRadius:4,flexShrink:0,fontWeight:600,
                  background:a.estado==='publicado'?'rgba(34,201,122,.15)':a.estado==='borrador'?'rgba(79,127,255,.15)':'rgba(122,133,163,.15)',
                  color:a.estado==='publicado'?'var(--green)':a.estado==='borrador'?'var(--accent)':'var(--muted)'
                }}>{a.estado}</span>
              </div>
              {a.resumen && <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{a.resumen}</div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--muted)',marginBottom:esAgente()?8:0}}>
                <span>{a.categoria_nombre||'General'}</span>
                <span>👁 {a.vistas} · 👍 {a.util_si}</span>
              </div>
              {esAgente() && (
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>abrirEditar(a)}>✏ Editar</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>archivar(a)} style={{color:'var(--red)'}}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar artículo */}
      {modalOpen && (
        <Modal title={editando?'Editar artículo':'Nuevo artículo'} onClose={()=>setModalOpen(false)} width={680}>
          <form onSubmit={guardar}>
            <div className="form-group"><label className="form-label">Título *</label><input value={form.titulo} onChange={e=>sf('titulo',e.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Resumen (visible en el listado)</label><textarea value={form.resumen} onChange={e=>sf('resumen',e.target.value)} style={{minHeight:60}} /></div>
            <div className="form-group"><label className="form-label">Contenido completo *</label><textarea value={form.contenido} onChange={e=>sf('contenido',e.target.value)} style={{minHeight:180}} required /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select value={form.categoria_id} onChange={e=>sf('categoria_id',e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
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
            <div className="form-group"><label className="form-label">Etiquetas (separadas por coma)</label><input value={form.tags} onChange={e=>sf('tags',e.target.value)} placeholder="ej: factura, acceso, error" /></div>
            {errForm && <div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{errForm}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':editando?'Actualizar':'Publicar artículo'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal ver artículo */}
      {viendoArticulo && (
        <Modal title={viendoArticulo.titulo} onClose={()=>setViendoArticulo(null)} width={700}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap'}}>
            <span>📁 {viendoArticulo.categoria_nombre||'General'}</span>
            <span>✍ {viendoArticulo.autor_nombre}</span>
            <span>👁 {viendoArticulo.vistas} vistas</span>
            <span>👍 {viendoArticulo.util_si} útil</span>
          </div>
          <div style={{fontSize:14,lineHeight:1.8,color:'var(--muted)',whiteSpace:'pre-wrap'}}>{viendoArticulo.contenido}</div>
          <div style={{marginTop:16,display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost" onClick={()=>{api.post(`/kb/${viendoArticulo.id}/util`,{util:true});toast('Marcado como útil ✓');}}>👍 Útil</button>
            {esAgente()&&<button className="btn btn-ghost" onClick={()=>{setViendoArticulo(null);abrirEditar(viendoArticulo);}}>✏ Editar</button>}
            <button className="btn btn-ghost" onClick={()=>setViendoArticulo(null)}>Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// CONFIG PAGE - con guardar funcional
// ============================================================
export function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({nombre:'',email_soporte:''});
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({nombre:'',descripcion:'',icono:'',color:'#4F7FFF',area_responsable:''});
  const [catEditando, setCatEditando] = useState(null);
  const [catErr, setCatErr] = useState('');
  const [catGuardando, setCatGuardando] = useState(false);
  const [passForm, setPassForm] = useState({password_actual:'',password_nuevo:'',confirmar:''});
  const [passErr, setPassErr] = useState('');
  const [passOk, setPassOk] = useState('');

  const cargar = () => {
    api.get('/config').then(r=>{setConfig(r.data);setForm({nombre:r.data.nombre,email_soporte:r.data.email_soporte||''});setLoading(false);}).catch(()=>setLoading(false));
    api.get('/categorias').then(r=>setCategorias(r.data)).catch(()=>{});
  };
  useEffect(()=>cargar(),[]);

  const guardarConfig = async e => {
    e.preventDefault();
    setGuardando(true);
    try{await api.put('/config',form);toast('Configuración guardada');}
    catch(err){toast(err.response?.data?.error||'Error','error');}
    finally{setGuardando(false);}
  };

  const cambiarPassword = async e => {
    e.preventDefault();
    setPassErr('');setPassOk('');
    if(passForm.password_nuevo!==passForm.confirmar){setPassErr('Las contraseñas no coinciden');return;}
    if(passForm.password_nuevo.length<8){setPassErr('Mínimo 8 caracteres');return;}
    try{
      await api.patch('/auth/cambiar-password',{password_actual:passForm.password_actual,password_nuevo:passForm.password_nuevo});
      setPassOk('Contraseña actualizada correctamente');
      setPassForm({password_actual:'',password_nuevo:'',confirmar:''});
    }catch(err){setPassErr(err.response?.data?.error||'Error al cambiar contraseña');}
  };

  const guardarCategoria = async e => {
    e.preventDefault();
    if(!catForm.nombre.trim()){setCatErr('Nombre requerido');return;}
    setCatGuardando(true);setCatErr('');
    try{
      if(catEditando){await api.put(`/categorias/${catEditando.id}`,catForm);toast('Categoría actualizada');}
      else{await api.post('/categorias',catForm);toast('Categoría creada');}
      setCatModalOpen(false);cargar();
    }catch(err){setCatErr(err.response?.data?.error||'Error');}
    finally{setCatGuardando(false);}
  };

  const eliminarCat = async cat => {
    if(!window.confirm(`¿Desactivar categoría "${cat.nombre}"?`)) return;
    try{await api.delete(`/categorias/${cat.id}`);toast('Categoría desactivada','warn');cargar();}
    catch{toast('Error','error');}
  };

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  if(loading) return <div className="loading"><div className="spinner"/></div>;

  return (
    <div className="fade-in" style={{maxWidth:700}}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:20}}>Configuración del sistema</h2>

      {/* Configuración empresa */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontWeight:600,marginBottom:16}}>⚙ Información de la empresa</div>
        <form onSubmit={guardarConfig}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre de la empresa</label><input value={form.nombre} onChange={e=>sf('nombre',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email de soporte</label><input type="email" value={form.email_soporte} onChange={e=>sf('email_soporte',e.target.value)} /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando?'Guardando...':'✓ Guardar cambios'}</button>
        </form>
      </div>

      {/* Categorías */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontWeight:600}}>📁 Categorías ({categorias.length})</div>
          <button className="btn btn-primary btn-sm" onClick={()=>{setCatEditando(null);setCatForm({nombre:'',descripcion:'',icono:'🔧',color:'#4F7FFF',area_responsable:''});setCatErr('');setCatModalOpen(true);}}>+ Nueva</button>
        </div>
        <div style={{display:'grid',gap:8}}>
          {categorias.map(c=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--surface)',borderRadius:8}}>
              <span style={{fontSize:18}}>{c.icono||'📁'}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{c.nombre}</div>
                {c.area_responsable&&<div style={{fontSize:11,color:'var(--muted)'}}>{c.area_responsable}</div>}
              </div>
              <div style={{width:10,height:10,borderRadius:'50%',background:c.color||'var(--accent)'}}/>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setCatEditando(c);setCatForm({nombre:c.nombre,descripcion:c.descripcion||'',icono:c.icono||'',color:c.color||'#4F7FFF',area_responsable:c.area_responsable||''});setCatErr('');setCatModalOpen(true);}}>✏</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>eliminarCat(c)} style={{color:'var(--red)'}}>✕</button>
            </div>
          ))}
          {categorias.length===0&&<div style={{color:'var(--muted)',fontSize:13}}>No hay categorías configuradas</div>}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="card">
        <div style={{fontWeight:600,marginBottom:16}}>🔐 Cambiar mi contraseña</div>
        <form onSubmit={cambiarPassword} style={{maxWidth:400}}>
          <div className="form-group"><label className="form-label">Contraseña actual</label><input type="password" value={passForm.password_actual} onChange={e=>setPassForm(f=>({...f,password_actual:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Nueva contraseña</label><input type="password" value={passForm.password_nuevo} onChange={e=>setPassForm(f=>({...f,password_nuevo:e.target.value}))} required /></div>
          <div className="form-group"><label className="form-label">Confirmar nueva contraseña</label><input type="password" value={passForm.confirmar} onChange={e=>setPassForm(f=>({...f,confirmar:e.target.value}))} required /></div>
          {passErr&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{passErr}</div>}
          {passOk&&<div style={{color:'var(--green)',fontSize:13,marginBottom:10,background:'rgba(34,201,122,.08)',padding:'8px 10px',borderRadius:6}}>{passOk}</div>}
          <button className="btn btn-primary" type="submit">Cambiar contraseña</button>
        </form>
      </div>

      {/* Modal categoría */}
      {catModalOpen && (
        <Modal title={catEditando?'Editar categoría':'Nueva categoría'} onClose={()=>setCatModalOpen(false)}>
          <form onSubmit={guardarCategoria}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nombre *</label><input value={catForm.nombre} onChange={e=>setCatForm(f=>({...f,nombre:e.target.value}))} required /></div>
              <div className="form-row" style={{gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="form-group"><label className="form-label">Icono (emoji)</label><input value={catForm.icono} onChange={e=>setCatForm(f=>({...f,icono:e.target.value}))} placeholder="🔧" style={{fontSize:20}} /></div>
                <div className="form-group"><label className="form-label">Color</label><input type="color" value={catForm.color} onChange={e=>setCatForm(f=>({...f,color:e.target.value}))} style={{height:40,padding:4}} /></div>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Área responsable</label><input value={catForm.area_responsable} onChange={e=>setCatForm(f=>({...f,area_responsable:e.target.value}))} placeholder="Ej: Soporte Técnico, Ventas" /></div>
            <div className="form-group"><label className="form-label">Descripción</label><textarea value={catForm.descripcion} onChange={e=>setCatForm(f=>({...f,descripcion:e.target.value}))} style={{minHeight:60}} /></div>
            {catErr&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10}}>{catErr}</div>}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" type="button" onClick={()=>setCatModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={catGuardando}>{catGuardando?'Guardando...':catEditando?'Actualizar':'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// ENCUESTA PAGE
// ============================================================
export function EncuestaPage() {
  const token = window.location.pathname.split('/').pop();
  const calParam = parseInt(new URLSearchParams(window.location.search).get('cal')||'0');
  const [rating, setRating] = useState(calParam||0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    if(!rating) return;
    setEnviando(true);setError('');
    try{
      await api.post('/tickets/encuesta',{token,calificacion:rating,comentario});
      setEnviado(true);
    }catch(err){setError(err.response?.data?.error||'Error al enviar encuesta');}
    finally{setEnviando(false);}
  };

  const labels=['Muy malo','Malo','Regular','Bueno','Excelente'];

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:16}}>
      <div className="card fade-in" style={{maxWidth:440,width:'100%',textAlign:'center',padding:36}}>
        <div style={{fontSize:36,marginBottom:12}}>{enviado?'✅':'⭐'}</div>
        {enviado ? (
          <>
            <h2 style={{marginBottom:8,fontSize:20}}>¡Gracias por tu calificación!</h2>
            <p style={{color:'var(--muted)',fontSize:14}}>Tu opinión nos ayuda a mejorar nuestro servicio.</p>
          </>
        ) : (
          <>
            <h2 style={{marginBottom:4,fontSize:18}}>¿Cómo fue tu experiencia?</h2>
            <p style={{color:'var(--muted)',fontSize:13,marginBottom:24}}>Tu ticket fue resuelto. Califica la atención recibida (1-5 estrellas).</p>
            <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:8}}>
              {[1,2,3,4,5].map(n=>(
                <span key={n}
                  onClick={()=>setRating(n)}
                  onMouseEnter={()=>setHover(n)}
                  onMouseLeave={()=>setHover(0)}
                  style={{fontSize:38,cursor:'pointer',color:n<=(hover||rating)?'var(--amber)':'var(--border)',transition:'color .1s,transform .1s',transform:n<=(hover||rating)?'scale(1.15)':'scale(1)'}}>★</span>
              ))}
            </div>
            {(hover||rating)>0 && (
              <div style={{fontSize:13,color:'var(--amber)',fontWeight:600,marginBottom:16}}>
                {labels[(hover||rating)-1]}
              </div>
            )}
            <textarea placeholder="Comentario opcional... ¿Qué podemos mejorar?" value={comentario}
              onChange={e=>setComentario(e.target.value)} style={{marginBottom:12,minHeight:80,fontSize:13,textAlign:'left'}} />
            {error && <div style={{color:'var(--red)',fontSize:13,marginBottom:10,background:'rgba(240,78,78,.08)',padding:'8px 10px',borderRadius:6}}>{error}</div>}
            <button className="btn btn-primary" onClick={enviar} disabled={!rating||enviando}
              style={{width:'100%',justifyContent:'center',padding:12,fontSize:14}}>
              {enviando?'Enviando...':rating?`Enviar calificación (${labels[rating-1]})`:'Selecciona una calificación'}
            </button>
          </>
        )}
        <div style={{marginTop:20,fontSize:11,color:'var(--muted)'}}>Magus Help Desk · magus-ecommerce.com</div>
      </div>
    </div>
  );
}
