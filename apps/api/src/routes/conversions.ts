import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'
import { recordMovements } from '../services/inventory.js'

const conversionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>
    const sb = getClient()
    const p = Number(page), l = Number(limit), from = (p - 1) * l
    let q = sb.from('conversions').select(
      '*, recipe:recipes(name, output_sku_id, output_qty, output_product:products!output_sku_id(name, sku)), location:locations!location_id(name)',
      { count: 'exact' }
    ).order('created_at', { ascending: false }).range(from, from + l - 1)
    if (status) q = q.eq('status', status) as typeof q
    const { data, count, error } = await q
    if (error) throw new Error(error.message)
    return { items: data, total: count ?? 0, page: p, pages: Math.ceil((count ?? 0) / l), limit: l }
  })

  fastify.get('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await getClient()
      .from('conversions')
      .select('*, recipe:recipes(*, recipe_lines(*, product:products!input_sku_id(name, sku))), location:locations!location_id(name)')
      .eq('id', id).single()
    if (error) return reply.notFound()
    return data
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { recipe_id?: string; qty?: number; location_id?: string; notes?: string }
    if (!body.recipe_id || !body.qty || !body.location_id) return reply.badRequest('recipe_id, qty y location_id requeridos')
    const id = `conv_${randomUUID().slice(0, 8)}`
    const { data, error } = await getClient().from('conversions').insert({ id, recipe_id: body.recipe_id, qty: body.qty, location_id: body.location_id, notes: body.notes, created_by: req.user?.username ?? null }).select().single()
    if (error) throw new Error(error.message)
    return reply.code(201).send(data)
  })

  fastify.patch('/:id/start', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()

    const { data: conv } = await sb.from('conversions').select('status, qty, recipe_id').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; recipe_id: string }
    if (c.status !== 'planned') return reply.badRequest(`Conversion is already '${c.status}', only 'planned' can be started`)

    // Fetch recipe lines manually — PostgREST nested embed can return [] inconsistently
    const { data: linesData } = await sb.from('recipe_lines').select('input_sku_id, input_qty').eq('recipe_id', c.recipe_id)
    const lines = (linesData ?? []) as Array<{ input_sku_id: string; input_qty: number }>
    if (lines.length === 0) return reply.badRequest('Recipe has no ingredients — add ingredient lines before starting a conversion')

    const movements = lines.map((l) => ({
      sku_id: l.input_sku_id,
      qty: l.input_qty * c.qty,
      location_from: 'loc_warehouse',
      location_to: 'loc_wip_conv',
      type: 'conversion_out' as const,
      ref_table: 'conversions',
      ref_id: id,
      created_by: req.user?.username ?? null,
    }))

    try {
      await recordMovements(movements)
    } catch (err) {
      return reply.badRequest((err as Error).message)
    }

    const { data } = await sb.from('conversions').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id).select().single()
    return data
  })

  fastify.patch('/:id/finish', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()

    const { data: conv } = await sb.from('conversions').select('status, qty, location_id, recipe_id').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; location_id: string; recipe_id: string }
    if (c.status !== 'in_progress') return reply.badRequest(`Conversion is '${c.status}', only 'in_progress' can be finished`)

    const { data: recipe } = await sb.from('recipes').select('output_sku_id, output_qty').eq('id', c.recipe_id).single()
    if (!recipe) return reply.badRequest('Linked recipe not found')

    const { data: linesData } = await sb.from('recipe_lines').select('input_sku_id, input_qty').eq('recipe_id', c.recipe_id)
    const lines = (linesData ?? []) as Array<{ input_sku_id: string; input_qty: number }>
    if (lines.length === 0) return reply.badRequest('Recipe has no ingredients to consume')

    const wip_location = 'loc_wip_conv'
    const consumeMovements = lines.map((l) => ({
      sku_id: l.input_sku_id,
      qty: l.input_qty * c.qty,
      location_from: wip_location,
      location_to: null,
      type: 'conversion_out' as const,
      ref_table: 'conversions',
      ref_id: id,
      created_by: req.user?.username ?? null,
    }))

    const outputQty = (recipe as { output_qty: number }).output_qty * c.qty
    const produceMovement = {
      sku_id: (recipe as { output_sku_id: string }).output_sku_id,
      qty: outputQty,
      location_from: null,
      location_to: c.location_id,
      type: 'conversion_in' as const,
      ref_table: 'conversions',
      ref_id: id,
      created_by: req.user?.username ?? null,
    }

    try {
      await recordMovements([...consumeMovements, produceMovement])
    } catch (err) {
      return reply.badRequest((err as Error).message)
    }

    const { data } = await sb.from('conversions').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', id).select().single()
    return data
  })

  fastify.patch('/:id/cancel', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()

    const { data: conv } = await sb.from('conversions').select('status, qty, recipe_id').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; recipe_id: string }
    if (c.status === 'done' || c.status === 'cancelled') return reply.badRequest(`Conversion is already '${c.status}'`)

    if (c.status === 'in_progress') {
      const { data: linesData } = await sb.from('recipe_lines').select('input_sku_id, input_qty').eq('recipe_id', c.recipe_id)
      const lines = (linesData ?? []) as Array<{ input_sku_id: string; input_qty: number }>
      if (lines.length > 0) {
        const reverseMovements = lines.map((l) => ({
          sku_id: l.input_sku_id,
          qty: l.input_qty * c.qty,
          location_from: 'loc_wip_conv',
          location_to: 'loc_warehouse',
          type: 'transfer' as const,
          ref_table: 'conversions',
          ref_id: id,
          note: 'Cancellation reversal',
          created_by: req.user?.username ?? null,
        }))
        try {
          await recordMovements(reverseMovements)
        } catch (err) {
          return reply.badRequest((err as Error).message)
        }
      }
    }

    const { data } = await sb.from('conversions').update({ status: 'cancelled' }).eq('id', id).select().single()
    return data
  })
}

export default conversionsRoutes
