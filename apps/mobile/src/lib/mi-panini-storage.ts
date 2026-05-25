/**
 * Mi Panini — upload customer-supplied photo to Supabase Storage so the
 * server can render the printable artwork during fulfillment.
 *
 * Bucket: `panini-customs`
 *   - Public OFF (RLS-protected). Users can only read their own files.
 *   - Path: `<user_id>/<draftId>.jpg`
 *   - Lifecycle: deleted 6 months after order fulfilled (cron, separate).
 */
import * as FileSystem from 'expo-file-system'
import { supabase } from './supabase'

const BUCKET = 'panini-customs'

export async function uploadPaniniPhoto(
  localUri: string,
  userId: string,
  draftId: string,
): Promise<{ publicUrl: string; path: string }> {
  const path = `${userId}/${draftId}.jpg`

  // Read file as base64 so Supabase JS can ingest it via ArrayBuffer.
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  })
  const bytes = base64ToBytes(base64)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) throw new Error(`Photo upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl, path }
}

function base64ToBytes(b64: string): Uint8Array {
  // RN-safe — atob isn't always available, so decode manually via Buffer
  // polyfill provided by react-native-url-polyfill/auto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const G = globalThis as any
  if (typeof G.atob === 'function') {
    const bin = G.atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return arr
  }
  // Fallback — Buffer (RN provides via polyfill or Node compat)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
