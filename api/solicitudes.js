import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  const isNetlify = typeof res?.status !== 'function'
  const method = req.method || (isNetlify ? req.httpMethod : 'GET')

  try {
    let body = {}
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } else if (isNetlify && req.json) {
      try { body = await req.json() } catch (_) {}
    }

    if (method === 'GET') {
      const response = await executeTurso([
        'SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;'
      ])
      const result = response.results[0]?.response?.result
      const rows = parseRows(result)
      const bodyData = { source: 'turso', data: rows }

      if (isNetlify) {
        return new Response(JSON.stringify(bodyData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json(bodyData)
    }

    if (method === 'POST') {
      const s = body
      const sql = `
        INSERT OR REPLACE INTO solicitudes_camilleros (
          id, request_id, patient, record, service, location, destination,
          transport, oxygen, observation, status, mover, central_observation,
          timestamp, assignment_time, movement_time, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
      const args = [
        s.id, s.requestId || s.request_id, s.patient, s.record, s.service,
        s.location, s.destination, s.transport, s.oxygen, s.observation || '',
        s.status || 'PENDIENTE', s.mover || 'sin asignar', s.centralObservation || s.central_observation || '',
        s.timestamp, s.assignmentTime || s.assignment_time || null, s.movementTime || s.movement_time || 'pendiente',
        (s.priority || 'media').toLowerCase().trim()
      ]
      await executeTurso([{ sql, args }])
      const bodyData = { success: true, id: s.id }

      if (isNetlify) {
        return new Response(JSON.stringify(bodyData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json(bodyData)
    }

    if (isNetlify) return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en API solicitudes (Turso):', error.message)
    if (isNetlify) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return res.status(500).json({ error: error.message })
  }
}
