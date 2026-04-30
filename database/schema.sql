-- ============================================================
-- MAGUS HELP DESK - Base de datos PostgreSQL
-- Versión: 1.0 | magus-ecommerce.com
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================
-- TENANTS (Multiempresa)
-- ============================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    dominio VARCHAR(100) UNIQUE,
    logo_url TEXT,
    email_soporte VARCHAR(150),
    plan VARCHAR(30) DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
    activo BOOLEAN DEFAULT TRUE,
    configuracion JSONB DEFAULT '{}',
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USUARIOS Y ROLES
-- ============================================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('admin','supervisor','agente','cliente')),
    avatar_url TEXT,
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    preferencias JSONB DEFAULT '{}',
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_usuarios_tenant ON usuarios(tenant_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================================
-- EMPRESAS CLIENTE
-- ============================================================
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    ruc VARCHAR(20),
    email VARCHAR(150),
    telefono VARCHAR(30),
    direccion TEXT,
    plan VARCHAR(30) DEFAULT 'starter',
    ejecutivo_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    metadatos JSONB DEFAULT '{}',
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_empresas_tenant ON empresas(tenant_id);

-- Relacion usuarios-empresa (cliente puede pertenecer a empresa)
CREATE TABLE usuario_empresa (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, empresa_id)
);

-- ============================================================
-- CATEGORIAS Y SUBCATEGORIAS
-- ============================================================
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20),
    parent_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    area_responsable VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categorias_tenant ON categorias(tenant_id);
CREATE INDEX idx_categorias_parent ON categorias(parent_id);

-- ============================================================
-- SLA - ACUERDOS DE NIVEL DE SERVICIO
-- ============================================================
CREATE TABLE sla_politicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('baja','media','alta','critica')),
    tiempo_primera_respuesta_min INT NOT NULL,  -- en minutos
    tiempo_resolucion_min INT NOT NULL,          -- en minutos
    horario VARCHAR(30) DEFAULT 'horario_laboral' CHECK (horario IN ('24_7','horario_laboral','personalizado')),
    horario_inicio TIME,
    horario_fin TIME,
    dias_habiles JSONB DEFAULT '[1,2,3,4,5]',   -- 1=lunes..7=domingo
    notificar_en_pct INT DEFAULT 80,             -- % consumido del SLA para alertar
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sla_tenant ON sla_politicas(tenant_id);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    numero SERIAL,                               -- numero legible TK-XXXX
    asunto VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'nuevo'
        CHECK (estado IN ('nuevo','asignado','en_progreso','en_espera_cliente',
                          'en_espera_interno','resuelto','cerrado','cancelado')),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media'
        CHECK (prioridad IN ('baja','media','alta','critica')),
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    subcategoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    agente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    sla_id UUID REFERENCES sla_politicas(id) ON DELETE SET NULL,
    sla_primera_respuesta_limite TIMESTAMP,
    sla_resolucion_limite TIMESTAMP,
    sla_primera_respuesta_ok BOOLEAN,
    sla_resolucion_ok BOOLEAN,
    primera_respuesta_en TIMESTAMP,
    resuelto_en TIMESTAMP,
    cerrado_en TIMESTAMP,
    tiempo_trabajado_min INT DEFAULT 0,
    canal_origen VARCHAR(30) DEFAULT 'portal'
        CHECK (canal_origen IN ('portal','email','whatsapp','telefono','api')),
    tags TEXT[],
    metadatos JSONB DEFAULT '{}',
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX idx_tickets_agente ON tickets(agente_id);
CREATE INDEX idx_tickets_cliente ON tickets(cliente_id);
CREATE INDEX idx_tickets_empresa ON tickets(empresa_id);
CREATE INDEX idx_tickets_creado ON tickets(creado_en);
CREATE INDEX idx_tickets_sla_limite ON tickets(sla_resolucion_limite);

-- Secuencia de numeración por tenant
CREATE SEQUENCE ticket_numero_seq;

