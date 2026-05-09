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
    const { data, error } = await getClient().from('conversions').insert({ id, recipe_id: body.recipe_id, qty: body.qty, location_id: body.location_id, notes: body.notes, created_by: req.user?.username }).select().single()
    if (error) throw new Error(error.message)
    return reply.code(201).send(data)
  })

  fastify.patch('/:id/start', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data: conv } = await sb.from('conversions').select('status, qty, recipe:recipes(recipe_lines(*))').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; recipe: { recipe_lines: { input_sku_id: string; input_qty: number }[] } | null }
    if (c.status !== 'planned') return reply.badRequest('Solo conversiones planificadas pueden iniciarse')
    if (!c.recipe?.recipe_lines?.length) return reply.badRequest('La receta no tiene ingredientes')

    const movements = c.recipe.recipe_lines.map((l) => ({
      sku_id: l.input_sku_id, qty: l.input_qty * c.qty,
      location_from: 'loc_warehouse', location_to: 'loc_wip_conv',
      type: 'conversion_out' as const, ref_table: 'conversions', ref_id: id,
      created_by: req.user?.username,
    }))

    await recordMovements(movements)

    const { data } = await sb.from('conversions').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id).select().single()
    return data
  })

  fastify.patch('/:id/finish', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data: conv } = await sb.from('conversions').select('status, qty, location_id, recipe:recipes(output_sku_id, output_qty, recipe_lines(*))').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; location_id: string; recipe: { output_sku_id: string; output_qty: number; recipe_lines: { input_sku_id: string; input_qty: number }[] } | null }
    if (c.status !== 'in_progress') return reply.badRequest('Solo conversiones en progreso pueden finalizarse')

    const wip_location = 'loc_wip_conv'
    const consumeMovements = c.recipe!.recipe_lines.map((l) => ({
      sku_id: l.input_sku_id, qty: l.input_qty * c.qty,
      location_from: wip_location, location_to: null,
      type: 'conversion_out' as const, ref_table: 'conversions', ref_id: id,
      created_by: req.user?.username,
    }))

    const outputQty = c.recipe!.output_qty * c.qty
    const produceMovement = {
      sku_id: c.recipe!.output_sku_id, qty: outputQty,
      location_from: null, location_to: c.location_id,
      type: 'conversion_in' as const, ref_table: 'conversions', ref_id: id,
      created_by: req.user?.username,
    }

    await recordMovements([...consumeMovements, produceMovement])

    const { data } = await sb.from('conversions').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', id).select().single()
    return data
  })

  fastify.patch('/:id/cancel', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data: conv } = await sb.from('conversions').select('status, qty, recipe:recipes(recipe_lines(*))').eq('id', id).single()
    if (!conv) return reply.notFound()
    const c = conv as { status: string; qty: number; recipe: { recipe_lines: { input_sku_id: string; input_qty: number }[] } | null }
    if (c.status === 'done' || c.status === 'cancelled') return reply.badRequest('No se puede cancelar esta conversión')

    if (c.status === 'in_progress') {
      const reverseMovements = c.recipe!.recipe_lines.map((l) => ({
        sku_id: l.input_sku_id, qty: l.input_qty * c.qty,
        location_from: 'loc_wip_conv', location_to: 'loc_warehouse',
        type: 'transfer' as const, ref_table: 'conversions', ref_id: id,
        note: 'Reversión por cancelación',
        created_by: req.user?.username,
      }))
      await recordMovements(reverseMovements)
    }

    const { data } = await sb.from('conversions').update({ status: 'cancelled' }).eq('id', id).select().single()
    return data
  })
}

export default conversionsRoutes
