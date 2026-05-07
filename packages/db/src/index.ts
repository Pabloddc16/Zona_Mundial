import { createClient } from '@supabase/supabase-js'

// Placeholder until `supabase gen types typescript` is run after Supabase project is set up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: ReturnType<typeof createClient<any>> | null = null

export function getClient() {
  if (_client) return _client

  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return _client
}

// Browser/client-side: uses anon key + RLS
export function getBrowserClient(url: string, anonKey: string) {
  return createClient(url, anonKey)
}
