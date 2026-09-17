import pkg from 'pg'
const { Pool } = pkg

let pool = null

export function getPgPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'aws-0-us-east-2.pooler.supabase.com',
      port: parseInt(process.env.DB_PORT || '6543', 10),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres.vgkpnhtctbdmnnxnmlyi',
      password: process.env.DB_PASSWORD || 'nza0p2WbAJSNCPvs',
      ssl: { rejectUnauthorized: false }
    })
  }
  return pool
}

export async function queryPg(text, params) {
  const p = getPgPool()
  return await p.query(text, params)
}
