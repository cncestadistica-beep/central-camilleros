const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
});

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

async function seed() {
  const client = await pool.connect();
  for (const s of demoRequests) {
    const query = `
      INSERT INTO solicitudes_camilleros (
        id, request_id, patient, record, service, location, destination,
        transport, oxygen, observation, status, mover, central_observation,
        timestamp, assignment_time, movement_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING;
    `;
    const values = [
      s.id, s.requestId, s.patient, s.record, s.service,
      s.location, s.destination, s.transport, s.oxygen, s.observation,
      s.status, s.mover, s.centralObservation,
      s.timestamp, s.assignmentTime, s.movementTime
    ];
    await client.query(query, values);
  }
  const count = await client.query('SELECT count(*) FROM solicitudes_camilleros;');
  console.log('Solicitudes registradas en PostgreSQL: ' + count.rows[0].count);
  client.release();
  await pool.end();
}

seed();
