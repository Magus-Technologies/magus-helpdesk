const express = require('express');
const router = express.Router();
const { authMiddleware, requireRol } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const ticketsCtrl = require('../controllers/ticketsController');
const reportesCtrl = require('../controllers/reportesController');
const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './uploads',
  filename: (req, file, cb) => { cb(null, `${uuidv4()}${path.extname(file.originalname)}`); }
});
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB)||15)*1024*1024 },
  fileFilter: (req,file,cb) => cb(null,['.jpg','.jpeg','.png','.gif','.pdf','.doc','.docx','.xls','.xlsx','.txt','.zip','.mp4','.pptx'].includes(path.extname(file.originalname).toLowerCase()))
});

// AUTH
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', authMiddleware, authCtrl.logout);
router.get('/auth/me', authMiddleware, authCtrl.me);
router.patch('/auth/cambiar-password', authMiddleware, async (req,res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual||!password_nuevo) return res.status(400).json({error:'Ambas contraseñas requeridas'});
    if (password_nuevo.length<8) return res.status(400).json({error:'Mínimo 8 caracteres'});
    const u = await query('SELECT password_hash FROM usuarios WHERE id=$1',[req.user.id]);
    if (!await bcrypt.compare(password_actual,u.rows[0].password_hash)) return res.status(400).json({error:'Contraseña actual incorrecta'});
    await query('UPDATE usuarios SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(password_nuevo,12),req.user.id]);
    res.json({mensaje:'Contraseña actualizada'});
  } catch(e){res.status(500).json({error:'Error al cambiar contraseña'});}
});

// DASHBOARD
router.get('/dashboard', authMiddleware, ticketsCtrl.dashboardStats);

// TICKETS — encuesta ANTES de /:id para evitar conflicto
router.post('/tickets/encuesta', ticketsCtrl.responderEncuesta);
router.get('/tickets', authMiddleware, ticketsCtrl.listarTickets);
router.post('/tickets', authMiddleware, ticketsCtrl.crearTicket);
router.get('/tickets/:id', authMiddleware, ticketsCtrl.obtenerTicket);
router.patch('/tickets/:id', authMiddleware, ticketsCtrl.actualizarTicket);
router.delete('/tickets/:id', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{await query('UPDATE tickets SET estado=$1 WHERE id=$2 AND tenant_id=$3',['cancelado',req.params.id,req.tenantId]);res.json({mensaje:'Ticket cancelado'});}
  catch(e){res.status(500).json({error:'Error'});}
});
router.post('/tickets/:id/comentarios', authMiddleware, ticketsCtrl.agregarComentario);
router.post('/tickets/:id/adjuntos', authMiddleware, upload.array('archivos',5), async(req,res)=>{
  try{
    const adjuntos=[];
    for(const file of req.files){
      const r=await query('INSERT INTO adjuntos(id,ticket_id,nombre_original,nombre_almacenado,url,mime_type,tamano_bytes,subido_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [uuidv4(),req.params.id,file.originalname,file.filename,`/uploads/${file.filename}`,file.mimetype,file.size,req.user.id]);
      adjuntos.push(r.rows[0]);
    }
    res.json(adjuntos);
  }catch(e){res.status(500).json({error:'Error al subir adjuntos'});}
});

// USUARIOS
router.get('/usuarios', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const {rol}=req.query;
    let sql=`SELECT id,nombre,apellido,email,rol,activo,telefono,ultimo_acceso,avatar_url,creado_en FROM usuarios WHERE tenant_id=$1`;
    const params=[req.tenantId];
    if(rol){sql+=` AND rol=$2`;params.push(rol);}
    sql+=' ORDER BY rol,nombre';
    res.json((await query(sql,params)).rows);
  }catch(e){res.status(500).json({error:'Error al obtener usuarios'});}
});
router.get('/usuarios/:id', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const r=await query('SELECT id,nombre,apellido,email,rol,activo,telefono,creado_en FROM usuarios WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'Usuario no encontrado'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error'});}
});
router.post('/usuarios', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const bcrypt=require('bcryptjs');
    const {nombre,apellido,email,rol,password,telefono}=req.body;
    if(!nombre||!email||!password||!rol) return res.status(400).json({error:'Nombre, email, contraseña y rol son requeridos'});
    if(!['admin','supervisor','agente','cliente'].includes(rol)) return res.status(400).json({error:'Rol inválido'});
    const r=await query('INSERT INTO usuarios(id,tenant_id,nombre,apellido,email,password_hash,rol,telefono) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,nombre,apellido,email,rol,activo,telefono,creado_en',
      [uuidv4(),req.tenantId,nombre.trim(),apellido?.trim()||'',email.toLowerCase().trim(),await bcrypt.hash(password,12),rol,telefono||null]);
    res.status(201).json(r.rows[0]);
  }catch(e){
    if(e.code==='23505') return res.status(409).json({error:'Email ya registrado'});
    res.status(500).json({error:'Error al crear usuario'});
  }
});
router.put('/usuarios/:id', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const {nombre,apellido,rol,activo,telefono}=req.body;
    const r=await query('UPDATE usuarios SET nombre=COALESCE($1,nombre),apellido=COALESCE($2,apellido),rol=COALESCE($3,rol),activo=COALESCE($4,activo),telefono=COALESCE($5,telefono) WHERE id=$6 AND tenant_id=$7 RETURNING id,nombre,apellido,email,rol,activo,telefono',
      [nombre,apellido,rol,activo,telefono,req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'Usuario no encontrado'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error al actualizar usuario'});}
});
router.patch('/usuarios/:id/password', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const bcrypt=require('bcryptjs');
    const {password}=req.body;
    if(!password||password.length<8) return res.status(400).json({error:'Mínimo 8 caracteres'});
    await query('UPDATE usuarios SET password_hash=$1 WHERE id=$2 AND tenant_id=$3',[await bcrypt.hash(password,12),req.params.id,req.tenantId]);
    res.json({mensaje:'Contraseña actualizada'});
  }catch(e){res.status(500).json({error:'Error'});}
});
router.delete('/usuarios/:id', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    if(req.params.id===req.user.id) return res.status(400).json({error:'No puedes desactivar tu propia cuenta'});
    await query('UPDATE usuarios SET activo=FALSE WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId]);
    res.json({mensaje:'Usuario desactivado'});
  }catch(e){res.status(500).json({error:'Error'});}
});

