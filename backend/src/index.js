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
const waService = require('./services/whatsappService');
const routes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST'] }
});
socketService.init(io);

io.on('connection', (socket) => {
  socket.on('unirse:tenant', (tenantId) => socket.join(`tenant:${tenantId}`));
  socket.on('unirse:ticket', (ticketId) => socket.join(`ticket:${ticketId}`));
});

// Directorios necesarios
['./logs','./uploads','./wwebjs_auth'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Seguridad
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(compression());

const limiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 15 });
app.use('/api/auth/login', authLimiter);
app.use('/api', limiter);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// API
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  whatsapp: waService.getEstado(),
  timestamp: new Date().toISOString()
}));

// Endpoint para obtener QR de WhatsApp (admin only - protegido por middleware en routes)
app.get('/api/whatsapp/qr', (req, res) => {
  const qr = waService.getQR();
  const estado = waService.getEstado();
  res.json({ ...estado, qr });
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.json({ api: 'Magus Help Desk', v: '1.0.0' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno' : err.message
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`🚀 Magus Help Desk API en puerto ${PORT} [${process.env.NODE_ENV}]`);
  iniciarCronJobs();
  // Iniciar WhatsApp si está habilitado
  waService.iniciarWhatsApp().catch(e => logger.error('WA init error:', e.message));
});

module.exports = { app, server };
