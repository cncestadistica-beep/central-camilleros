const { Pool } = require('pg');
require('dotenv').config();

// 1. Conexión a la base de datos en la nube (Vercel / Neon / Supabase)
const cloudDatabaseUrl = process.env.CLOUD_DATABASE_URL || process.env.DATABASE_URL;

if (!cloudDatabaseUrl) {
  console.error('Error: Debes configurar CLOUD_DATABASE_URL en tu archivo .env');
  process.exit(1);
}

const cloudPool = new Pool({
  connectionString: cloudDatabaseUrl,
  ssl: { rejectUnauthorized: false },
});

// 2. Conexión a tu servidor PostgreSQL Local en la Clínica
const localPool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
});

async function syncData() {
  console.log('=== INICIANDO SINCRONIZACIÓN NUBE ➔ LOCAL ===');
  console.log('Fecha y Hora:', new Date().toLocaleString('es-CO'));

  let cloudClient, localClient;
  try {
    cloudClient = await cloudPool.connect();
    localClient = await localPool.connect();
    console.log('✓ Conectado a la Base de Datos Nube');
    console.log('✓ Conectado al Servidor Local (172.21.21.37)');

    // A. Sincronizar Solicitudes de Traslados
    const { rows: cloudRequests } = await cloudClient.query(
      'SELECT * FROM solicitudes_camilleros ORDER BY created_at ASC'
    );
    console.log(`✓ Descargando ${cloudRequests.length} solicitudes desde la nube...`);

    let syncReqCount = 0;
    for (const s of cloudRequests) {
      const query = `
        INSERT INTO solicitudes_camilleros (
          id, request_id, patient, record, service, location, destination,
          transport, oxygen, observation, status, mover, central_observation,
          timestamp, assignment_time, movement_time, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          request_id = EXCLUDED.request_id,
          patient = EXCLUDED.patient,
          record = EXCLUDED.record,
          service = EXCLUDED.service,
          location = EXCLUDED.location,
          destination = EXCLUDED.destination,
          transport = EXCLUDED.transport,
          oxygen = EXCLUDED.oxygen,
          observation = EXCLUDED.observation,
          status = EXCLUDED.status,
          mover = EXCLUDED.mover,
          central_observation = EXCLUDED.central_observation,
          timestamp = EXCLUDED.timestamp,
          assignment_time = EXCLUDED.assignment_time,
          movement_time = EXCLUDED.movement_time;
      `;
      const values = [
        s.id, s.request_id || s.requestId, s.patient, s.record, s.service,
        s.location, s.destination, s.transport, s.oxygen, s.observation || '',
        s.status || 'PENDIENTE', s.mover || 'sin asignar', s.central_observation || s.centralObservation || '',
        s.timestamp, s.assignment_time || s.assignmentTime || null, s.movement_time || s.movementTime || 'pendiente',
        s.created_at || new Date()
      ];
      await localClient.query(query, values);
      syncReqCount++;
    }
    console.log(`✓ ${syncReqCount} solicitudes sincronizadas en tu PostgreSQL local.`);

    // B. Sincronizar Personal de Camilleros
    const { rows: cloudCamilleros } = await cloudClient.query(
      'SELECT * FROM camilleros_personal'
    );
    for (const c of cloudCamilleros) {
      await localClient.query(
        'INSERT INTO camilleros_personal (name, active) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active',
        [c.name, c.active]
      );
    }
    console.log(`✓ Personal de camilleros sincronizado.`);

    console.log('=== SINCRONIZACIÓN FINALIZADA CON ÉXITO ===');
  } catch (error) {
    console.error('Error durante la sincronización:', error.message);
  } finally {
    if (cloudClient) cloudClient.release();
    if (localClient) localClient.release();
    await cloudPool.end();
    await localPool.end();
  }
}

syncData();
