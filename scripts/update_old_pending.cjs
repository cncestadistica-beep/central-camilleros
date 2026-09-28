const https = require('https');
const url = new URL('https://camilleros-cncestadistica-beep.aws-us-east-2.turso.io/v2/pipeline');
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MjIxMzU1MDksImlhdCI6MTc5MDU5OTUwOSwiaWQiOiIwMWEwZTgwYi1lYzAxLTdiMzktOGIyMC02ZTQxYWI2OTE2NGEiLCJraWQiOiJ6a2tLcGc0SDNYSFFMeE40NXI4RDNkN3RoYUlsS1BXeG42N2l0SWpxVmtFIiwicmlkIjoiZWVkZDlhZWEtNjJiOS00NmY0LWI5MDQtMzkwY2FlZmJiMTM3In0.mLLZIsgXe3HGeD3cpLmqWju2zIIsAgksxOqG5-wM_396-Cyt8bKPWI8nOx3G9sUE_S6E09KBu-ADlgdNxBEeCw';

const payload = JSON.stringify({
  requests: [
    {
      type: 'execute',
      stmt: {
        sql: "UPDATE solicitudes_camilleros SET status = 'REALIZADO', movement_time = timestamp WHERE status = 'PENDIENTE' AND id IN ('1790354600020', '1790354571302', '1790354198636');"
      }
    },
    {
      type: 'execute',
      stmt: {
        sql: "SELECT id, request_id, patient, timestamp, status FROM solicitudes_camilleros WHERE status = 'PENDIENTE';"
      }
    },
    { type: 'close' }
  ]
});

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});
req.write(payload);
req.end();
