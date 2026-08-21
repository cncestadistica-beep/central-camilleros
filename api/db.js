import { createClient } from '@libsql/client/web'

let client = null

export function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) return null
  if (!client) {
    client = createClient({
      url: url.trim(),
      authToken: authToken ? authToken.trim() : undefined,
    })
  }
  return client
}
