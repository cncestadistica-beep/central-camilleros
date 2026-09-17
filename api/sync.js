import { queryPg } from './db.js'

export default async function handler(req, res) {
  const isNetlify = typeof res?.status !== 'function'
  const method = req.method || (isNetlify ? req.httpMethod : 'GET')

  try {
    if (method === 'GET') {
      const requestsRes = await queryPg('SELECT * FROM solicitudes_camilleros ORDER BY created_at DESC;')
      const camillerosRes = await queryPg('SELECT name FROM camilleros_personal WHERE active = true ORDER BY name ASC;')

      const requests = requestsRes.rows || []
      const camilleros = (camillerosRes.rows || []).map(r => r.name)
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
    console.error('Error en API sync (PostgreSQL):', error.message)
    if (isNetlify) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return res.status(500).json({ error: error.message })
  }
}
