import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sqlite3 from 'sqlite3'
import path from 'path'
const dbPath = path.resolve(process.cwd(), 'camilleros.db')

function getSqliteDb() {
  return new sqlite3.Database(dbPath)
}

function apiMiddleware() {
  return {
    name: 'sqlite-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        if (url === '/api/solicitudes') {
          const db = getSqliteDb()
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'GET') {
            db.all('SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC', (err, rows) => {
              db.close()
              if (err) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
              return res.end(JSON.stringify({ source: 'sqlite', data: rows }))
            })
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const s = JSON.parse(body)
                const sql = `
                  INSERT OR REPLACE INTO solicitudes_camilleros (
                    id, request_id, patient, record, service, location, destination,
                    transport, oxygen, observation, status, mover, central_observation,
                    timestamp, assignment_time, movement_time
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `
                const values = [
                  s.id, s.requestId || s.request_id, s.patient, s.record, s.service,
                  s.location, s.destination, s.transport, s.oxygen, s.observation || '',
                  s.status || 'PENDIENTE', s.mover || 'sin asignar', s.centralObservation || s.central_observation || '',
                  s.timestamp, s.assignmentTime || s.assignment_time || null, s.movementTime || s.movement_time || 'pendiente'
                ]
                db.run(sql, values, function(err) {
                  db.close()
                  if (err) {
                    res.statusCode = 500
                    return res.end(JSON.stringify({ error: err.message }))
                  }
                  return res.end(JSON.stringify({ success: true, id: s.id }))
                })
              } catch (err) {
                db.close()
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        if (url === '/api/camilleros') {
          const db = getSqliteDb()
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'GET') {
            db.all('SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC', (err, rows) => {
              db.close()
              if (err) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
              return res.end(JSON.stringify({ source: 'sqlite', data: rows.map(r => r.name) }))
            })
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const { name } = JSON.parse(body)
                if (!name) {
                  db.close()
                  res.statusCode = 400
                  return res.end(JSON.stringify({ error: 'Nombre requerido' }))
                }
                db.run(
                  'INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, 1)',
                  [name.toLowerCase().trim()],
                  function(err) {
                    db.close()
                    if (err) {
                      res.statusCode = 500
                      return res.end(JSON.stringify({ error: err.message }))
                    }
                    return res.end(JSON.stringify({ success: true }))
                  }
                )
              } catch (err) {
                db.close()
                res.statusCode = 500
                return res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          if (req.method === 'DELETE') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const { name } = JSON.parse(body)
                db.run(
                  'UPDATE camilleros_personal SET active = 0 WHERE name = ?',
                  [name.toLowerCase().trim()],
                  function(err) {
                    db.close()
                    if (err) {
                      res.statusCode = 500
                      return res.end(JSON.stringify({ error: err.message }))
                    }
                    return res.end(JSON.stringify({ success: true }))
                  }
                )
              } catch (err) {
                db.close()
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
