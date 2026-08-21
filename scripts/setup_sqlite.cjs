const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../camilleros.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Inicializando base de datos SQLite en:', dbPath);

  db.run(`
    CREATE TABLE IF NOT EXISTS solicitudes_camilleros (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS camilleros_personal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const camilleros = [
    'victor perafán',
    'andrés castro',
    'juan lucas',
    'michi jose',
    'albajadmamad',
    'maria gonzales'
  ];

  const stmtCam = db.prepare('INSERT OR IGNORE INTO camilleros_personal (name) VALUES (?)');
  for (const c of camilleros) {
    stmtCam.run(c);
  }
  stmtCam.finalize();

  const demoRequests = [
    { id: 'demo-1', requestId: 'TR-1001', timestamp: '19/8/2026, 9:20:36 a. m.', assignmentTime: '19/8/2026, 9:25:00 a. m.', movementTime: '19/8/2026, 9:38:02 a. m.', patient: 'Maria Gonzales', record: '3425872', location: 'sala de espera', destination: 'cubículo 26', oxygen: 'si', transport: 'silla de ruedas', observation: '', service: 'idime', status: 'REALIZADO', mover: 'juan', centralObservation: '' },
    { id: 'demo-2', requestId: 'TR-1002', timestamp: '19/8/2026, 9:15:48 a. m.', assignmentTime: '19/8/2026, 9:30:00 a. m.', movementTime: '19/8/2026, 10:10:33 a. m.', patient: 'Michi Orlando Bafio', record: '3425871', location: 'sala de espera', destination: 'gineco', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'pablo', centralObservation: '' },
    { id: 'demo-3', requestId: 'TR-1003', timestamp: '16/02/2026 3:08:57', assignmentTime: '16/02/2026 3:09:15', movementTime: '16/02/2026 3:10:43', patient: 'Angie Grisales', record: '3425850', location: 'sala de espera', destination: 'gineco', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'victor perafán', centralObservation: '' },
    { id: 'demo-4', requestId: 'TR-1004', timestamp: '16/02/2026 3:43:58', assignmentTime: '16/02/2026 4:00:00', movementTime: '16/02/2026 4:30:29', patient: 'Yesin Gratales', record: '3425870', location: 'sala de espera', destination: 'ginecoobstetricia', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'REALIZADO', mover: 'gestora', centralObservation: '' },
    { id: 'demo-5', requestId: 'TR-1005', timestamp: '16/02/2026 4:53:26', assignmentTime: '16/02/2026 5:05:00', movementTime: '16/02/2026 5:27:55', patient: 'Eimer Lasso Santacr', record: '3423499', location: 'alf del cuarto de diam', destination: 'cirugia', oxygen: 'no', transport: 'silla de ruedas', observation: 'debe estar en cirugia', service: 'urgencias adultos', status: 'REALIZADO', mover: 'victor perafán', centralObservation: '' },
    { id: 'demo-6', requestId: 'TR-1006', timestamp: '16/02/2026 6:06:01', assignmentTime: '16/02/2026 6:15:00', movementTime: '16/02/2026 6:41:09', patient: 'Gabriel Henao', record: '341889', location: 'urgencias sala de procedimientos', destination: 'diálisis', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'hospitalización 6to piso', status: 'REALIZADO', mover: 'andrés castro', centralObservation: '' },
    { id: 'demo-7', requestId: 'TR-1007', timestamp: '20/8/2026, 8:10:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Miguel', record: '3425880', location: 'su casa', destination: 'rayos x', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
    { id: 'demo-8', requestId: 'TR-1008', timestamp: '20/8/2026, 8:15:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Jfjgg', record: '3425881', location: 'grggrg', destination: 'dgrdgd', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
    { id: 'demo-9', requestId: 'TR-1009', timestamp: '20/8/2026, 8:20:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Juan', record: '3425882', location: 'tjgjj', destination: 'trthrthrth', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
    { id: 'demo-10', requestId: 'TR-1010', timestamp: '20/8/2026, 8:25:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Florencia Jiménez', record: '3425883', location: 'imágenes', destination: 'cub 26', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'NO REALIZADO', mover: 'sin asignar', centralObservation: 'Paciente no se encontraba en sala' },
    { id: 'demo-11', requestId: 'TR-1011', timestamp: '20/8/2026, 8:30:00 a. m.', assignmentTime: null, movementTime: 'pendiente', patient: 'Jhon Herrera', record: '3425884', location: 'sala de espera', destination: 'rx', oxygen: 'no', transport: 'silla de ruedas', observation: '', service: 'urgencias adultos', status: 'PENDIENTE', mover: 'sin asignar', centralObservation: '' },
  ];

  const stmtReq = db.prepare(`
    INSERT OR REPLACE INTO solicitudes_camilleros (
      id, request_id, patient, record, service, location, destination,
      transport, oxygen, observation, status, mover, central_observation,
      timestamp, assignment_time, movement_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of demoRequests) {
    stmtReq.run(
      s.id, s.requestId, s.patient, s.record, s.service,
      s.location, s.destination, s.transport, s.oxygen, s.observation,
      s.status, s.mover, s.centralObservation,
      s.timestamp, s.assignmentTime, s.movementTime
    );
  }
  stmtReq.finalize();

  db.get('SELECT count(*) as count FROM solicitudes_camilleros', (err, row) => {
    if (err) return console.error(err);
    console.log('✓ Base de datos SQLite creada exitosamente en:', dbPath);
    console.log('✓ Total de registros en SQLite:', row.count);
    db.close();
  });
});
