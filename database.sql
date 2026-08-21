-- =============================================================================
-- ESQUEMA DE BASE DE DATOS PARA CENTRAL DE CAMILLEROS Y TRASLADOS
-- Clínica Nueva de Cali
-- Motor: PostgreSQL
-- =============================================================================

-- 1. Crear tabla de Solicitudes de Traslados
CREATE TABLE IF NOT EXISTS solicitudes_camilleros (
    id VARCHAR(100) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,               -- Identificador institucional (ej. TR-1001)
    patient VARCHAR(255) NOT NULL,                 -- Nombre completo del paciente
    record VARCHAR(100) NOT NULL,                  -- Número de registro médico
    service VARCHAR(150) NOT NULL,                 -- Servicio solicitante (ej. Urgencias adultos)
    location VARCHAR(255) NOT NULL,                -- Ubicación específica
    destination VARCHAR(255) NOT NULL,             -- Destino del traslado
    transport VARCHAR(100) NOT NULL,               -- Silla de ruedas, Cama, Camilla ambulancia
    oxygen VARCHAR(10) NOT NULL DEFAULT 'no',      -- si / no
    observation TEXT DEFAULT '',                   -- Observaciones de la solicitud
    status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, REALIZADO, NO REALIZADO
    mover VARCHAR(150) DEFAULT 'sin asignar',      -- Nombre del camillero
    central_observation TEXT DEFAULT '',           -- Observaciones de la central o del camillero
    timestamp VARCHAR(100) NOT NULL,               -- Fecha y hora de solicitud (es-CO)
    assignment_time VARCHAR(100) DEFAULT NULL,     -- Fecha y hora en que se asignó/tomó el traslado
    movement_time VARCHAR(100) DEFAULT 'pendiente',-- Fecha y hora de realización del movimiento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de Personal de Camilleros
CREATE TABLE IF NOT EXISTS camilleros_personal (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Índices de optimización para búsquedas y dashboard
CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_camilleros(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_service ON solicitudes_camilleros(service);
CREATE INDEX IF NOT EXISTS idx_solicitudes_mover ON solicitudes_camilleros(mover);
CREATE INDEX IF NOT EXISTS idx_solicitudes_record ON solicitudes_camilleros(record);

-- 4. Camilleros iniciales
INSERT INTO camilleros_personal (name) VALUES 
  ('victor perafán'),
  ('andrés castro'),
  ('juan lucas'),
  ('michi jose'),
  ('albajadmamad'),
  ('maria gonzales')
ON CONFLICT (name) DO NOTHING;
