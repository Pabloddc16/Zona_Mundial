'use client'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'https://skjlfwgmfaysrdtprrvc.supabase.co'
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNramxmd2dtZmF5c3JkdHBycnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzM1MDQsImV4cCI6MjA5MzI0OTUwNH0.Up8Z5pFmOBfL6vjkRDWMdxiSRpXbw4TDpkkUUdRoynU'

async function getSupabase() {
  const at = typeof window !== 'undefined' ? localStorage.getItem('pablo-at') : null
  const rt = typeof window !== 'undefined' ? localStorage.getItem('pablo-rt') : null
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  if (at && rt) {
    await client.auth.setSession({ access_token: at, refresh_token: rt })
  }
  return client
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const supabase = await getSupabase()
  const ext = file.name.split('.').pop()
  const path = `${productId}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
