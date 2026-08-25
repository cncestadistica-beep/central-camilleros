const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// 1. Limpiar Turso Cloud SQLite
const rawUrl = process.env.TURSO_DATABASE_URL || '';
const url = rawUrl.replace('libsql://', 'https://').trim();
const token = (process.env.TURSO_AUTH_TOKEN || '').trim();

async function cleanTurso() {
  if (!url || !token) {
    console.log('Turso no configurado en .env, saltando.');
    return;
  }
  console.log('Limpiando base de datos Turso Cloud...');
  const payload = JSON.stringify({
    requests: [
      { type: 'execute', stmt: { sql: 'DELETE FROM solicitudes_camilleros;' } }
    ]
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
        if (res.statusCode >= 400) return reject(new Error(body));
        console.log('✓ Base de datos Turso Cloud LIMPIA (0 solicitudes).');
        resolve();
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 2. Limpiar SQLite Local (camilleros.db)
function cleanLocalSqlite() {
  return new Promise((resolve) => {
    const dbPath = path.resolve(__dirname, '../camilleros.db');
    const db = new sqlite3.Database(dbPath);
    db.run('DELETE FROM solicitudes_camilleros;', (err) => {
      if (err) console.error('Error limpiando sqlite local:', err);
      else console.log('✓ SQLite Local (camilleros.db) LIMPIO (0 solicitudes).');
      db.close();
      resolve();
    });
  });
}

// 3. Limpiar PostgreSQL Local (172.21.21.37)
async function cleanPostgres() {
  try {
    const pgPool = new Pool({
      host: process.env.DB_HOST || '172.21.21.37',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'bd_estadistica',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Teleco2018',
      connectionTimeoutMillis: 3000,
    });
    const client = await pgPool.connect();
    await client.query('DELETE FROM solicitudes_camilleros;');
    console.log('✓ PostgreSQL Local (172.21.21.37) LIMPIO (0 solicitudes).');
    client.release();
    await pgPool.end();
  } catch (err) {
    console.log('Nota: PostgreSQL local no respondió o no está activo en este momento:', err.message);
  }
}

async function main() {
  console.log('=== INICIANDO LIMPIEZA TOTAL DE DATOS DE PRUEBA ===');
  await cleanTurso();
  await cleanLocalSqlite();
  await cleanPostgres();
  console.log('=== LIMPIEZA DE BASE DE DATOS COMPLETADA CON ÉXITO ===');
}

main().catch(console.error);
