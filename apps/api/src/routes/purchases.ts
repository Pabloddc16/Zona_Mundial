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
    const sb = getClient()
    const { data: purchase, error } = await sb.from('purchases').select('*').eq('id', id).single()
    if (error || !purchase) {
      req.log.warn({ id, err: error?.message }, 'purchase detail not found')
      return reply.notFound('Purchase not found')
    }

    const { data: lines } = await sb.from('purchase_lines').select('*').eq('purchase_id', id)
    const rows = (lines ?? []) as Array<{ id: string; purchase_id: string; sku_id: string; qty: number; unit_cost: number; received_to: string | null }>

    const skuIds = [...new Set(rows.map((l) => l.sku_id).filter(Boolean))]
    const locIds = [...new Set(rows.map((l) => l.received_to).filter(Boolean) as string[])]
    if (purchase['received_to']) locIds.push(purchase['received_to'])

    const [{ data: products }, { data: locations }] = await Promise.all([
      skuIds.length ? sb.from('products').select('id, name, sku, unit_type').in('id', skuIds) : Promise.resolve({ data: [] }),
      locIds.length ? sb.from('locations').select('id, name').in('id', locIds) : Promise.resolve({ data: [] }),
    ])
    const productById = new Map((products ?? []).map((p) => [p.id, p]))
    const locationById = new Map((locations ?? []).map((l) => [l.id, l]))

    const enrichedLines = rows.map((l) => ({ ...l, product: productById.get(l.sku_id) ?? null }))
    const receivedLocation = purchase['received_to'] ? locationById.get(purchase['received_to'] as string) ?? null : null

    return { ...purchase, lines: enrichedLines, received_location: receivedLocation }
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
    const body = req.body as { payment_method?: string } | undefined
    const paymentMethod = body?.payment_method ?? 'efectivo'

    const sb = getClient()
    const { data: purchase } = await sb
      .from('purchases')
      .select('status, supplier, purchase_lines(qty, unit_cost)')
      .eq('id', id)
      .single()
    if (!purchase) return reply.notFound()
    const pur = purchase as { status: string; supplier: string; purchase_lines: { qty: number; unit_cost: number }[] }
    if (pur.status !== 'draft') return reply.badRequest('Solo se puede marcar como pagada una compra en borrador')

    const total = (pur.purchase_lines ?? []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unit_cost), 0)

    const { data, error } = await sb
      .from('purchases')
      .update({ status: 'paid', paid_at: new Date().toISOString(), total })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Auto-create an expense row so purchases reflect in accounts/cashflow.
    if (total > 0) {
      await sb.from('expenses').insert({
        id: `exp_${randomUUID().slice(0, 8)}`,
        date: new Date().toISOString().slice(0, 10),
        concept: `Compra a ${pur.supplier}`,
        category: 'inventory',
        amount: total,
        payment_method: paymentMethod,
        notes: `Auto-creado al pagar compra ${id}`,
        created_by: req.user?.username ?? null,
      })
    }

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
    const sb = getClient()
    const { data: purchase } = await sb.from('purchases').select('status').eq('id', id).single()
    if (!purchase) return reply.notFound()
    const prevStatus = (purchase as { status: string }).status
    if (prevStatus === 'received') return reply.badRequest('No se puede cancelar una compra ya recibida')

    const { data } = await sb.from('purchases').update({ status: 'cancelled' }).eq('id', id).select().single()

    // If the purchase was already paid, remove the auto-created expense row so accounts stay accurate.
    if (prevStatus === 'paid') {
      await sb.from('expenses').delete().like('notes', `%compra ${id}%`)
    }

    return data
  })
}

export default purchasesRoutes
