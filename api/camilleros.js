import { executeTurso, parseRows } from './turso.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  try {
    if (req.method === 'GET') {
      const response = await executeTurso([
        'SELECT name FROM camilleros_personal WHERE active = 1 ORDER BY name ASC;'
      ])
      const result = response.results[0]?.response?.result
      const rows = parseRows(result)
      return res.status(200).json({ source: 'turso', data: rows.map(r => r.name) })
    }

    if (req.method === 'POST') {
      const { name } = req.body
      if (!name) return res.status(400).json({ error: 'Nombre requerido' })
      await executeTurso([{
        sql: 'INSERT OR REPLACE INTO camilleros_personal (name, active) VALUES (?, 1);',
        args: [name.toLowerCase().trim()]
      }])
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { name } = req.body
      if (!name) return res.status(400).json({ error: 'Nombre requerido' })
      await executeTurso([{
        sql: 'UPDATE camilleros_personal SET active = 0 WHERE name = ?;',
        args: [name.toLowerCase().trim()]
      }])
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (error) {
    console.error('Error en API camilleros (Turso):', error.message)
    return res.status(500).json({ error: error.message })
  }
}
