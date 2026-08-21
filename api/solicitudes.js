import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  try {
    if (req.method === 'GET') {
      const response = await executeTurso([
        'SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;'
      ])
      const result = response.results[0]?.response?.result
      const rows = parseRows(result)
      return res.status(200).json({ source: 'turso', data: rows })
    }

    if (req.method === 'POST') {
      const s = req.body
      const sql = `
        INSERT OR REPLACE INTO solicitudes_camilleros (
          id, request_id, patient, record, service, location, destination,
          transport, oxygen, observation, status, mover, central_observation,
          timestamp, assignment_time, movement_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
      const args = [
        s.id, s.requestId || s.request_id, s.patient, s.record, s.service,
        s.location, s.destination, s.transport, s.oxygen, s.observation || '',
        s.status || 'PENDIENTE', s.mover || 'sin asignar', s.centralObservation || s.central_observation || '',
        s.timestamp, s.assignmentTime || s.assignment_time || null, s.movementTime || s.movement_time || 'pendiente'
      ]
      await executeTurso([{ sql, args }])
      return res.status(200).json({ success: true, id: s.id })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en API solicitudes (Turso):', error.message)
    return res.status(500).json({ error: error.message })
  }
}
