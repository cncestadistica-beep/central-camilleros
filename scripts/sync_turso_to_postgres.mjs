import { createClient } from '@libsql/client/web';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('Error: Debes configurar TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env');
  process.exit(1);
}

const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });

const pgPool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
});

async function sync() {
  console.log('=== PASANDO DATOS DE TURSO SQLITE ➔ POSTGRESQL LOCAL ===');
  console.log('Fecha:', new Date().toLocaleString('es-CO'));

  try {
    const rs = await tursoClient.execute('SELECT * FROM solicitudes_camilleros');
    console.log(`Leídas ${rs.rows.length} solicitudes desde Turso SQLite.`);

    const client = await pgPool.connect();
    let count = 0;

    for (const s of rs.rows) {
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
        s.id, s.request_id, s.patient, s.record, s.service,
        s.location, s.destination, s.transport, s.oxygen, s.observation,
        s.status, s.mover, s.central_observation,
        s.timestamp, s.assignment_time, s.movement_time, s.created_at || new Date()
      ];
      await client.query(query, values);
      count++;
    }

    console.log(`✓ ${count} registros sincronizados en tu servidor PostgreSQL (172.21.21.37) exitosamente.`);
    client.release();
    await pgPool.end();
    console.log('=== SINCRONIZACIÓN TURSO ➔ LOCAL EXITOSA ===');
  } catch (err) {
    console.error('Error sincronizando:', err.message);
  }
}

sync();
