export async function executeTurso(statements) {
  const rawUrl = process.env.TURSO_DATABASE_URL || ''
  const url = rawUrl.replace('libsql://', 'https://').trim()
  const token = (process.env.TURSO_AUTH_TOKEN || '').trim()

  if (!url || !token) {
    throw new Error('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN no configuradas')
  }

  const payload = JSON.stringify({
    requests: statements.map(s => {
      if (typeof s === 'string') {
        return { type: 'execute', stmt: { sql: s } }
      }
      return {
        type: 'execute',
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(val => {
            if (val === null || val === undefined) return { type: 'null' }
            if (typeof val === 'number') return { type: 'integer', value: String(val) }
            return { type: 'text', value: String(val) }
          })
        }
      }
    })
  })

  const res = await fetch(url + '/v2/pipeline', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: payload,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Turso HTTP Error ${res.status}: ${errText}`)
  }

  const json = await res.json()
  return json
}

export function parseRows(result) {
  if (!result || !result.cols || !result.rows) return []
  const cols = result.cols.map(c => c.name)
  return result.rows.map(row => {
    const obj = {}
    cols.forEach((col, idx) => {
      obj[col] = row[idx] ? row[idx].value : null
    })
    return obj
  })
}
