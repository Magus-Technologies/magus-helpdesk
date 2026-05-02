# 🚀 Magus Help Desk — Guía de Instalación
## magus-ecommerce.com

---

## REQUISITOS DEL SERVIDOR

- Ubuntu 22.04 LTS (recomendado)
- Node.js 18+
- PostgreSQL 15+
- Nginx
- PM2 (process manager)
- Certbot (SSL Let's Encrypt)

---

## PASO 1 — Instalar dependencias del servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 (gestor de procesos Node)
sudo npm install -g pm2

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## PASO 2 — Crear base de datos PostgreSQL

```bash
sudo -u postgres psql

-- Dentro de psql:
CREATE USER magus_user WITH PASSWORD 'TU_PASSWORD_SEGURO';
CREATE DATABASE magus_helpdesk OWNER magus_user;
GRANT ALL PRIVILEGES ON DATABASE magus_helpdesk TO magus_user;
\q

# Aplicar el schema
psql -U magus_user -d magus_helpdesk -f /ruta/al/database/schema.sql
```

---

## PASO 3 — Subir y configurar el proyecto

```bash
# Crear directorio
sudo mkdir -p /var/www/magus-helpdesk
sudo chown $USER:$USER /var/www/magus-helpdesk

# Subir los archivos por SFTP/SCP o clonar desde git
# scp -r magus-helpdesk/* usuario@tu-servidor:/var/www/magus-helpdesk/

# Ir al backend
cd /var/www/magus-helpdesk/backend

# Configurar variables de entorno
cp .env.example .env
nano .env
# Completar: DB_PASSWORD, JWT_SECRET, SMTP_PASS, etc.

# Instalar dependencias backend
npm install --production

# Crear carpeta de uploads y logs
mkdir -p uploads logs
```

---

## PASO 4 — Build del frontend

```bash
cd /var/www/magus-helpdesk/frontend

# Instalar dependencias
npm install

# Build (genera archivos en backend/public)
npm run build

# Verificar que se creó backend/public/index.html
ls /var/www/magus-helpdesk/backend/public/
```

---

## PASO 5 — Configurar Nginx

```bash
# Copiar configuración
sudo cp /var/www/magus-helpdesk/nginx.conf /etc/nginx/sites-available/magus-helpdesk

# Activar sitio
sudo ln -s /etc/nginx/sites-available/magus-helpdesk /etc/nginx/sites-enabled/

# Quitar sitio default si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Primero activar sin SSL (comentar bloque HTTPS y las líneas ssl_*)
# Luego obtener certificado:
sudo certbot --nginx -d magus-ecommerce.com -d www.magus-ecommerce.com

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## PASO 6 — Iniciar la aplicación con PM2

```bash
cd /var/www/magus-helpdesk

# Iniciar
pm2 start ecosystem.config.js --env production

# Guardar para que reinicie al reboot
pm2 save
pm2 startup

# Ver logs
pm2 logs magus-helpdesk

# Ver status
pm2 status
```

---

## PASO 7 — Verificar instalación

```bash
# API health check
curl https://magus-ecommerce.com/health

# Test login
curl -X POST https://magus-ecommerce.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@magus-ecommerce.com","password":"Admin2024!"}'
```

---

## CREDENCIALES INICIALES

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Carlos Admin | admin@magus-ecommerce.com | Admin2024! | admin |
| María González | maria@magus-ecommerce.com | Agente2024! | agente |
| Pedro Salinas | pedro@magus-ecommerce.com | Agente2024! | agente |

⚠️ **IMPORTANTE: Cambiar todas las contraseñas inmediatamente después del primer login.**

---

## ESTRUCTURA DEL PROYECTO

```
magus-helpdesk/
├── backend/
│   ├── src/
│   │   ├── index.js              ← Servidor principal
│   │   ├── config/
│   │   │   ├── database.js       ← Conexión PostgreSQL
│   │   │   └── logger.js         ← Winston logs
│   │   ├── middleware/
│   │   │   └── auth.js           ← JWT + roles
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── ticketsController.js
│   │   │   └── reportesController.js
│   │   ├── routes/
│   │   │   └── api.js            ← Todas las rutas
│   │   └── services/
│   │       ├── emailService.js   ← Nodemailer
│   │       ├── socketService.js  ← Socket.io
│   │       └── cronService.js    ← Cron jobs
│   ├── uploads/                  ← Archivos adjuntos
│   ├── logs/                     ← Logs del servidor
│   ├── public/                   ← Frontend compilado
│   └── .env                      ← Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── App.jsx               ← Router principal
│   │   ├── components/
│   │   │   └── Layout.jsx        ← Sidebar + topbar
│   │   ├── pages/                ← Todas las páginas
│   │   ├── hooks/
│   │   │   └── useAuthStore.js   ← Zustand auth
│   │   ├── utils/
│   │   │   └── api.js            ← Axios client
│   │   └── styles/
│   │       └── global.css
│   └── index.html
├── database/
│   └── schema.sql                ← BD completa + seed
├── nginx.conf                    ← Config Nginx
├── ecosystem.config.js           ← PM2 config
└── README.md
```

---

## ENDPOINTS API PRINCIPALES

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/dashboard | Stats dashboard |
| GET | /api/tickets | Listar tickets |
| POST | /api/tickets | Crear ticket |
| GET | /api/tickets/:id | Ver ticket |
| PATCH | /api/tickets/:id | Actualizar ticket |
| POST | /api/tickets/:id/comentarios | Agregar respuesta |
| GET | /api/reportes/general | Reporte general |
| GET | /api/reportes/sla | Reporte SLA |
| GET | /api/usuarios | Listar usuarios |
| POST | /api/usuarios | Crear usuario |
| GET | /api/categorias | Listar categorías |
| GET | /api/sla | Políticas SLA |

---

## BACKUP BASE DE DATOS

```bash
# Backup manual
pg_dump -U magus_user magus_helpdesk > backup_$(date +%Y%m%d).sql

# Backup automático (crontab)
crontab -e
# Agregar:
0 2 * * * pg_dump -U magus_user magus_helpdesk > /backups/magus_$(date +\%Y\%m\%d).sql
```

---

## SOPORTE

Para soporte técnico en la instalación: soporte@magus-ecommerce.com
pm2 restart magus-helpdesk
