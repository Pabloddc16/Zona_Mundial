import { createClient } from '@supabase/supabase-js'

// Database types will be auto-generated here via:
// pnpm --filter @pablo/db generate-types
// which runs: supabase gen types typescript --local > src/database.types.ts
// Until then, we use a placeholder. Replace with generated types after Supabase project is set up.
export type Database = Record<string, unknown>

let _client: ReturnType<typeof createClient<Database>> | null = null

export function getClient() {
  if (_client) return _client

  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  _client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })

  return _client
}

// Browser/client-side: uses anon key + RLS
export function getBrowserClient(url: string, anonKey: string) {
  return createClient<Database>(url, anonKey)
}