// EMPRESAS - CRUD COMPLETO
router.get('/empresas', authMiddleware, async(req,res)=>{
  try{
    const r=await query(`SELECT e.*,u.nombre||' '||u.apellido AS ejecutivo_nombre,
      COUNT(t.id) AS total_tickets,
      COUNT(CASE WHEN t.estado NOT IN('cerrado','cancelado') THEN 1 END) AS tickets_abiertos
      FROM empresas e LEFT JOIN usuarios u ON e.ejecutivo_id=u.id LEFT JOIN tickets t ON t.empresa_id=e.id
      WHERE e.tenant_id=$1 GROUP BY e.id,u.nombre,u.apellido ORDER BY e.nombre`,[req.tenantId]);
    res.json(r.rows);
  }catch(e){res.status(500).json({error:'Error al obtener empresas'});}
});
router.get('/empresas/:id', authMiddleware, async(req,res)=>{
  try{
    const e=await query(`SELECT e.*,u.nombre||' '||u.apellido AS ejecutivo_nombre FROM empresas e LEFT JOIN usuarios u ON e.ejecutivo_id=u.id WHERE e.id=$1 AND e.tenant_id=$2`,[req.params.id,req.tenantId]);
    if(!e.rows.length) return res.status(404).json({error:'No encontrada'});
    const contactos=await query(`SELECT u.id,u.nombre,u.apellido,u.email,u.telefono FROM usuarios u JOIN usuario_empresa ue ON u.id=ue.usuario_id WHERE ue.empresa_id=$1`,[req.params.id]);
    const tickets=await query(`SELECT id,CONCAT('TK-',LPAD(numero::TEXT,4,'0')) AS codigo,asunto,estado,prioridad,creado_en FROM tickets WHERE empresa_id=$1 ORDER BY creado_en DESC LIMIT 10`,[req.params.id]);
    res.json({...e.rows[0],contactos:contactos.rows,tickets_recientes:tickets.rows});
  }catch(e){res.status(500).json({error:'Error'});}
});
router.post('/empresas', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const {nombre,ruc,email,telefono,direccion,plan,ejecutivo_id}=req.body;
    if(!nombre) return res.status(400).json({error:'El nombre es requerido'});
    const r=await query('INSERT INTO empresas(id,tenant_id,nombre,ruc,email,telefono,direccion,plan,ejecutivo_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [uuidv4(),req.tenantId,nombre.trim(),ruc||null,email||null,telefono||null,direccion||null,plan||'starter',ejecutivo_id||null]);
    res.status(201).json(r.rows[0]);
  }catch(e){
    if(e.code==='23505') return res.status(409).json({error:'Ya existe empresa con ese RUC'});
    res.status(500).json({error:'Error al crear empresa'});
  }
});
router.put('/empresas/:id', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const {nombre,ruc,email,telefono,direccion,plan,activo,ejecutivo_id}=req.body;
    const r=await query('UPDATE empresas SET nombre=COALESCE($1,nombre),ruc=COALESCE($2,ruc),email=COALESCE($3,email),telefono=COALESCE($4,telefono),direccion=COALESCE($5,direccion),plan=COALESCE($6,plan),activo=COALESCE($7,activo),ejecutivo_id=COALESCE($8,ejecutivo_id) WHERE id=$9 AND tenant_id=$10 RETURNING *',
      [nombre,ruc,email,telefono,direccion,plan,activo,ejecutivo_id,req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'No encontrada'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error al actualizar empresa'});}
});
router.delete('/empresas/:id', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const t=await query('SELECT COUNT(*) FROM tickets WHERE empresa_id=$1',[req.params.id]);
    if(parseInt(t.rows[0].count)>0){
      await query('UPDATE empresas SET activo=FALSE WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId]);
      return res.json({mensaje:'Empresa desactivada (tiene tickets asociados)'});
    }
    await query('DELETE FROM empresas WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId]);
    res.json({mensaje:'Empresa eliminada'});
  }catch(e){res.status(500).json({error:'Error al eliminar empresa'});}
});
router.post('/empresas/:id/contactos', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    await query('INSERT INTO usuario_empresa(usuario_id,empresa_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.body.usuario_id,req.params.id]);
    res.json({mensaje:'Contacto asociado'});
  }catch(e){res.status(500).json({error:'Error'});}
});
router.delete('/empresas/:id/contactos/:uid', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    await query('DELETE FROM usuario_empresa WHERE usuario_id=$1 AND empresa_id=$2',[req.params.uid,req.params.id]);
    res.json({mensaje:'Contacto desvinculado'});
  }catch(e){res.status(500).json({error:'Error'});}
});

