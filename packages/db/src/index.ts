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

  // Verify the key is actually a service_role key — if it's anon, RLS will block
  // every query on tables without explicit anon policies (causing 401s on auth check)
  try {
    const parts = key.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())
      if (payload.role !== 'service_role') {
        console.error(`[db] FATAL: SUPABASE_SERVICE_ROLE_KEY has role="${payload.role}" — expected "service_role". RLS will block queries. Check Render env vars.`)
      } else {
        console.log('[db] Supabase client initialized with service_role key')
      }
    }
  } catch {
    console.warn('[db] Could not decode SUPABASE_SERVICE_ROLE_KEY as JWT')
  }

  // Force explicit Authorization header — prevents any session-state contamination
  // from auth.getUser(token) accidentally swapping the bearer to a user JWT
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  })

  return _client
}

// Browser/client-side: uses anon key + RLS
export function getBrowserClient(url: string, anonKey: string) {
  return createClient(url, anonKey)
}
