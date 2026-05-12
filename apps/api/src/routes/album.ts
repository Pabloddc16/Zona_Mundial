import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

const albumRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/album — full album state of the current user
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const sb = getClient()
    const { data, error } = await sb
      .from('album_stickers')
      .select('group_id, sticker_n, owned, needed')
      .eq('user_id', req.user!.id)
    if (error) throw new Error(error.message)
    const album: Record<string, Record<number, { owned: number; needed: number }>> = {}
    for (const r of (data ?? []) as Array<{ group_id: string; sticker_n: number; owned: number; needed: number }>) {
      if (!album[r.group_id]) album[r.group_id] = {}
      album[r.group_id]![r.sticker_n] = { owned: r.owned, needed: r.needed }
    }
    return { album }
  })

  // PUT /api/album/sticker — upsert one sticker
  fastify.put('/sticker', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { group_id?: string; sticker_n?: number; owned?: number; needed?: number }
    if (!body.group_id || typeof body.sticker_n !== 'number') return reply.badRequest('group_id and sticker_n required')
    const sb = getClient()
    const { error } = await sb.from('album_stickers').upsert({
      user_id: req.user!.id,
      group_id: body.group_id,
      sticker_n: body.sticker_n,
      owned: Math.max(0, Number(body.owned ?? 0)),
      needed: Math.max(0, Number(body.needed ?? 0)),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,group_id,sticker_n' })
    if (error) return reply.internalServerError(error.message)
    return { ok: true }
  })

  // POST /api/album/bulk — replace many stickers at once (for initial sync from local)
  fastify.post('/bulk', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { stickers?: Array<{ group_id: string; sticker_n: number; owned: number; needed: number }> }
    if (!Array.isArray(body.stickers)) return reply.badRequest('stickers array required')
    const sb = getClient()
    const rows = body.stickers.map((s) => ({
      user_id: req.user!.id,
      group_id: s.group_id,
      sticker_n: s.sticker_n,
      owned: Math.max(0, Number(s.owned ?? 0)),
      needed: Math.max(0, Number(s.needed ?? 0)),
      updated_at: new Date().toISOString(),
    }))
    if (rows.length === 0) return { ok: true, count: 0 }
    const { error } = await sb.from('album_stickers').upsert(rows, { onConflict: 'user_id,group_id,sticker_n' })
    if (error) return reply.internalServerError(error.message)
    return { ok: true, count: rows.length }
  })
}

export default albumRoutes