// CATEGORÍAS
router.get('/categorias', authMiddleware, async(req,res)=>{
  try{res.json((await query('SELECT c.*,p.nombre AS parent_nombre FROM categorias c LEFT JOIN categorias p ON c.parent_id=p.id WHERE c.tenant_id=$1 AND c.activo=TRUE ORDER BY c.orden,c.nombre',[req.tenantId])).rows);}
  catch(e){res.status(500).json({error:'Error'});}
});
router.post('/categorias', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const {nombre,descripcion,icono,color,parent_id,area_responsable}=req.body;
    if(!nombre) return res.status(400).json({error:'Nombre requerido'});
    const r=await query('INSERT INTO categorias(id,tenant_id,nombre,descripcion,icono,color,parent_id,area_responsable) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuidv4(),req.tenantId,nombre.trim(),descripcion||null,icono||null,color||null,parent_id||null,area_responsable||null]);
    res.status(201).json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error al crear categoría'});}
});
router.put('/categorias/:id', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{
    const {nombre,descripcion,icono,color,area_responsable,activo}=req.body;
    const r=await query('UPDATE categorias SET nombre=COALESCE($1,nombre),descripcion=COALESCE($2,descripcion),icono=COALESCE($3,icono),color=COALESCE($4,color),area_responsable=COALESCE($5,area_responsable),activo=COALESCE($6,activo) WHERE id=$7 AND tenant_id=$8 RETURNING *',
      [nombre,descripcion,icono,color,area_responsable,activo,req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'No encontrada'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error'});}
});
router.delete('/categorias/:id', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{await query('UPDATE categorias SET activo=FALSE WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId]);res.json({mensaje:'Categoría desactivada'});}
  catch(e){res.status(500).json({error:'Error'});}
});

// SLA
router.get('/sla', authMiddleware, async(req,res)=>{
  try{res.json((await query("SELECT * FROM sla_politicas WHERE tenant_id=$1 AND activo=TRUE ORDER BY CASE prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END",[req.tenantId])).rows);}
  catch(e){res.status(500).json({error:'Error'});}
});
router.put('/sla/:id', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const {nombre,tiempo_primera_respuesta_min,tiempo_resolucion_min,horario,notificar_en_pct}=req.body;
    const r=await query('UPDATE sla_politicas SET nombre=COALESCE($1,nombre),tiempo_primera_respuesta_min=COALESCE($2,tiempo_primera_respuesta_min),tiempo_resolucion_min=COALESCE($3,tiempo_resolucion_min),horario=COALESCE($4,horario),notificar_en_pct=COALESCE($5,notificar_en_pct) WHERE id=$6 AND tenant_id=$7 RETURNING *',
      [nombre,tiempo_primera_respuesta_min,tiempo_resolucion_min,horario,notificar_en_pct,req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'No encontrado'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error'});}
});

// KB — con adjuntos de archivos
router.get('/kb', authMiddleware, async(req,res)=>{
  try{
    const {estado,buscar}=req.query;
    const est=req.user.rol==='cliente'?'publicado':(estado||'publicado');
    let sql=`SELECT ka.*,c.nombre AS categoria_nombre,u.nombre||' '||u.apellido AS autor_nombre FROM kb_articulos ka LEFT JOIN categorias c ON ka.categoria_id=c.id LEFT JOIN usuarios u ON ka.autor_id=u.id WHERE ka.tenant_id=$1 AND ka.estado=$2`;
    const params=[req.tenantId,est];
    if(buscar){sql+=` AND(ka.titulo ILIKE $3 OR ka.resumen ILIKE $3 OR ka.contenido ILIKE $3)`;params.push(`%${buscar}%`);}
    sql+=' ORDER BY ka.creado_en DESC';
    res.json((await query(sql,params)).rows);
  }catch(e){res.status(500).json({error:'Error'});}
});
router.get('/kb/:id', authMiddleware, async(req,res)=>{
  try{
    const r=await query(`SELECT ka.*,c.nombre AS categoria_nombre,u.nombre||' '||u.apellido AS autor_nombre FROM kb_articulos ka LEFT JOIN categorias c ON ka.categoria_id=c.id LEFT JOIN usuarios u ON ka.autor_id=u.id WHERE ka.id=$1 AND ka.tenant_id=$2`,[req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'No encontrado'});
    await query('UPDATE kb_articulos SET vistas=vistas+1 WHERE id=$1',[req.params.id]);
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error'});}
});
router.post('/kb', authMiddleware, requireRol('admin','supervisor','agente'), async(req,res)=>{
  try{
    const {titulo,contenido,resumen,categoria_id,estado,tags}=req.body;
    if(!titulo||!contenido) return res.status(400).json({error:'Título y contenido son requeridos'});
    const slug=titulo.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'-').slice(0,100);
    const r=await query('INSERT INTO kb_articulos(id,tenant_id,titulo,contenido,resumen,categoria_id,autor_id,estado,tags,slug) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [uuidv4(),req.tenantId,titulo.trim(),contenido,resumen||null,categoria_id||null,req.user.id,estado||'borrador',tags||[],slug]);
    res.status(201).json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error al crear artículo'});}
});
// Adjuntos para KB (documentos)
router.post('/kb/:id/adjuntos', authMiddleware, requireRol('admin','supervisor','agente'), upload.array('archivos',5), async(req,res)=>{
  try{
    const adjuntos=[];
    for(const file of req.files){
      const r=await query('INSERT INTO adjuntos(id,nombre_original,nombre_almacenado,url,mime_type,tamano_bytes,subido_por) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [uuidv4(),file.originalname,file.filename,`/uploads/${file.filename}`,file.mimetype,file.size,req.user.id]);
      adjuntos.push(r.rows[0]);
    }
    // Guardar referencia en el artículo
    const meta=await query('SELECT metadatos FROM kb_articulos WHERE id=$1',[req.params.id]);
    const existentes=(meta.rows[0]?.metadatos?.adjuntos)||[];
    await query('UPDATE kb_articulos SET metadatos=$1 WHERE id=$2',[JSON.stringify({adjuntos:[...existentes,...adjuntos.map(a=>({id:a.id,nombre:a.nombre_original,url:a.url,mime:a.mime_type,tamano:a.tamano_bytes}))]}),req.params.id]);
    res.json(adjuntos);
  }catch(e){res.status(500).json({error:'Error al subir adjuntos'});}
});
router.put('/kb/:id', authMiddleware, requireRol('admin','supervisor','agente'), async(req,res)=>{
  try{
    const {titulo,contenido,resumen,categoria_id,estado,tags}=req.body;
    const r=await query('UPDATE kb_articulos SET titulo=COALESCE($1,titulo),contenido=COALESCE($2,contenido),resumen=COALESCE($3,resumen),categoria_id=COALESCE($4,categoria_id),estado=COALESCE($5,estado),tags=COALESCE($6,tags),actualizado_en=NOW() WHERE id=$7 AND tenant_id=$8 RETURNING *',
      [titulo,contenido,resumen,categoria_id,estado,tags,req.params.id,req.tenantId]);
    if(!r.rows.length) return res.status(404).json({error:'No encontrado'});
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error'});}
});
router.delete('/kb/:id', authMiddleware, requireRol('admin','supervisor'), async(req,res)=>{
  try{await query("UPDATE kb_articulos SET estado='archivado' WHERE id=$1 AND tenant_id=$2",[req.params.id,req.tenantId]);res.json({mensaje:'Artículo archivado'});}
  catch(e){res.status(500).json({error:'Error'});}
});
router.post('/kb/:id/util', authMiddleware, async(req,res)=>{
  try{const col=req.body.util?'util_si':'util_no';await query(`UPDATE kb_articulos SET ${col}=${col}+1 WHERE id=$1`,[req.params.id]);res.json({ok:true});}
  catch(e){res.status(500).json({error:'Error'});}
});

// NOTIFICACIONES
router.get('/notificaciones', authMiddleware, async(req,res)=>{
  try{res.json((await query("SELECT n.*,CONCAT('TK-',LPAD(t.numero::TEXT,4,'0')) AS ticket_codigo FROM notificaciones n LEFT JOIN tickets t ON n.ticket_id=t.id WHERE n.usuario_id=$1 ORDER BY n.creado_en DESC LIMIT 30",[req.user.id])).rows);}
  catch(e){res.status(500).json({error:'Error'});}
});
router.patch('/notificaciones/leer-todas', authMiddleware, async(req,res)=>{
  try{await query('UPDATE notificaciones SET leida=TRUE WHERE usuario_id=$1',[req.user.id]);res.json({ok:true});}
  catch(e){res.status(500).json({error:'Error'});}
});
router.patch('/notificaciones/:id/leer', authMiddleware, async(req,res)=>{
  try{await query('UPDATE notificaciones SET leida=TRUE WHERE id=$1 AND usuario_id=$2',[req.params.id,req.user.id]);res.json({ok:true});}
  catch(e){res.status(500).json({error:'Error'});}
});

// REPORTES
router.get('/reportes/general', authMiddleware, requireRol('admin','supervisor'), reportesCtrl.reporteGeneral);
router.get('/reportes/sla', authMiddleware, requireRol('admin','supervisor'), reportesCtrl.reporteSLA);

// CONFIG TENANT + HORARIO
router.get('/config', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{res.json((await query('SELECT * FROM tenants WHERE id=$1',[req.tenantId])).rows[0]);}
  catch(e){res.status(500).json({error:'Error'});}
});
router.put('/config', authMiddleware, requireRol('admin'), async(req,res)=>{
  try{
    const {nombre,email_soporte,configuracion}=req.body;
    const r=await query('UPDATE tenants SET nombre=COALESCE($1,nombre),email_soporte=COALESCE($2,email_soporte),configuracion=COALESCE($3::jsonb,configuracion) WHERE id=$4 RETURNING *',
      [nombre,email_soporte,configuracion?JSON.stringify(configuracion):null,req.tenantId]);
    res.json(r.rows[0]);
  }catch(e){res.status(500).json({error:'Error al guardar'});}
});

// HORARIO DE ATENCIÓN (público - para clientes)
router.get('/horario', async(req,res)=>{
  try{
    // Buscar tenant por dominio o usar el primero
    const tenantId = process.env.DEFAULT_TENANT_ID;
    const r=await query('SELECT configuracion FROM tenants WHERE id=$1',[tenantId]);
    const config=r.rows[0]?.configuracion||{};
    res.json(config.horario_atencion||{
      lunes:{activo:true,desde:'08:00',hasta:'18:00'},
      martes:{activo:true,desde:'08:00',hasta:'18:00'},
      miercoles:{activo:true,desde:'08:00',hasta:'18:00'},
      jueves:{activo:true,desde:'08:00',hasta:'18:00'},
      viernes:{activo:true,desde:'08:00',hasta:'18:00'},
      sabado:{activo:false,desde:'09:00',hasta:'13:00'},
      domingo:{activo:false,desde:'',hasta:''},
      zona_horaria:'America/Lima',
      mensaje_fuera_horario:'Estamos fuera del horario de atención. Te responderemos el próximo día hábil.',
      telefono_urgencias:''
    });
  }catch(e){res.status(500).json({error:'Error'});}
});

module.exports = router;
