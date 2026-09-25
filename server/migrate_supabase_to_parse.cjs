const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vgkpnhtctbdmnnxnmlyi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
const PARSE_APP_ID = process.env.PARSE_APP_ID || 'central-camilleros';
const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY || 'MasterKeyCNC2026';

// 1. Fetch ALL records from Supabase
async function fetchAllSupabaseRequests() {
  let all = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const items = await new Promise((resolve, reject) => {
      const req = https.get(`${SUPABASE_URL}/rest/v1/solicitudes_camilleros?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
          'Range': `${from}-${to}`
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
    });
    
    if (!Array.isArray(items) || items.length === 0) break;
    all = all.concat(items);
    console.log(`Descargados ${all.length} registros desde Supabase...`);
    if (items.length < pageSize) break;
    page++;
  }
  return all;
}

async function fetchAllSupabaseCamilleros() {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/camilleros_personal?select=*&order=name.asc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

// 2. Batch send to Parse Server
async function sendParseBatch(requests) {
  const payload = JSON.stringify({ requests });
  return new Promise((resolve, reject) => {
    const req = http.request('http://localhost:1337/parse/batch', {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': PARSE_APP_ID,
        'X-Parse-Master-Key': PARSE_MASTER_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runMigration() {
  console.log('==================================================');
  console.log('🚀 INICIANDO MIGRACIÓN DE SUPABASE A PARSE SERVER');
  console.log('==================================================\n');

  console.log('1️⃣ Descargando camilleros de Supabase...');
  const camilleros = await fetchAllSupabaseCamilleros();
  console.log(`✅ Total camilleros: ${camilleros.length}`);

  console.log('2️⃣ Insertando camilleros en Parse Server (Clase: CamilleroPersonal)...');
  const camilleroBatch = camilleros.map(c => ({
    method: 'POST',
    path: '/parse/classes/CamilleroPersonal',
    body: {
      name: (c.name || '').toLowerCase().trim(),
      active: Boolean(c.active)
    }
  }));
  await sendParseBatch(camilleroBatch);
  console.log('✅ Camilleros migrados a Parse Server.');

  console.log('\n3️⃣ Descargando todas las solicitudes de Supabase...');
  const solicitudes = await fetchAllSupabaseRequests();
  console.log(`✅ Total solicitudes extraídas: ${solicitudes.length}`);

  console.log('\n4️⃣ Migrando solicitudes a Parse Server en lotes de 50 (Clase: SolicitudCamillero)...');
  const BATCH_SIZE = 50;
  for (let i = 0; i < solicitudes.length; i += BATCH_SIZE) {
    const slice = solicitudes.slice(i, i + BATCH_SIZE);
    const batchOps = slice.map(s => ({
      method: 'POST',
      path: '/parse/classes/SolicitudCamillero',
      body: {
        customId: s.id,
        requestId: s.request_id || s.requestId,
        patient: s.patient || '',
        record: s.record || '',
        service: s.service || '',
        location: s.location || '',
        destination: s.destination || '',
        transport: s.transport || 'silla de ruedas',
        oxygen: s.oxygen || 'no',
        observation: s.observation || '',
        status: (s.status || 'PENDIENTE').toUpperCase(),
        mover: (s.mover || 'sin asignar').toLowerCase().trim(),
        centralObservation: s.central_observation || s.centralObservation || '',
        timestamp: s.timestamp || '',
        assignmentTime: s.assignment_time || s.assignmentTime || null,
        movementTime: s.movement_time || s.movementTime || 'pendiente',
        priority: (s.priority || 'media').toLowerCase().trim()
      }
    }));

    await sendParseBatch(batchOps);
    const progress = Math.min(i + BATCH_SIZE, solicitudes.length);
    const pct = ((progress / solicitudes.length) * 100).toFixed(1);
    console.log(`⏳ Migrados ${progress} / ${solicitudes.length} (${pct}%)...`);
  }

  console.log('\n==================================================');
  console.log('🎉 ¡MIGRACIÓN COMPLETADA AL 100%!');
  console.log(`📊 ${solicitudes.length} solicitudes y ${camilleros.length} camilleros migrados a Parse Server.`);
  console.log('==================================================\n');
}

runMigration().catch(console.error);