-- ============================================================
-- COMENTARIOS / RESPUESTAS
-- ============================================================
CREATE TABLE ticket_comentarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    contenido TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'publico' CHECK (tipo IN ('publico','interno','sistema')),
    adjuntos JSONB DEFAULT '[]',
    editado BOOLEAN DEFAULT FALSE,
    editado_en TIMESTAMP,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comentarios_ticket ON ticket_comentarios(ticket_id);
CREATE INDEX idx_comentarios_autor ON ticket_comentarios(autor_id);

-- ============================================================
-- ADJUNTOS
-- ============================================================
CREATE TABLE adjuntos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    comentario_id UUID REFERENCES ticket_comentarios(id) ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenado VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mime_type VARCHAR(100),
    tamano_bytes BIGINT,
    subido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_adjuntos_ticket ON adjuntos(ticket_id);

-- ============================================================
-- HISTORIAL DE CAMBIOS (AUDITORÍA)
-- ============================================================
CREATE TABLE ticket_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    campo VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    ip_address INET,
    user_agent TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_historial_ticket ON ticket_historial(ticket_id);
CREATE INDEX idx_historial_creado ON ticket_historial(creado_en);

-- ============================================================
-- TIEMPO TRABAJADO POR AGENTE
-- ============================================================
CREATE TABLE tiempo_trabajado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    inicio TIMESTAMP NOT NULL,
    fin TIMESTAMP,
    duracion_min INT,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tiempo_ticket ON tiempo_trabajado(ticket_id);
CREATE INDEX idx_tiempo_agente ON tiempo_trabajado(agente_id);

-- ============================================================
-- ENCUESTAS DE SATISFACCIÓN
-- ============================================================
CREATE TABLE encuestas_satisfaccion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE UNIQUE,
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    respondida BOOLEAN DEFAULT FALSE,
    token VARCHAR(100) UNIQUE,           -- token para link de encuesta
    enviada_en TIMESTAMP,
    respondida_en TIMESTAMP,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_encuestas_ticket ON encuestas_satisfaccion(ticket_id);
CREATE INDEX idx_encuestas_token ON encuestas_satisfaccion(token);

-- ============================================================
-- BASE DE CONOCIMIENTO
-- ============================================================
CREATE TABLE kb_articulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    resumen TEXT,
    autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','archivado')),
    vistas INT DEFAULT 0,
    util_si INT DEFAULT 0,
    util_no INT DEFAULT 0,
    tags TEXT[],
    slug VARCHAR(255),
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kb_tenant ON kb_articulos(tenant_id);
CREATE INDEX idx_kb_estado ON kb_articulos(estado);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    canal VARCHAR(20) DEFAULT 'app' CHECK (canal IN ('app','email','whatsapp')),
    enviada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notif_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notif_leida ON notificaciones(leida);

-- ============================================================
-- REGLAS DE AUTOMATIZACIÓN
-- ============================================================
CREATE TABLE automatizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    evento VARCHAR(50) NOT NULL,   -- ticket_creado, sla_por_vencer, etc.
    condiciones JSONB DEFAULT '[]',
    acciones JSONB DEFAULT '[]',
    orden INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_tenant ON automatizaciones(tenant_id);

-- ============================================================
-- SESIONES / TOKENS
-- ============================================================
CREATE TABLE sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    activa BOOLEAN DEFAULT TRUE,
    expira_en TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sesiones_token ON sesiones(token);
CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualiza campo actualizado_en automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_updated
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Registra historial automático al cambiar estado del ticket
CREATE OR REPLACE FUNCTION log_ticket_cambio()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO ticket_historial(ticket_id, accion, campo, valor_anterior, valor_nuevo)
        VALUES(NEW.id, 'cambio_estado', 'estado', OLD.estado, NEW.estado);
    END IF;
    IF OLD.agente_id IS DISTINCT FROM NEW.agente_id THEN
        INSERT INTO ticket_historial(ticket_id, accion, campo, valor_anterior, valor_nuevo)
        VALUES(NEW.id, 'reasignacion', 'agente_id', OLD.agente_id::TEXT, NEW.agente_id::TEXT);
    END IF;
    IF OLD.prioridad IS DISTINCT FROM NEW.prioridad THEN
        INSERT INTO ticket_historial(ticket_id, accion, campo, valor_anterior, valor_nuevo)
        VALUES(NEW.id, 'cambio_prioridad', 'prioridad', OLD.prioridad, NEW.prioridad);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_historial
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION log_ticket_cambio();

