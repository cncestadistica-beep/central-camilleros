import pkg from 'pg'
const { Pool } = pkg

let pool = null

export function getPgPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || '172.21.21.37',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'bd_estadistica',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Teleco2018',
    })
  }
  return pool
}

export async function queryPg(text, params) {
  const p = getPgPool()
  return await p.query(text, params)
}
