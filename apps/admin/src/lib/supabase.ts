'use client'
import { createClient } from '@supabase/supabase-js'

const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

export const supabase = createClient(url, key)

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${productId}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
