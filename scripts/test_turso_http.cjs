const https = require('https');
require('dotenv').config();

const url = (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://');
const token = process.env.TURSO_AUTH_TOKEN;

const payload = JSON.stringify({
  requests: [
    { type: 'execute', stmt: { sql: 'SELECT 1 as result;' } }
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
    console.log('Status HTTP:', res.statusCode);
    console.log('Respuesta Turso:', body);
  });
});

req.on('error', err => console.error('Error:', err));
req.write(payload);
req.end();
