import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  try {
    if (req.method === 'GET') {
      const response = await executeTurso([
        { type: 'execute', stmt: { sql: 'SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;' } },
        { type: 'execute', stmt: { sql: 'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;' } }
      ])

      const requestsResult = response.results[0]?.response?.result
      const camillerosResult = response.results[1]?.response?.result

      const requests = parseRows(requestsResult)
      const camilleros = parseRows(camillerosResult).map(r => r.name)

      return res.status(200).json({
        success: true,
        requests,
        camilleros
      })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en API sync (Turso):', error.message)
    return res.status(500).json({ error: error.message })
  }
}
