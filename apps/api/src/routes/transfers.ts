import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'
import { recordMovements } from '../services/inventory.js'

const transfersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>
    const sb = getClient()
    const p = Number(page), l = Number(limit), from = (p - 1) * l
    let q = sb.from('transfers').select('*, from_location:locations!from_loc(name, type), to_location:locations!to_loc(name, type)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + l - 1)
    if (status) q = q.eq('status', status) as typeof q
    const { data, count, error } = await q
    if (error) throw new Error(error.message)
    return { items: data, total: count ?? 0, page: p, pages: Math.ceil((count ?? 0) / l), limit: l }
  })

  fastify.get('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await getClient()
      .from('transfers')
      .select('*, from_location:locations!from_loc(name, type), to_location:locations!to_loc(name, type), lines:transfer_lines(*, product:products!sku_id(name, sku))')
      .eq('id', id).single()
    if (error) return reply.notFound()
    return data
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { from_loc?: string; to_loc?: string; notes?: string; lines?: { sku_id: string; qty: number }[] }
    if (!body.from_loc || !body.to_loc) return reply.badRequest('from_loc y to_loc requeridos')
    if (body.from_loc === body.to_loc) return reply.badRequest('from_loc y to_loc deben ser diferentes')
    if (!body.lines?.length) return reply.badRequest('lines requerido')

    const sb = getClient()
    const id = `tr_${randomUUID().slice(0, 8)}`
    const { data, error } = await sb.from('transfers').insert({ id, from_loc: body.from_loc, to_loc: body.to_loc, notes: body.notes, created_by: req.user?.username }).select().single()
    if (error) throw new Error(error.message)

    const lineRows = body.lines.map((l) => ({ id: `trl_${randomUUID().slice(0, 8)}`, transfer_id: id, sku_id: l.sku_id, qty: l.qty }))
    await sb.from('transfer_lines').insert(lineRows)
    return reply.code(201).send(data)
  })

  fastify.patch('/:id/complete', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const sb = getClient()
    const { data: transfer } = await sb.from('transfers').select('status, from_loc, to_loc, transfer_lines(*)').eq('id', id).single()
    if (!transfer) return reply.notFound()
    const t = transfer as { status: string; from_loc: string; to_loc: string; transfer_lines: { sku_id: string; qty: number }[] }
    if (t.status !== 'draft') return reply.badRequest('Solo se pueden completar transferencias en borrador')

    const movements = t.transfer_lines.map((l) => ({
      sku_id: l.sku_id, qty: l.qty, location_from: t.from_loc, location_to: t.to_loc,
      type: 'transfer' as const, ref_table: 'transfers', ref_id: id, created_by: req.user?.username,
    }))

    await recordMovements(movements)

    const { data } = await sb.from('transfers').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).select().single()
    return data
  })

  fastify.patch('/:id/cancel', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data: transfer } = await getClient().from('transfers').select('status').eq('id', id).single()
    if (!transfer) return reply.notFound()
    if ((transfer as { status: string }).status !== 'draft') return reply.badRequest('Solo se pueden cancelar transferencias en borrador')
    const { data } = await getClient().from('transfers').update({ status: 'cancelled' }).eq('id', id).select().single()
    return data
  })
}

export default transfersRoutes
