const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
  connectionTimeoutMillis: 5000,
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL at ' + (process.env.DB_HOST || '172.21.21.37') + '...');
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');

    const createTableSolicitudes = `
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
    `;
    await client.query(createTableSolicitudes);
    console.log('Tabla "solicitudes_camilleros" creada / verificada con éxito.');

    const createTableCamilleros = `
      CREATE TABLE IF NOT EXISTS camilleros_personal (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableCamilleros);
    console.log('Tabla "camilleros_personal" creada / verificada con éxito.');

    const insertCamilleros = `
      INSERT INTO camilleros_personal (name) VALUES 
        ('victor perafán'),
        ('andrés castro'),
        ('juan lucas'),
        ('michi jose'),
        ('albajadmamad'),
        ('maria gonzales')
      ON CONFLICT (name) DO NOTHING;
    `;
    await client.query(insertCamilleros);
    console.log('Personal inicial de camilleros registrado.');

    const createIndices = `
      CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_camilleros(status);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_service ON solicitudes_camilleros(service);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_mover ON solicitudes_camilleros(mover);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_record ON solicitudes_camilleros(record);
    `;
    await client.query(createIndices);
    console.log('Índices de optimización creados con éxito.');

    const countRes = await client.query('SELECT count(*) FROM solicitudes_camilleros;');
    console.log('Total de registros actuales en PostgreSQL: ' + countRes.rows[0].count);

    client.release();
    await pool.end();
    console.log('¡MIGRACIÓN Y CONEXIÓN COMPLETADA CON ÉXITO!');
  } catch (err) {
    console.error('Error de conexión a PostgreSQL:', err.message);
    process.exit(1);
  }
}

main();
