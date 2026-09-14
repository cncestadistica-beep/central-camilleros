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
        'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;'
      ])
      const result = response.results[0]?.response?.result
      const rows = parseRows(result)
      const bodyData = { source: 'turso', data: rows.map(r => r.name) }

      if (isNetlify) {
        return new Response(JSON.stringify(bodyData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json(bodyData)
    }

    const updateSyncSql = `
      INSERT OR REPLACE INTO app_sync_state (id, version, updated_at)
      VALUES ('global', COALESCE((SELECT version FROM app_sync_state WHERE id = 'global'), 0) + 1, datetime('now'));
    `

    if (method === 'DELETE' || body.action === 'delete' || body.action === 'DELETE') {
      const name = (body.name || '').toLowerCase().trim()
      if (!name) {
        if (isNetlify) return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 })
        return res.status(400).json({ error: 'Nombre requerido' })
      }
      await executeTurso([
        {
          sql: 'DELETE FROM camilleros_personal WHERE LOWER(TRIM(name)) = ?;',
          args: [name]
        },
        { type: 'execute', stmt: { sql: updateSyncSql } }
      ])
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
      await executeTurso([
        {
          sql: 'INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, 1);',
          args: [name]
        },
        { type: 'execute', stmt: { sql: updateSyncSql } }
      ])
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
    console.error('Error en API camilleros (Turso):', error.message)
    if (isNetlify) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return res.status(500).json({ error: error.message })
  }
}