-- Calcula SLA al crear ticket
CREATE OR REPLACE FUNCTION calcular_sla_ticket()
RETURNS TRIGGER AS $$
DECLARE
    sla RECORD;
BEGIN
    SELECT * INTO sla FROM sla_politicas
    WHERE tenant_id = NEW.tenant_id AND prioridad = NEW.prioridad AND activo = TRUE
    LIMIT 1;
    IF sla IS NOT NULL THEN
        NEW.sla_id := sla.id;
        IF sla.horario = '24_7' THEN
            NEW.sla_primera_respuesta_limite := NOW() + (sla.tiempo_primera_respuesta_min || ' minutes')::INTERVAL;
            NEW.sla_resolucion_limite := NOW() + (sla.tiempo_resolucion_min || ' minutes')::INTERVAL;
        ELSE
            -- Horario laboral (simplificado, ajustar según zona horaria)
            NEW.sla_primera_respuesta_limite := NOW() + (sla.tiempo_primera_respuesta_min || ' minutes')::INTERVAL;
            NEW.sla_resolucion_limite := NOW() + (sla.tiempo_resolucion_min || ' minutes')::INTERVAL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_sla
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION calcular_sla_ticket();

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

CREATE VIEW v_tickets_dashboard AS
SELECT
    t.id, t.tenant_id,
    CONCAT('TK-', LPAD(t.numero::TEXT, 4, '0')) AS codigo,
    t.asunto, t.estado, t.prioridad,
    t.creado_en, t.sla_resolucion_limite,
    CASE WHEN t.sla_resolucion_limite < NOW() AND t.estado NOT IN ('resuelto','cerrado')
         THEN TRUE ELSE FALSE END AS sla_vencido,
    ROUND(EXTRACT(EPOCH FROM (t.sla_resolucion_limite - t.creado_en))/60) AS sla_total_min,
    ROUND(EXTRACT(EPOCH FROM (NOW() - t.creado_en))/60) AS tiempo_abierto_min,
    u_cli.nombre || ' ' || u_cli.apellido AS cliente_nombre,
    e.nombre AS empresa_nombre,
    u_agt.nombre || ' ' || u_agt.apellido AS agente_nombre,
    c.nombre AS categoria_nombre
FROM tickets t
LEFT JOIN usuarios u_cli ON t.cliente_id = u_cli.id
LEFT JOIN usuarios u_agt ON t.agente_id = u_agt.id
LEFT JOIN empresas e ON t.empresa_id = e.id
LEFT JOIN categorias c ON t.categoria_id = c.id;

CREATE VIEW v_metricas_agente AS
SELECT
    u.id AS agente_id,
    u.tenant_id,
    u.nombre || ' ' || u.apellido AS nombre_completo,
    COUNT(t.id) AS total_tickets,
    COUNT(CASE WHEN t.estado IN ('resuelto','cerrado') THEN 1 END) AS resueltos,
    COUNT(CASE WHEN t.estado NOT IN ('resuelto','cerrado','cancelado') THEN 1 END) AS abiertos,
    ROUND(AVG(t.tiempo_trabajado_min)) AS promedio_tiempo_trabajado_min,
    ROUND(AVG(EXTRACT(EPOCH FROM (t.primera_respuesta_en - t.creado_en))/60)) AS frt_promedio_min,
    COUNT(CASE WHEN t.sla_resolucion_ok = TRUE THEN 1 END) AS sla_cumplidos,
    ROUND(AVG(es.calificacion),1) AS csat_promedio
FROM usuarios u
LEFT JOIN tickets t ON t.agente_id = u.id AND t.tenant_id = u.tenant_id
LEFT JOIN encuestas_satisfaccion es ON es.ticket_id = t.id AND es.respondida = TRUE
WHERE u.rol IN ('agente','supervisor')
GROUP BY u.id, u.tenant_id, u.nombre, u.apellido;

