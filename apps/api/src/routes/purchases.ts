import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'
import { recordMovements } from '../services/inventory.js'

const purchasesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>
    const sb = getClient()
    const p = Number(page), l = Number(limit), from = (p - 1) * l
    let q = sb.from('purchases').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + l - 1)
    if (status) q = q.eq('status', status) as typeof q
    const { data, count, error } = await q
    if (error) throw new Error(error.message)
    return { items: data, total: count ?? 0, page: p, pages: Math.ceil((count ?? 0) / l), limit: l }
  })

  fastify.get('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await getClient()
      .from('purchases')
      .select('*, lines:purchase_lines(*, product:products!sku_id(name, sku, unit_type)), received_location:locations!received_to(name)')
      .eq('id', id).single()
    if (error) return reply.notFound('Compra no encontrada')
    return data
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { supplier?: string; notes?: string; lines?: { sku_id: string; qty: number; unit_cost: number; received_to?: string }[] }
    if (!body.supplier) return reply.badRequest('supplier requerido')
    if (!body.lines?.length) return reply.badRequest('lines requerido')

    const sb = getClient()
    const id = `pur_${randomUUID().slice(0, 8)}`
    const total = body.lines.reduce((s, l) => s + l.qty * l.unit_cost, 0)

    const { data, error } = await sb.from('purchases').insert({ id, supplier: body.supplier, notes: body.notes, total, created_by: req.user?.username }).select().single()
    if (error) throw new Error(error.message)

    const lineRows = body.lines.map((l) => ({ id: `pl_${randomUUID().slice(0, 8)}`, purchase_id: id, sku_id: l.sku_id, qty: l.qty, unit_cost: l.unit_cost, received_to: l.received_to ?? 'loc_warehouse' }))
    await sb.from('purchase_lines').insert(lineRows)

    return reply.code(201).send(data)
  })

  fastify.patch('/:id/pay', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data: purchase } = await getClient().from('purchases').select('status').eq('id', id).single()
    if (!purchase) return reply.notFound()
    if ((purchase as { status: string }).status !== 'draft') return reply.badRequest('Solo se puede marcar como pagada una compra en borrador')
    const { data, error } = await getClient().from('purchases').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  })

  fastify.patch('/:id/receive', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data: purchase } = await sb.from('purchases').select('status, purchase_lines(*)').eq('id', id).single()
    if (!purchase) return reply.notFound()
    const pur = purchase as { status: string; purchase_lines: { sku_id: string; qty: number; unit_cost: number; received_to: string }[] }
    if (!['draft', 'paid'].includes(pur.status)) return reply.badRequest('Solo se puede recibir una compra en borrador o pagada')

    const movements = pur.purchase_lines.map((l) => ({
      sku_id: l.sku_id,
      qty: l.qty,
      location_from: null,
      location_to: l.received_to ?? 'loc_warehouse',
      type: 'purchase_in' as const,
      ref_table: 'purchases',
      ref_id: id,
      unit_cost: l.unit_cost,
      created_by: req.user?.username ?? null,
    }))

    await recordMovements(movements)

    const { data, error } = await sb.from('purchases').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  })

  fastify.patch('/:id/cancel', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data: purchase } = await getClient().from('purchases').select('status').eq('id', id).single()
    if (!purchase) return reply.notFound()
    if ((purchase as { status: string }).status === 'received') return reply.badRequest('No se puede cancelar una compra ya recibida')
    const { data } = await getClient().from('purchases').update({ status: 'cancelled' }).eq('id', id).select().single()
    return data
  })
}

export default purchasesRoutes
