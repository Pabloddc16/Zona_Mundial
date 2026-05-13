import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateSaleSchema } from '@pablo/validators'
import { computeSaleTotals } from '../lib/calc.js'
import { recordMovements } from '../services/inventory.js'
import { randomUUID } from 'crypto'

const VALID_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'tarjeta_bbva', 'transferencia']

const salesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/sales
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('sales').select('*, sale_items(*)').order('created_at', { ascending: false })
    if (query['from']) q = q.gte('created_at', query['from'])
    if (query['to']) q = q.lte('created_at', query['to'])

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)

    const page = Math.max(1, Number(query['page'] ?? 1))
    const limit = Math.min(Math.max(Number(query['limit'] ?? 25), 1), 200)
    const total = data?.length ?? 0
    return { items: data?.slice((page - 1) * limit, page * limit) ?? [], total, page, pages: Math.ceil(total / limit), limit }
  })

  // GET /api/sales/today
  fastify.get('/today', { preHandler: fastify.authenticate }, async (_req, reply) => {
    const supabase = getClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [{ data: sales, error }, { data: returns }] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*)').gte('created_at', today.toISOString()),
      supabase.from('returns').select('*, return_items(*)').eq('source', 'pos').gte('created_at', today.toISOString()),
    ])
    if (error) return reply.internalServerError(error.message)

    const revenue = (sales ?? []).reduce((s, x) => s + Number(x.total ?? 0), 0)
    const refundTotal = (returns ?? []).reduce((s, r) => s + Number(r.refund_amount ?? 0), 0)
    const recent = (sales ?? []).slice(0, 10)

    return {
      count: sales?.length ?? 0,
      revenue,
      refundTotal: Math.round(refundTotal * 100) / 100,
      netRevenue: Math.round((revenue - refundTotal) * 100) / 100,
      recent,
    }
  })

  // POST /api/sales
  fastify.post('/', { preHandler: fastify.requireRole('admin', 'capturista') }, async (req, reply) => {
    const parsed = CreateSaleSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { items, payment_method, notes, customer_name, customer_phone, discount_type, discount_value } = parsed.data

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return reply.badRequest('Método de pago inválido')
    }

    const supabase = getClient()
    const productIds = items.map((i) => i.product_id).filter(Boolean) as string[]
    const { data: products } = productIds.length
      ? await supabase.from('products').select('id, cost, stock, name, emoji').in('id', productIds)
      : { data: [] }

    // Validate stock and build enriched items
    const enrichedItems = []
    for (const raw of items) {
      const product = products?.find((p) => p.id === raw.product_id)
      if (raw.product_id && !product) return reply.badRequest(`Producto no encontrado: ${raw.product_id}`)
      if (product && typeof product.stock === 'number' && product.stock < raw.quantity) {
        return reply.badRequest(`Stock insuficiente: ${raw.product_id}`)
      }
      const cost = Number(product?.cost ?? 0)
      enrichedItems.push({
        ...raw,
        name: raw.name || product?.name || '',
        emoji: product?.emoji ?? '',
        cost_at_sale: cost,
      })
    }

    const discountInput = discount_type && discount_value != null
      ? { type: discount_type, value: discount_value }
      : null
    const totals = computeSaleTotals(
      enrichedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal, mode: i.mode })),
      discountInput,
    )
    if (!totals.ok) return reply.badRequest(totals.error)

    const saleId = randomUUID()

    // Deduct stock by recording movements (movements ledger is the single source of truth)
    const saleMovements = enrichedItems
      .filter((i) => i.product_id)
      .map((i) => ({
        sku_id: i.product_id as string,
        qty: Math.ceil(i.quantity),
        location_from: 'loc_warehouse',
        location_to: null,
        type: 'sale' as const,
        ref_table: 'sales',
        ref_id: saleId,
        created_by: req.user?.username ?? null,
      }))
    if (saleMovements.length > 0) {
      try {
        await recordMovements(saleMovements)
      } catch (err) {
        return reply.badRequest((err as Error).message)
      }
    }

    const { data: sale, error } = await supabase.from('sales').insert({
      id: saleId,
      payment_method,
      notes: notes ?? '',
      customer_name: customer_name ?? '',
      customer_phone: customer_phone ?? '',
      total: totals.total,
      created_by: req.user?.username,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)

    await supabase.from('sale_items').insert(
      enrichedItems.map((item, i) => ({ ...item, sale_id: saleId, position: i }))
    )

    reply.code(201)
    return { ...sale, sale_items: enrichedItems, subtotal: totals.subtotal, total: totals.total }
  })
  // DELETE /api/sales/:id — restores stock
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()

    const { data: sale, error: fetchErr } = await supabase
      .from('sales').select('*, sale_items(*)').eq('id', id).single()
    if (fetchErr || !sale) return reply.notFound('Sale not found')

    // Restore stock by recording an inbound 'adjustment' movement back into warehouse
    const restoreMovements = (sale.sale_items ?? [])
      .filter((it: { product_id?: string }) => it.product_id)
      .map((it: { product_id: string; quantity: number }) => ({
        sku_id: it.product_id,
        qty: Math.ceil(Number(it.quantity)),
        location_from: null,
        location_to: 'loc_warehouse',
        type: 'adjustment' as const,
        ref_table: 'sales',
        ref_id: id,
        note: 'Reversal of deleted sale',
        created_by: req.user?.username ?? null,
      }))
    if (restoreMovements.length > 0) {
      await recordMovements(restoreMovements)
    }

    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) return reply.internalServerError(error.message)

    return { ok: true }
  })
}

export default salesRoutes