CREATE VIEW v_sla_cumplimiento AS
SELECT
    tenant_id,
    COUNT(*) AS total_tickets,
    COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) AS sla_cumplidos,
    COUNT(CASE WHEN sla_resolucion_ok = FALSE THEN 1 END) AS sla_incumplidos,
    ROUND(100.0 * COUNT(CASE WHEN sla_resolucion_ok = TRUE THEN 1 END) / NULLIF(COUNT(*),0), 1) AS pct_cumplimiento,
    prioridad,
    DATE_TRUNC('day', creado_en) AS fecha
FROM tickets
WHERE estado IN ('resuelto','cerrado')
GROUP BY tenant_id, prioridad, DATE_TRUNC('day', creado_en);

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

INSERT INTO tenants (id, nombre, dominio, email_soporte, plan) VALUES
('00000000-0000-0000-0000-000000000001', 'Magus Technology', 'magus-ecommerce.com', 'soporte@magus-ecommerce.com', 'enterprise');

INSERT INTO usuarios (tenant_id, nombre, apellido, email, password_hash, rol) VALUES
('00000000-0000-0000-0000-000000000001', 'Carlos', 'Admin', 'admin@magus-ecommerce.com', crypt('Admin2024!', gen_salt('bf')), 'admin'),
('00000000-0000-0000-0000-000000000001', 'María', 'González', 'maria@magus-ecommerce.com', crypt('Agente2024!', gen_salt('bf')), 'agente'),
('00000000-0000-0000-0000-000000000001', 'Pedro', 'Salinas', 'pedro@magus-ecommerce.com', crypt('Agente2024!', gen_salt('bf')), 'agente');

INSERT INTO categorias (tenant_id, nombre, area_responsable, icono, color) VALUES
('00000000-0000-0000-0000-000000000001', 'Soporte Técnico', 'Desarrollo', '🛠', '#4F7FFF'),
('00000000-0000-0000-0000-000000000001', 'Facturación', 'Administración', '🧾', '#F5A623'),
('00000000-0000-0000-0000-000000000001', 'Capacitación', 'Soporte', '📚', '#22C97A'),
('00000000-0000-0000-0000-000000000001', 'Accesos y Permisos', 'TI', '🔐', '#F04E4E');

INSERT INTO sla_politicas (tenant_id, nombre, prioridad, tiempo_primera_respuesta_min, tiempo_resolucion_min, horario) VALUES
('00000000-0000-0000-0000-000000000001', 'SLA Crítico', 'critica', 30, 240, '24_7'),
('00000000-0000-0000-0000-000000000001', 'SLA Alto', 'alta', 120, 480, '24_7'),
('00000000-0000-0000-0000-000000000001', 'SLA Medio', 'media', 240, 1440, 'horario_laboral'),
('00000000-0000-0000-0000-000000000001', 'SLA Bajo', 'baja', 480, 4320, 'horario_laboral');

INSERT INTO automatizaciones (tenant_id, nombre, evento, condiciones, acciones) VALUES
('00000000-0000-0000-0000-000000000001', 'Auto-asignar por categoría', 'ticket_creado',
 '[{"campo":"prioridad","operador":"eq","valor":"critica"}]',
 '[{"tipo":"asignar_supervisor"},{"tipo":"notificar_email"}]'),
('00000000-0000-0000-0000-000000000001', 'Alerta SLA por vencer', 'sla_proximo',
 '[{"campo":"pct_sla","operador":"gte","valor":80}]',
 '[{"tipo":"notificar_agente"},{"tipo":"notificar_supervisor"}]'),
('00000000-0000-0000-0000-000000000001', 'Cierre automático 48h', 'ticket_en_espera',
 '[{"campo":"horas_sin_respuesta","operador":"gte","valor":48}]',
 '[{"tipo":"cerrar_ticket"},{"tipo":"enviar_encuesta"}]');
