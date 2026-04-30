const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar sesión activa en DB
    const sesion = await query(
      'SELECT * FROM sesiones WHERE token = $1 AND activa = TRUE AND expira_en > NOW()',
      [token]
    );
    if (sesion.rows.length === 0) {
      return res.status(401).json({ error: 'Sesión expirada o inválida' });
    }

    const usuario = await query(
      'SELECT id, tenant_id, nombre, apellido, email, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );
    if (usuario.rows.length === 0 || !usuario.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.user = usuario.rows[0];
    req.tenantId = usuario.rows[0].tenant_id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    next(err);
  }
};

const requireRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
  }
  next();
};

module.exports = { authMiddleware, requireRol };
