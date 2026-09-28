const { Pool } = require('pg');

const pool = new Pool({
  host: '172.21.21.37',
  port: 5432,
  database: 'bd_estadistica',
  user: 'postgres',
  password: 'Teleco2018',
  connectionTimeoutMillis: 5000,
});

async function run() {
  try {
    const res = await pool.query('SELECT count(*) FROM "SolicitudCamillero"');
    console.log('✅ PostgreSQL 172.21.21.37 SolicitudCamillero count:', res.rows[0].count);
    const cam = await pool.query('SELECT count(*) FROM "CamilleroPersonal"');
    console.log('✅ PostgreSQL 172.21.21.37 CamilleroPersonal count:', cam.rows[0].count);
    const pend = await pool.query('SELECT "requestId", "patient", "status", "timestamp" FROM "SolicitudCamillero" WHERE "status" = \'PENDIENTE\'');
    console.log('✅ PENDIENTES EN POSTGRESQL:', pend.rows);
  } catch (err) {
    console.error('❌ Error en PostgreSQL:', err.message);
  } finally {
    await pool.end();
  }
}

run();
