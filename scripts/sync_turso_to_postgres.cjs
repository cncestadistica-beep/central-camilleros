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
  console.log('=== SINCRONIZANDO TURSO / LOCAL ➔ POSTGRESQL SERVIDOR (172.21.21.37) ===');
  console.log('Fecha:', new Date().toLocaleString('es-CO'));

  const client = await pgPool.connect();

  try {
    // 1. Crear / verificar estructura en PostgreSQL
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
        priority VARCHAR(50) DEFAULT 'media',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE solicitudes_camilleros ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'media';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS camilleros_personal (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_camilleros(status);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_service ON solicitudes_camilleros(service);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_mover ON solicitudes_camilleros(mover);
      CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON solicitudes_camilleros(created_at);
    `);
    console.log('✓ Estructura de tablas e índices verificada en PostgreSQL.');

    // 2. Extraer datos de Turso Cloud
    let rows = [];
    try {
      const json = await executeTurso('SELECT * FROM solicitudes_camilleros ORDER BY created_at ASC;');
      rows = parseRows(json.results[0]?.response?.result);
      console.log(`Leídas ${rows.length} solicitudes desde Turso Cloud.`);
    } catch (e) {
      console.warn('Advertencia al consultar Turso Cloud:', e.message);
    }

    let count = 0;
    for (const s of rows) {
      const query = `
        INSERT INTO solicitudes_camilleros (
          id, request_id, patient, record, service, location, destination,
          transport, oxygen, observation, status, mover, central_observation,
          timestamp, assignment_time, movement_time, priority, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
          movement_time = EXCLUDED.movement_time,
          priority = EXCLUDED.priority;
      `;
      const values = [
        s.id, s.request_id || s.requestId, s.patient, s.record, s.service,
        s.location, s.destination, s.transport, s.oxygen || 'no', s.observation || '',
        s.status || 'PENDIENTE', s.mover || 'sin asignar', s.central_observation || '',
        s.timestamp, s.assignment_time || null, s.movement_time || 'pendiente',
        (s.priority || 'media').toLowerCase().trim(),
        s.created_at || new Date()
      ];
      await client.query(query, values);
      count++;
    }
    console.log(`✓ ${count} solicitudes sincronizadas en PostgreSQL.`);

    // 3. Sincronizar Camilleros
    let camRows = [];
    try {
      const camJson = await executeTurso('SELECT name FROM camilleros_personal WHERE active = 1;');
      camRows = parseRows(camJson.results[0]?.response?.result);
    } catch (_) {}

    const defaultCamilleros = [
      'victor perafán',
      'andrés castro',
      'juan lucas',
      'michi jose',
      'albajadmamad',
      'maria gonzales'
    ];
    const camillerosList = camRows.length > 0 ? camRows.map(r => r.name) : defaultCamilleros;

    let camCount = 0;
    for (const name of camillerosList) {
      if (!name) continue;
      await client.query(`
        INSERT INTO camilleros_personal (name, active)
        VALUES ($1, true)
        ON CONFLICT (name) DO UPDATE SET active = true;
      `, [name.toLowerCase().trim()]);
      camCount++;
    }
    console.log(`✓ ${camCount} camilleros configurados en PostgreSQL.`);

    const countSol = await client.query('SELECT count(*) FROM solicitudes_camilleros;');
    const countCam = await client.query('SELECT count(*) FROM camilleros_personal WHERE active = true;');
    console.log('\n=== RECUENTO FINAL EN POSTGRESQL (172.21.21.37) ===');
    console.log('Total Solicitudes en PostgreSQL:', countSol.rows[0].count);
    console.log('Total Camilleros en PostgreSQL:', countCam.rows[0].count);
    console.log('=== PROCESO COMPLETADO EXITOSAMENTE ===');
  } catch (err) {
    console.error('Error sincronizando:', err.message);
  } finally {
    client.release();
    await pgPool.end();
  }
}

sync();
