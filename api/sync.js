import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  const isNetlify = typeof res?.status !== 'function'
  const method = req.method || (isNetlify ? req.httpMethod : 'GET')

  try {
    if (method === 'GET') {
      const response = await executeTurso([
        { type: 'execute', stmt: { sql: 'SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;' } },
        { type: 'execute', stmt: { sql: 'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;' } }
      ])

      const requestsResult = response.results[0]?.response?.result
      const camillerosResult = response.results[1]?.response?.result

      const requests = parseRows(requestsResult)
      const camilleros = parseRows(camillerosResult).map(r => r.name)
      const bodyData = { success: true, requests, camilleros }

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
    console.error('Error en API sync (Turso):', error.message)
    if (isNetlify) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return res.status(500).json({ error: error.message })
  }
}
