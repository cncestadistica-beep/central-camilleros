import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    if (req.method === 'GET') {
      const response = await executeTurso([
        'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;'
      ])
      const result = response.results[0]?.response?.result
      const rows = parseRows(result)
      return res.status(200).json({ source: 'turso', data: rows.map(r => r.name) })
    }

    if (req.method === 'POST') {
      const name = (body.name || req.query.name || '').toLowerCase().trim()
      if (!name) return res.status(400).json({ error: 'Nombre requerido' })
      await executeTurso([{
        sql: 'INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, 1);',
        args: [name]
      }])
      return res.status(200).json({ success: true, name })
    }

    if (req.method === 'DELETE') {
      const name = (body.name || req.query.name || '').toLowerCase().trim()
      if (!name) return res.status(400).json({ error: 'Nombre requerido' })
      await executeTurso([{
        sql: 'DELETE FROM camilleros_personal WHERE LOWER(TRIM(name)) = ?;',
        args: [name]
      }])
      return res.status(200).json({ success: true, name })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en API camilleros (Turso):', error.message)
    return res.status(500).json({ error: error.message })
  }
}
