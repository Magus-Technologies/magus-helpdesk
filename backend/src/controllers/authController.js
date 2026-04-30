const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const logger = require('../config/logger');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const result = await query(
      `SELECT u.*, t.nombre as tenant_nombre, t.plan as tenant_plan
       FROM usuarios u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.activo = TRUE`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { userId: usuario.id, tenantId: usuario.tenant_id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const refreshToken = jwt.sign(
      { userId: usuario.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    const expira = new Date();
    expira.setHours(expira.getHours() + 8);

    await query(
      `INSERT INTO sesiones (id, usuario_id, token, refresh_token, ip_address, user_agent, expira_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), usuario.id, token, refreshToken,
       req.ip, req.headers['user-agent'], expira]
    );

    await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [usuario.id]);

    logger.info(`Login exitoso: ${email} (${usuario.rol})`);

    res.json({
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        avatar_url: usuario.avatar_url,
        tenant: { nombre: usuario.tenant_nombre, plan: usuario.tenant_plan }
      }
    });
  } catch (err) {
    logger.error('Error login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      await query('UPDATE sesiones SET activa = FALSE WHERE token = $1', [token]);
    }
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

const me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.avatar_url, u.telefono,
              t.nombre as tenant_nombre, t.plan as tenant_plan, t.logo_url
       FROM usuarios u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

module.exports = { login, logout, me };
