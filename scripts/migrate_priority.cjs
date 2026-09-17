const https = require('https');
require('dotenv').config();

const rawUrl = process.env.TURSO_DATABASE_URL || '';
const url = rawUrl.replace('libsql://', 'https://').trim();
const token = (process.env.TURSO_AUTH_TOKEN || '').trim();

async function migrate() {
  const payload = JSON.stringify({
    requests: [
      { type: 'execute', stmt: { sql: "ALTER TABLE solicitudes_camilleros ADD COLUMN priority TEXT DEFAULT 'media';" } }
    ]
  });

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
      console.log('Respuesta de migración:', body);
    });
  });
  req.write(payload);
  req.end();
}

migrate().catch(console.error);
