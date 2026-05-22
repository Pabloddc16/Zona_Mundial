/**
 * Star player stock endpoints — admin live inventory editor + mobile reader.
 *
 *   GET  /api/stars/stock                          — list all stock rows (public)
 *   PATCH /api/stars/stock/:slug/:rarity           — admin sets count
 *   POST  /api/stars/stock/decrement               — internal, MP webhook calls
 */
import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

const starsRoutes: FastifyPluginAsync = async (fastify) => {
  // Public read — mobile shop renders stock per (player, rarity).
  fastify.get('/stock', async (_req, reply) => {
    const sb = getClient()
    const { data, error } = await sb
      .from('star_player_stock')
      .select('player_slug, rarity, count, updated_at')
      .order('player_slug')

    if (error) return reply.internalServerError(error.message)
    return { items: data ?? [] }
  })

  // Admin live-edit — set absolute count for (player, rarity).
  fastify.patch('/stock/:slug/:rarity', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { slug, rarity } = req.params as { slug: string; rarity: string }
    const body = req.body as { count?: number }
    const count = Number(body.count ?? -1)

    if (!['BASE', 'BRONCE', 'PLATA', 'ORO'].includes(rarity)) {
      return reply.badRequest('Invalid rarity')
    }
    if (!Number.isInteger(count) || count < 0) {
      return reply.badRequest('count must be a non-negative integer')
    }

    const sb = getClient()
    const { data, error } = await sb
      .from('star_player_stock')
      .upsert({ player_slug: slug, rarity, count, updated_at: new Date().toISOString() })
      .select().single()

    if (error) return reply.internalServerError(error.message)
    return data
  })

  // Internal decrement (webhook-triggered). Uses SQL function for atomicity.
  fastify.post('/stock/decrement', async (req, reply) => {
    const auth = req.headers.authorization ?? ''
    const expected = `Bearer ${process.env['INGEST_SECRET'] ?? ''}`
    if (!process.env['INGEST_SECRET'] || auth !== expected) {
      return reply.unauthorized('Internal endpoint')
    }

    const body = req.body as { items?: Array<{ slug: string; rarity: string; qty: number }> }
    const items = body.items ?? []
    if (items.length === 0) return reply.badRequest('items required')

    const sb = getClient()
    const results: Array<{ slug: string; rarity: string; newCount: number }> = []
    for (const it of items) {
      const { data, error } = await sb.rpc('decrement_star_stock', {
        p_slug: it.slug,
        p_rarity: it.rarity,
        p_qty: it.qty,
      })
      if (error) {
        req.log.warn({ err: error, slug: it.slug, rarity: it.rarity }, 'stock decrement failed')
        continue
      }
      results.push({ slug: it.slug, rarity: it.rarity, newCount: Number(data) })
    }
    return { ok: true, results }
  })
}

export default starsRoutes
