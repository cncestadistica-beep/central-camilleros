const http = require('http');

http.get('http://localhost:1337/parse/health', res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => console.log('Parse Health:', res.statusCode, b));
}).on('error', e => console.error('Parse Error:', e.message));

http.get('http://localhost:1337/parse/classes/SolicitudCamillero?where=' + encodeURIComponent(JSON.stringify({ status: 'PENDIENTE' })), {
  headers: {
    'X-Parse-Application-Id': 'central-camilleros',
    'X-Parse-Master-Key': 'MasterKeyCNC2026'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => console.log('Parse Pendientes:', res.statusCode, JSON.parse(b)));
}).on('error', e => console.error('Parse Pendientes Error:', e.message));
