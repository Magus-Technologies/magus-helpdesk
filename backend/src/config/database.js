const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'magus_helpdesk',
  user: process.env.DB_USER || 'magus_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => logger.info('Nueva conexión DB establecida'));
pool.on('error', (err) => logger.error('Error pool DB:', err));

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) logger.warn(`Query lenta (${duration}ms): ${text}`);
    return res;
  } catch (err) {
    logger.error('Error query DB:', { text, params, error: err.message });
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
