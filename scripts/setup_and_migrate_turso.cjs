const https = require('https');
const { Pool } = require('pg');

const TURSO_URL = 'https://camilleros-cncestadistica-beep.aws-us-east-2.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MjIxMzU1MDksImlhdCI6MTc5MDU5OTUwOSwiaWQiOiIwMWEwZTgwYi1lYzAxLTdiMzktOGIyMC02ZTQxYWI2OTE2NGEiLCJraWQiOiJ6a2tLcGc0SDNYSFFMeE40NXI4RDNkN3RoYUlsS1BXeG42N2l0SWpxVmtFIiwicmlkIjoiZWVkZDlhZWEtNjJiOS00NmY0LWI5MDQtMzkwY2FlZmJiMTM3In0.mLLZIsgXe3HGeD3cpLmqWju2zIIsAgksxOqG5-wM_396-Cyt8bKPWI8nOx3G9sUE_S6E09KBu-ADlgdNxBEeCw';

const pgPool = new Pool({
  host: '172.21.21.37',
  port: 5432,
  database: 'bd_estadistica',
  user: 'postgres',
  password: 'Teleco2018',
  connectionTimeoutMillis: 5000,
});

async function executeTurso(statements) {
  const payload = JSON.stringify({
    requests: statements.map(s => {
      if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } };
      return {
        type: 'execute',
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(val => {
            if (val === null || val === undefined) return { type: 'null' };
            if (typeof val === 'number') return { type: 'integer', value: String(val) };
            return { type: 'text', value: String(val) };
          })
        }
      };
    })
  });

  return new Promise((resolve, reject) => {
    const req = https.request(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TURSO_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (res.statusCode >= 400 || (json.results && json.results.some(r => r.type === 'error'))) {
            const errResult = json.results ? json.results.find(r => r.type === 'error') : null;
            return reject(new Error('Turso Error: ' + (errResult ? JSON.stringify(errResult.error) : b)));
          }
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

async function main() {
  console.log('==================================================');
  console.log('🚀 CONFIGURANDO Y MIGRANDO A TURSO CLOUD DATABASE');
  console.log('==================================================\n');

  console.log('1️⃣ Creando tablas en Turso Cloud...');
  await executeTurso([
    `CREATE TABLE IF NOT EXISTS solicitudes_camilleros (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      patient TEXT NOT NULL,
      record TEXT NOT NULL,
      service TEXT NOT NULL,
      location TEXT NOT NULL,
      destination TEXT NOT NULL,
      transport TEXT NOT NULL,
      oxygen TEXT NOT NULL DEFAULT 'no',
      observation TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDIENTE',
      mover TEXT DEFAULT 'sin asignar',
      central_observation TEXT DEFAULT '',
      timestamp TEXT NOT NULL,
      assignment_time TEXT DEFAULT NULL,
      movement_time TEXT DEFAULT 'pendiente',
      priority TEXT DEFAULT 'media',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ]);

  await executeTurso([
    `CREATE TABLE IF NOT EXISTS camilleros_personal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ]);

  await executeTurso([
    `CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes_camilleros(status);`
  ]);

  await executeTurso([
    `CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON solicitudes_camilleros(created_at);`
  ]);

  console.log('✅ Tablas e índices creados con éxito en Turso.');

  console.log('\n2️⃣ Extrayendo datos desde PostgreSQL (172.21.21.37)...');
  const pgCamilleros = await pgPool.query('SELECT name, active FROM "CamilleroPersonal"');
  console.log(`📦 Extraídos ${pgCamilleros.rows.length} camilleros de PostgreSQL.`);

  const pgSolicitudes = await pgPool.query('SELECT * FROM "SolicitudCamillero" ORDER BY "createdAt" ASC');
  console.log(`📦 Extraídas ${pgSolicitudes.rows.length} solicitudes de PostgreSQL.`);

  console.log('\n3️⃣ Insertando camilleros en Turso Cloud...');
  const camillerosOps = pgCamilleros.rows.map(c => ({
    sql: `INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, ?);`,
    args: [(c.name || '').toLowerCase().trim(), c.active === false ? 0 : 1]
  }));
  if (camillerosOps.length > 0) {
    await executeTurso(camillerosOps);
    console.log(`✅ ${camillerosOps.length} camilleros sincronizados en Turso.`);
  }

  console.log('\n4️⃣ Migrando solicitudes a Turso Cloud en lotes de 100...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < pgSolicitudes.rows.length; i += BATCH_SIZE) {
    const slice = pgSolicitudes.rows.slice(i, i + BATCH_SIZE);
    const batchOps = slice.map(s => ({
      sql: `INSERT OR REPLACE INTO solicitudes_camilleros (
        id, request_id, patient, record, service, location, destination,
        transport, oxygen, observation, status, mover, central_observation,
        timestamp, assignment_time, movement_time, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        s.customId || s.id,
        s.requestId || s.request_id || '',
        s.patient || '',
        s.record || '',
        s.service || '',
        s.location || '',
        s.destination || '',
        s.transport || 'silla de ruedas',
        s.oxygen || 'no',
        s.observation || '',
        (s.status || 'PENDIENTE').toUpperCase(),
        (s.mover || 'sin asignar').toLowerCase().trim(),
        s.centralObservation || s.central_observation || '',
        s.timestamp || '',
        s.assignmentTime || s.assignment_time || null,
        s.movementTime || s.movement_time || 'pendiente',
        (s.priority || 'media').toLowerCase().trim()
      ]
    }));

    await executeTurso(batchOps);
    const progress = Math.min(i + BATCH_SIZE, pgSolicitudes.rows.length);
    const pct = ((progress / pgSolicitudes.rows.length) * 100).toFixed(1);
    console.log(`⏳ Migrados ${progress} / ${pgSolicitudes.rows.length} (${pct}%)...`);
  }

  console.log('\n5️⃣ Verificando totales en Turso Cloud...');
  const checkReq = await executeTurso(['SELECT count(*) as count FROM solicitudes_camilleros;']);
  const checkCam = await executeTurso(['SELECT count(*) as count FROM camilleros_personal;']);
  const totalReq = checkReq.results[0]?.response?.result?.rows[0][0]?.value;
  const totalCam = checkCam.results[0]?.response?.result?.rows[0][0]?.value;

  console.log(`🎉 Total solicitudes en Turso: ${totalReq}`);
  console.log(`🎉 Total camilleros en Turso: ${totalCam}`);
  console.log('\n==================================================');
  console.log('✅ ¡MIGRACIÓN A TURSO CLOUD COMPLETADA CON ÉXITO!');
  console.log('==================================================\n');
  await pgPool.end();
}

main().catch(err => {
  console.error('❌ Error durante la migración:', err);
  process.exit(1);
});
