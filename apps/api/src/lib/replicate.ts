/**
 * Replicate API client — minimal wrapper for background-removal.
 *
 * Token: REPLICATE_API_TOKEN env. If missing, calls return null so the
 * Mi Panini flow degrades gracefully (raw selfie used instead).
 *
 * Model: 851-labs/background-remover (rembg variant)
 *   Input:  { image: <public_image_url> }
 *   Output: <png_url> on a Replicate CDN, alpha-transparent background.
 *   Cost:   ~$0.001 per run, ~3-8 sec typical.
 */
const REPLICATE_API = 'https://api.replicate.com/v1'

const MODEL_VERSION =
  // 851-labs/background-remover — latest published version sha as of 2026-05.
  // Update via: curl https://api.replicate.com/v1/models/851-labs/background-remover/versions
  'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc'

interface PredictionResp {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

/** Kick off + poll a background-removal job. Returns the resulting PNG URL
 *  on success, or null on failure or missing token (graceful degrade). */
/** Cheap auth check — hits /v1/account (no credit consumed). Returns the
 *  authenticated account info or null on failure / missing token. */
export async function pingReplicate(): Promise<{ ok: boolean; account?: string; error?: string }> {
  const token = process.env['REPLICATE_API_TOKEN']
  if (!token) return { ok: false, error: 'REPLICATE_API_TOKEN not set' }
  try {
    const r = await fetch(`${REPLICATE_API}/account`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!r.ok) return { ok: false, error: `HTTP ${r.status} ${await r.text()}` }
    const data = (await r.json()) as { username?: string; name?: string }
    return { ok: true, account: data.username ?? data.name ?? 'unknown' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function removeBackground(imageUrl: string): Promise<string | null> {
  const token = process.env['REPLICATE_API_TOKEN']
  if (!token) return null

  // 1. Create prediction
  const createRes = await fetch(`${REPLICATE_API}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MODEL_VERSION,
      input: { image: imageUrl },
    }),
  })
  if (!createRes.ok) {
    console.warn('[replicate] create failed', createRes.status, await createRes.text())
    return null
  }
  const prediction = (await createRes.json()) as PredictionResp

  // 2. Poll every 1.5s until done or 30s timeout
  const deadline = Date.now() + 30_000
  let current = prediction
  while (
    current.status !== 'succeeded' &&
    current.status !== 'failed' &&
    current.status !== 'canceled' &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 1500))
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${current.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!pollRes.ok) {
      console.warn('[replicate] poll failed', pollRes.status)
      return null
    }
    current = (await pollRes.json()) as PredictionResp
  }

  if (current.status !== 'succeeded') {
    console.warn('[replicate] prediction did not succeed', current.status, current.error)
    return null
  }

  const out = current.output
  return Array.isArray(out) ? (out[0] ?? null) : out ?? null
}
