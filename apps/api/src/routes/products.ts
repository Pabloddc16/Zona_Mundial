import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateProductSchema, UpdateProductSchema, StockAdjustmentSchema } from '@pablo/validators'
import { randomUUID } from 'crypto'

const VALID_ADJUSTMENT_REASONS = ['compra', 'merma', 'ajuste', 'devolucion', 'otro']

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/products — public (mobile store needs this)
  // Stock is computed from the movements ledger (stock materialized view), not from the legacy products.stock column.
  fastify.get('/', async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('products').select('*').order('name', { ascending: true })
    if (query['category']) q = q.eq('category', query['category'])
    if (query['q']) q = q.ilike('name', `%${query['q']}%`)

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)

    // Compute total stock per SKU across all locations from the movements-backed stock view
    const { data: stockRows } = await supabase.from('stock').select('sku_id, qty')
    const stockBySku = new Map<string, number>()
    for (const r of (stockRows ?? []) as Array<{ sku_id: string; qty: number }>) {
      stockBySku.set(r.sku_id, (stockBySku.get(r.sku_id) ?? 0) + Number(r.qty ?? 0))
    }

    const enriched = (data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      stock: stockBySku.get(p['id'] as string) ?? 0,
    }))

    const page = Math.max(1, Number(query['page'] ?? 1))
    const limit = Math.min(Math.max(Number(query['limit'] ?? 25), 1), 200)
    const total = enriched.length
    return { items: enriched.slice((page - 1) * limit, page * limit), total, page, pages: Math.ceil(total / limit), limit }
  })

  // POST /api/products
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const parsed = CreateProductSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const supabase = getClient()
    if (parsed.data.barcode) {
      const { data: dup } = await supabase.from('products').select('id').eq('barcode', parsed.data.barcode).single()
      if (dup) return reply.conflict(`Barcode ya existe (asignado a ${dup.id})`)
    }

    const { data, error } = await supabase.from('products').insert({
      id: randomUUID(),
      ...parsed.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return data
  })

  // GET /api/products/:id — public
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await getClient().from('products').select('*').eq('id', id).single()
    if (error || !data) return reply.notFound('Producto no encontrado')
    return data
  })

  // PATCH /api/products/:id
  fastify.patch('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateProductSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const supabase = getClient()

    // Barcode uniqueness check
    if (parsed.data.barcode) {
      const { data: dup } = await supabase
        .from('products').select('id').eq('barcode', parsed.data.barcode).neq('id', id).single()
      if (dup) return reply.conflict(`Barcode duplicado (asignado a ${dup.id})`)
    }

    const { data, error } = await supabase
      .from('products')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select().single()

    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/products/:id
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()
    const { data: existing } = await supabase.from('products').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Producto no encontrado')
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return reply.internalServerError(error.message)
    return { ok: true }
  })

  // PATCH /api/products/:id/stock — delta adjustment
  fastify.patch('/:id/stock', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { delta?: unknown; reason?: unknown; note?: unknown }

    const delta = Number(body.delta)
    if (!Number.isInteger(delta) || delta === 0) return reply.badRequest('delta debe ser entero distinto de cero')
    if (!VALID_ADJUSTMENT_REASONS.includes(String(body.reason ?? ''))) {
      return reply.badRequest(`Razón inválida. Válidas: ${VALID_ADJUSTMENT_REASONS.join(', ')}`)
    }

    return applyStockDelta({ id, delta, reason: String(body.reason), note: String(body.note ?? ''), user: req.user?.username ?? 'admin', reply })
  })

  // PUT /api/products/:id/stock — set absolute value
  fastify.put('/:id/stock', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { value?: unknown; reason?: unknown; note?: unknown }

    const value = Number(body.value)
    if (!Number.isInteger(value) || value < 0) return reply.badRequest('value debe ser entero >= 0')

    const supabase = getClient()
    const { data: product } = await supabase.from('products').select('stock').eq('id', id).single()
    if (!product) return reply.notFound('Producto no encontrado')

    const delta = value - Number(product.stock ?? 0)
    if (delta === 0) return reply.badRequest('El stock ya tiene ese valor')
    if (!VALID_ADJUSTMENT_REASONS.includes(String(body.reason ?? ''))) {
      return reply.badRequest(`Razón inválida. Válidas: ${VALID_ADJUSTMENT_REASONS.join(', ')}`)
    }

    return applyStockDelta({ id, delta, reason: String(body.reason), note: String(body.note ?? ''), user: req.user?.username ?? 'admin', reply })
  })

  // GET /api/products/:id/stock-adjustments
  fastify.get('/:id/stock-adjustments', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { data, error } = await getClient()
      .from('stock_adjustments').select('*').eq('product_id', id).order('created_at', { ascending: false })
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })

  // GET /api/stock-adjustments (all)
  fastify.get('/adjustments', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const limit = Math.min(Math.max(Number(query['limit'] ?? 50), 1), 500)
    const { data, error } = await getClient()
      .from('stock_adjustments').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })
}

async function applyStockDelta({ id, delta, reason, note, user, reply }: {
  id: string; delta: number; reason: string; note: string; user: string; reply: import('fastify').FastifyReply
}) {
  const supabase = getClient()
  const { data: product, error: fetchErr } = await supabase
    .from('products').select('stock').eq('id', id).single()
  if (fetchErr || !product) return reply.notFound('Producto no encontrado')

  const previousStock = Number(product.stock ?? 0)
  const newStock = previousStock + delta
  if (newStock < 0) return reply.badRequest(`Stock no puede ser negativo (actual: ${previousStock})`)

  const [{ error: updateErr }, { error: adjErr }] = await Promise.all([
    supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', id),
    supabase.from('stock_adjustments').insert({
      id: randomUUID(),
      product_id: id,
      delta,
      previous_stock: previousStock,
      new_stock: newStock,
      reason,
      note: note.slice(0, 200),
      created_by: user,
      created_at: new Date().toISOString(),
    }),
  ])

  if (updateErr) return reply.internalServerError(updateErr.message)
  if (adjErr) return reply.internalServerError(adjErr.message)

  return { product_id: id, previousStock, newStock, delta }
}

export default productsRoutes
