import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pkg
const pgPool = new Pool({
  host: process.env.DB_HOST || '172.21.21.37',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_estadistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Teleco2018',
})

function apiMiddleware() {
  return {
    name: 'postgres-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        if (url === '/api/sync') {
          res.setHeader('Content-Type', 'application/json')
          if (req.method === 'GET') {
            try {
              const reqsRes = await pgPool.query('SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;')
              const camsRes = await pgPool.query('SELECT name FROM camilleros_personal WHERE active = true ORDER BY name ASC;')
              const requests = reqsRes.rows || []
              const camilleros = (camsRes.rows || []).map(r => r.name)
              return res.end(JSON.stringify({ success: true, requests, camilleros }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ error: err.message }))
            }
          }
        }

        if (url === '/api/solicitudes') {
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'GET') {
            try {
              const rowsRes = await pgPool.query('SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;')
              return res.end(JSON.stringify({ source: 'postgres', data: rowsRes.rows || [] }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ error: err.message }))
            }
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const s = JSON.parse(body)
                const sql = `
                  INSERT INTO solicitudes_camilleros (
                    id, request_id, patient, record, service, location, destination,
                    transport, oxygen, observation, status, mover, central_observation,
                    timestamp, assignment_time, movement_time, priority
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                  ON CONFLICT (id) DO UPDATE SET
                    request_id = EXCLUDED.request_id,
                    patient = EXCLUDED.patient,
                    record = EXCLUDED.record,
                    service = EXCLUDED.service,
                    location = EXCLUDED.location,
                    destination = EXCLUDED.destination,
                    transport = EXCLUDED.transport,
                    oxygen = EXCLUDED.oxygen,
                    observation = EXCLUDED.observation,
                    status = EXCLUDED.status,
                    mover = EXCLUDED.mover,
                    central_observation = EXCLUDED.central_observation,
                    timestamp = EXCLUDED.timestamp,
                    assignment_time = EXCLUDED.assignment_time,
                    movement_time = EXCLUDED.movement_time,
                    priority = EXCLUDED.priority;
                `
                const values = [
                  s.id, s.requestId || s.request_id, s.patient, s.record, s.service,
                  s.location, s.destination, s.transport, s.oxygen || 'no', s.observation || '',
                  s.status || 'PENDIENTE', s.mover || 'sin asignar', s.centralObservation || s.central_observation || '',
                  s.timestamp, s.assignmentTime || s.assignment_time || null, s.movementTime || s.movement_time || 'pendiente',
                  (s.priority || 'media').toLowerCase().trim()
                ]
                await pgPool.query(sql, values)
                return res.end(JSON.stringify({ success: true, id: s.id }))
              } catch (err) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        if (url === '/api/camilleros') {
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'GET') {
            try {
              const rowsRes = await pgPool.query('SELECT name FROM camilleros_personal WHERE active = true ORDER BY name ASC;')
              return res.end(JSON.stringify({ source: 'postgres', data: (rowsRes.rows || []).map(r => r.name) }))
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ error: err.message }))
            }
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const { name } = JSON.parse(body)
                if (!name) {
                  res.statusCode = 400
                  return res.end(JSON.stringify({ error: 'Nombre requerido' }))
                }
                await pgPool.query(
                  'INSERT INTO camilleros_personal (name, active) VALUES ($1, true) ON CONFLICT (name) DO UPDATE SET active = true;',
                  [name.toLowerCase().trim()]
                )
                return res.end(JSON.stringify({ success: true }))
              } catch (err) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const { name } = JSON.parse(body)
                await pgPool.query(
                  'UPDATE camilleros_personal SET active = false WHERE LOWER(TRIM(name)) = $1;',
                  [name.toLowerCase().trim()]
                )
                return res.end(JSON.stringify({ success: true }))
              } catch (err) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), apiMiddleware()],
  server: {
    host: true,
    port: 3000,
  }
})
