const https = require('https');
const { Pool } = require('pg');
require('dotenv').config();

const rawUrl = process.env.TURSO_DATABASE_URL || '';
const url = rawUrl.replace('libsql://', 'https://').trim();
const token = (process.env.TURSO_AUTH_TOKEN || '').trim();

const pgPool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
});

async function executeTurso(sql) {
  const payload = JSON.stringify({
    requests: [{ type: 'execute', stmt: { sql } }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url + '/v2/pipeline', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) return reject(new Error(body));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function parseRows(result) {
  if (!result || !result.cols || !result.rows) return [];
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx] ? row[idx].value : null;
    });
    return obj;
  });
}

async function sync() {
  console.log('=== SINCRONIZANDO TURSO (SQLITE NUBE) ➔ POSTGRESQL LOCAL (172.21.21.37) ===');
  console.log('Fecha:', new Date().toLocaleString('es-CO'));

  try {
    const json = await executeTurso('SELECT * FROM solicitudes_camilleros ORDER BY created_at ASC;');
    const rows = parseRows(json.results[0]?.response?.result);
    console.log(`Leídas ${rows.length} solicitudes desde Turso Cloud.`);

    const client = await pgPool.connect();
    let count = 0;

    for (const s of rows) {
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
        s.location, s.destination, s.transport, s.oxygen, s.observation || '',
        s.status || 'PENDIENTE', s.mover || 'sin asignar', s.central_observation || '',
        s.timestamp, s.assignment_time || null, s.movement_time || 'pendiente',
        s.created_at || new Date()
      ];
      await client.query(query, values);
      count++;
    }

    console.log(`✓ ${count} registros sincronizados en tu servidor PostgreSQL (172.21.21.37) exitosamente.`);
    client.release();
    await pgPool.end();
    console.log('=== PROCESO COMPLETADO EXITOSAMENTE ===');
  } catch (err) {
    console.error('Error sincronizando:', err.message);
  }
}

sync();
