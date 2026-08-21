const { Pool } = require('pg');
require('dotenv').config();

const cloudDatabaseUrl = process.env.CLOUD_DATABASE_URL || process.env.DATABASE_URL;

if (!cloudDatabaseUrl) {
  console.error('Error: Por favor coloca tu CLOUD_DATABASE_URL en el archivo .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: cloudDatabaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function setupCloud() {
  console.log('Conectando a la base de datos en la nube...');
  const client = await pool.connect();
  console.log('✓ Conectado exitosamente.');

  console.log('Creando tabla solicitudes_camilleros en la nube...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS solicitudes_camilleros (
      id VARCHAR(100) PRIMARY KEY,
      request_id VARCHAR(50) NOT NULL,
      patient VARCHAR(255) NOT NULL,
      record VARCHAR(100) NOT NULL,
      service VARCHAR(150) NOT NULL,
      location VARCHAR(255) NOT NULL,
      destination VARCHAR(255) NOT NULL,
      transport VARCHAR(100) NOT NULL,
      oxygen VARCHAR(10) NOT NULL DEFAULT 'no',
      observation TEXT DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
      mover VARCHAR(150) DEFAULT 'sin asignar',
      central_observation TEXT DEFAULT '',
      timestamp VARCHAR(100) NOT NULL,
      assignment_time VARCHAR(100) DEFAULT NULL,
      movement_time VARCHAR(100) DEFAULT 'pendiente',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Creando tabla camilleros_personal en la nube...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS camilleros_personal (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) UNIQUE NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    INSERT INTO camilleros_personal (name) VALUES 
      ('victor perafán'),
      ('andrés castro'),
      ('juan lucas'),
      ('michi jose'),
      ('albajadmamad'),
      ('maria gonzales')
    ON CONFLICT (name) DO NOTHING;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_camilleros(status);
    CREATE INDEX IF NOT EXISTS idx_solicitudes_service ON solicitudes_camilleros(service);
    CREATE INDEX IF NOT EXISTS idx_solicitudes_mover ON solicitudes_camilleros(mover);
    CREATE INDEX IF NOT EXISTS idx_solicitudes_record ON solicitudes_camilleros(record);
  `);

  console.log('✓ ¡BASE DE DATOS EN LA NUBE PREPARADA CON ÉXITO!');
  client.release();
  await pool.end();
}

setupCloud().catch(err => {
  console.error('Error al configurar la nube:', err.message);
  process.exit(1);
});
