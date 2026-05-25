/**
 * Mi Panini routes — custom sticker drafts.
 *
 *   POST   /api/mi-panini/drafts           — bulk insert drafts for an order
 *   GET    /api/mi-panini/drafts/:id       — read single draft (auth scoped)
 *   GET    /api/mi-panini/orders/:n        — drafts for an order (admin view)
 *
 * Mobile flow:
 *   1. User completes wizard, photo uploaded to storage
 *   2. /api/payments/mp/preference creates the order with MI-PANINI-<id> in items
 *   3. After successful payment, mobile (or webhook) POSTs draft metadata here
 *      so admin can print
 *
 * AI background removal via Replicate is a separate optional step;
 * if REPLICATE_API_TOKEN is set, /drafts kicks off async processing.
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getClient } from '@pablo/db'

const DraftSchema = z.object({
  id: z.string().min(4).max(32),
  order_number: z.string().min(3).max(64),
  card_type: z.enum(['BASE', 'BRONCE', 'PLATA', 'ORO']),
  player_name: z.string().min(1).max(64),
  country: z.string().min(2).max(8),
  stats: z.object({
    pace: z.number().int().min(0).max(99),
    shooting: z.number().int().min(0).max(99),
    passing: z.number().int().min(0).max(99),
    defending: z.number().int().min(0).max(99),
  }),
  photo_storage_path: z.string().optional(),
  photo_public_url: z.string().url().optional(),
})

const miPaniniRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/drafts', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { drafts?: unknown[] }
    const parsed = z.array(DraftSchema).safeParse(body.drafts ?? [])
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid drafts payload', issues: parsed.error.issues })
    }

    const userId = req.user!.id
    const sb = getClient()
    const rows = parsed.data.map((d) => ({
      id: d.id,
      user_id: userId,
      order_number: d.order_number,
      card_type: d.card_type,
      player_name: d.player_name,
      country: d.country,
      stat_pace: d.stats.pace,
      stat_shooting: d.stats.shooting,
      stat_passing: d.stats.passing,
      stat_defending: d.stats.defending,
      photo_storage_path: d.photo_storage_path ?? null,
      photo_public_url: d.photo_public_url ?? null,
      status: 'PENDING',
    }))

    const { error } = await sb.from('mi_panini_drafts').upsert(rows, { onConflict: 'id' })
    if (error) return reply.internalServerError(error.message)

    return reply.code(201).send({ ok: true, count: rows.length })
  })

  fastify.get('/drafts/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data, error } = await sb
      .from('mi_panini_drafts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return reply.internalServerError(error.message)
    if (!data) return reply.notFound('Draft not found')
    if (data.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return reply.forbidden('Not your draft')
    }
    return data
  })

  fastify.get('/orders/:n', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { n } = req.params as { n: string }
    const sb = getClient()
    const { data, error } = await sb
      .from('mi_panini_drafts')
      .select('*')
      .eq('order_number', n)
      .order('created_at')

    if (error) return reply.internalServerError(error.message)
    return { items: data ?? [] }
  })
}

export default miPaniniRoutes
