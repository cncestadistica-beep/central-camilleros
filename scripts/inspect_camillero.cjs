const https = require('https');
require('dotenv').config();

const rawUrl = process.env.TURSO_DATABASE_URL || '';
const url = rawUrl.replace('libsql://', 'https://').trim();
const token = (process.env.TURSO_AUTH_TOKEN || '').trim();

async function inspectCamilleros() {
  const payload = JSON.stringify({
    requests: [
      { type: 'execute', stmt: { sql: "SELECT request_id, patient, service, mover, timestamp, assignment_time, movement_time, status FROM solicitudes_camilleros;" } }
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
      const json = JSON.parse(body);
      const rows = json.results[0]?.response?.result?.rows || [];
      const cols = (json.results[0]?.response?.result?.cols || []).map(c => c.name);
      console.log('Total registros en base de datos:', rows.length);
      rows.forEach(r => {
        const obj = {};
        cols.forEach((col, idx) => obj[col] = r[idx]?.value);
        console.log(JSON.stringify(obj));
      });
    });
  });
  req.write(payload);
  req.end();
}

inspectCamilleros().catch(console.error);
