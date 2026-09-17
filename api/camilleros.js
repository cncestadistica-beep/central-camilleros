import { queryPg } from './db.js'

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
      const response = await queryPg('SELECT name FROM camilleros_personal WHERE active = true ORDER BY name ASC;')
      const rows = response.rows || []
      const bodyData = { source: 'postgres', data: rows.map(r => r.name) }

      if (isNetlify) {
        return new Response(JSON.stringify(bodyData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json(bodyData)
    }

    if (method === 'DELETE' || body.action === 'delete' || body.action === 'DELETE') {
      const name = (body.name || '').toLowerCase().trim()
      if (!name) {
        if (isNetlify) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 })
        return res.status(400).json({ error: 'Nombre requerido' })
      }
      await queryPg(
        'UPDATE camilleros_personal SET active = false WHERE LOWER(TRIM(name)) = $1;',
        [name]
      )
      const bodyData = { success: true, name }

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
      const name = (body.name || '').toLowerCase().trim()
      if (!name) {
        if (isNetlify) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 })
        return res.status(400).json({ error: 'Nombre requerido' })
      }
      await queryPg(
        'INSERT INTO camilleros_personal (name, active) VALUES ($1, true) ON CONFLICT (name) DO UPDATE SET active = true;',
        [name]
      )
      const bodyData = { success: true, name }

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
    console.error('Error en API camilleros (PostgreSQL):', error.message)
    if (isNetlify) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return res.status(500).json({ error: error.message })
  }
}
