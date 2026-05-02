require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./config/logger');
const socketService = require('./services/socketService');
const { iniciarCronJobs } = require('./services/cronService');
const routes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST'] }
});
socketService.init(io);

io.on('connection', (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);
  socket.on('unirse:tenant', (tenantId) => socket.join(`tenant:${tenantId}`));
  socket.on('unirse:ticket', (ticketId) => socket.join(`ticket:${ticketId}`));
  socket.on('disconnect', () => logger.info(`Socket desconectado: ${socket.id}`));
});

// Crear directorios necesarios
['./logs','./uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middlewares de seguridad
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Demasiadas peticiones' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Demasiados intentos de login' });
app.use('/api/auth/login', authLimiter);
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV
}));

// SPA fallback (si el frontend está en /public)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ mensaje: 'Magus Help Desk API', version: '1.0.0', docs: '/api' });
  }
});

// Error handler global
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`🚀 Magus Help Desk API corriendo en puerto ${PORT}`);
  logger.info(`📊 Entorno: ${process.env.NODE_ENV}`);
  iniciarCronJobs();
});

module.exports = { app, server };
