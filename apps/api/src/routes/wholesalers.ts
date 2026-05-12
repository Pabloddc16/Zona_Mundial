import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateWholesalerSchema, CreateWholesaleSaleSchema, RecordPaymentSchema } from '@pablo/validators'
import { randomUUID } from 'crypto'
import Stripe from 'stripe'
import QRCode from 'qrcode'

const VALID_WHOLESALE_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'credito']
const WHOLESALER_FORBIDDEN_FIELDS = ['tier', 'discount', 'discountPercent', 'priceFactor', 'factor']

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
const CP_RE = /^\d{5}$/

function recalcStatus(total: number, payments: Array<{ amount: number }>) {
  const paid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const rounded = Math.round(paid * 100) / 100
  let status: string
  if (rounded >= total - 0.001) status = 'pagado'
  else if (rounded > 0) status = 'parcial'
  else status = 'pendiente_credito'
  return { paid: rounded, status, saldo: Math.max(0, Math.round((total - rounded) * 100) / 100) }
}

const wholesalersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/wholesalers
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('wholesalers').select('*').order('razon_social')
    if (query['active'] === 'true') q = q.eq('active', true)
    if (query['active'] === 'false') q = q.eq('active', false)

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })

  // POST /api/wholesalers
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const body = req.body as Record<string, unknown>

    const forbidden = WHOLESALER_FORBIDDEN_FIELDS.filter((f) => body[f] !== undefined)
    if (forbidden.length) return reply.badRequest(`Campo(s) no permitido(s): ${forbidden.join(', ')}`)

    const parsed = CreateWholesalerSchema.safeParse(body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { rfc, regimen_fiscal, codigo_postal } = parsed.data
    if (rfc && !RFC_RE.test(rfc)) return reply.badRequest('RFC con formato inválido')
    if (regimen_fiscal && !/^\d{3}$/.test(regimen_fiscal)) return reply.badRequest('regimenFiscal inválido (3 dígitos SAT)')
    if (codigo_postal && !CP_RE.test(codigo_postal)) return reply.badRequest('codigoPostal inválido (5 dígitos)')

    const { data, error } = await getClient().from('wholesalers').insert({
      id: randomUUID(),
      ...parsed.data,
      active: true,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return data
  })

  // PATCH /api/wholesalers/:id
  fastify.patch('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const forbidden = WHOLESALER_FORBIDDEN_FIELDS.filter((f) => body[f] !== undefined)
    if (forbidden.length) return reply.badRequest(`Campo(s) no permitido(s): ${forbidden.join(', ')}`)

    const supabase = getClient()
    const { data: existing } = await supabase.from('wholesalers').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Mayorista no encontrado')

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const fields = ['razon_social', 'rfc', 'email', 'contacto', 'nota', 'active', 'regimen_fiscal', 'uso_cfdi', 'codigo_postal'] as const
    for (const f of fields) {
      if (body[f] === undefined) continue
      if (f === 'rfc') {
        const v = String(body[f]).trim().toUpperCase()
        if (v && !RFC_RE.test(v)) return reply.badRequest('RFC con formato inválido')
        updates[f] = v
      } else if (f === 'regimen_fiscal') {
        const v = String(body[f]).trim()
        if (v && !/^\d{3}$/.test(v)) return reply.badRequest('regimenFiscal inválido (3 dígitos SAT)')
        updates[f] = v
      } else if (f === 'codigo_postal') {
        const v = String(body[f]).trim()
        if (v && !CP_RE.test(v)) return reply.badRequest('codigoPostal inválido (5 dígitos)')
        updates[f] = v
      } else if (f === 'active') {
        updates[f] = Boolean(body[f])
      } else {
        updates[f] = String(body[f] ?? '').trim()
      }
    }

    const { data, error } = await supabase.from('wholesalers').update(updates).eq('id', id).select().single()
    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/wholesalers/:id — hard delete if no sales, else soft delete
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()
    const { data: existing } = await supabase.from('wholesalers').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Mayorista no encontrado')

    const { count: salesCount } = await supabase
      .from('wholesale_sales')
      .select('*', { count: 'exact', head: true })
      .eq('wholesaler_id', id)

    if ((salesCount ?? 0) === 0) {
      const { error } = await supabase.from('wholesalers').delete().eq('id', id)
      if (error) return reply.internalServerError(error.message)
      return { ok: true, deleted: 'hard' }
    }

    const { error } = await supabase.from('wholesalers').update({ active: false }).eq('id', id)
    if (error) return reply.internalServerError(error.message)
    return { ok: true, deleted: 'soft' }
  })

  // ── Wholesale Sales ──────────────────────────────────────────────────────────

  // GET /api/wholesalers/sales
  fastify.get('/sales', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('wholesale_sales').select('*, wholesale_sale_items(*)').order('created_at', { ascending: false })
    if (query['wholesaler_id']) q = q.eq('wholesaler_id', query['wholesaler_id'])
    if (query['status']) q = q.eq('status', query['status'])
    if (query['from']) q = q.gte('created_at', query['from'])
    if (query['to']) q = q.lte('created_at', query['to'])

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)

    const page = Math.max(1, Number(query['page'] ?? 1))
    const limit = Math.min(Math.max(Number(query['limit'] ?? 25), 1), 200)
    const total = data?.length ?? 0
    return { items: data?.slice((page - 1) * limit, page * limit) ?? [], total, page, pages: Math.ceil(total / limit), limit }
  })

  // POST /api/wholesalers/sales
  fastify.post('/sales', { preHandler: fastify.requireRole('admin', 'capturista') }, async (req, reply) => {
    const parsed = CreateWholesaleSaleSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { wholesaler_id, payment_method = 'efectivo', items, discount_type, discount_value, notes } = parsed.data

    if (!VALID_WHOLESALE_PAYMENT_METHODS.includes(payment_method)) {
      return reply.badRequest(`Método de pago inválido. Válidos: ${VALID_WHOLESALE_PAYMENT_METHODS.join(', ')}`)
    }

    const supabase = getClient()

    // Validate wholesaler
    if (wholesaler_id) {
      const { data: ws } = await supabase.from('wholesalers').select('id, active').eq('id', wholesaler_id).single()
      if (!ws) return reply.badRequest('Mayorista no encontrado')
      if (ws.active === false) return reply.badRequest('Mayorista desactivado')
    }

    // Validate stock for product items
    const productIds = items.map((i) => i.product_id).filter(Boolean) as string[]
    const { data: products } = productIds.length
      ? await supabase.from('products').select('id, cost, stock, name, emoji').in('id', productIds)
      : { data: [] }

    const enrichedItems = []
    for (const raw of items) {
      const product = products?.find((p) => p.id === raw.product_id)
      if (raw.product_id && !product) return reply.badRequest(`Producto no encontrado: ${raw.product_id}`)
      if (product && typeof product.stock === 'number' && product.stock < raw.quantity) {
        return reply.badRequest(`Stock insuficiente: ${raw.product_id}`)
      }
      const cost = Number(product?.cost ?? 0)
      const subtotal = Math.round(raw.quantity * raw.unit_price * 100) / 100
      enrichedItems.push({
        ...raw,
        name: raw.name || product?.name || '',
        emoji: raw.emoji ?? product?.emoji ?? '',
        subtotal,
        cost_at_sale: cost,
        profit: Math.round((raw.unit_price - cost) * 100) / 100,
        profit_total: Math.round((raw.unit_price - cost) * raw.quantity * 100) / 100,
      })
    }

    const subtotal = enrichedItems.reduce((s, i) => s + i.subtotal, 0)

    // Compute discount
    let discountAmount = 0
    if (discount_type && discount_value && discount_value > 0) {
      if (discount_type === 'percent') {
        if (discount_value > 100) return reply.badRequest('Porcentaje no puede superar 100')
        discountAmount = Math.round(subtotal * (discount_value / 100) * 100) / 100
      } else {
        discountAmount = Math.round(discount_value * 100) / 100
      }
      if (discountAmount > subtotal) return reply.badRequest('Descuento no puede superar el subtotal')
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100)

    // Determine payment state
    const payments: Array<{ id: string; amount: number; method: string; date: string }> = []
    let amountPaid = 0
    let status: string

    if (payment_method === 'credito') {
      status = total === 0 ? 'pagado' : 'pendiente_credito'
    } else {
      if (total > 0) {
        payments.push({ id: `PAY-${Date.now()}`, amount: total, method: payment_method, date: new Date().toISOString() })
        amountPaid = total
      }
      status = 'pagado'
    }

    const saleId = randomUUID()

    // Deduct stock
    for (const item of enrichedItems) {
      if (item.product_id) {
        await supabase.rpc('decrement_stock', { product_id: item.product_id, qty: item.quantity })
      }
    }

    const { data: sale, error: saleErr } = await supabase.from('wholesale_sales').insert({
      id: saleId,
      wholesaler_id: wholesaler_id ?? null,
      wholesaler_name: parsed.data.wholesaler_name,
      payment_method,
      notes: (notes ?? '').slice(0, 300),
      subtotal,
      discount_type: discount_type ?? null,
      discount_value: discount_value ?? null,
      discount_amount: discountAmount > 0 ? discountAmount : null,
      total,
      amount_paid: Math.round(amountPaid * 100) / 100,
      saldo: Math.max(0, Math.round((total - amountPaid) * 100) / 100),
      status,
      payments,
      created_by: req.user?.username ?? 'admin',
      created_at: new Date().toISOString(),
    }).select().single()

    if (saleErr) return reply.internalServerError(saleErr.message)

    await supabase.from('wholesale_sale_items').insert(
      enrichedItems.map((item, i) => ({ ...item, sale_id: saleId, position: i }))
    )

    reply.code(201)
    return { ...sale, items: enrichedItems }
  })

  // POST /api/wholesalers/sales/:id/payments — record a payment/abono
  fastify.post('/sales/:id/payments', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = RecordPaymentSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { amount, method, date } = parsed.data
    if (!VALID_WHOLESALE_PAYMENT_METHODS.includes(method)) {
      return reply.badRequest(`Método inválido. Válidos: ${VALID_WHOLESALE_PAYMENT_METHODS.join(', ')}`)
    }

    const supabase = getClient()
    const { data: sale } = await supabase.from('wholesale_sales').select('*').eq('id', id).single()
    if (!sale) return reply.notFound('Venta no encontrada')

    const existingPayments = (sale.payments as Array<{ amount: number }>) ?? []
    const { paid: currentPaid } = recalcStatus(Number(sale.total), existingPayments)
    const remaining = Math.round((Number(sale.total) - currentPaid) * 100) / 100

    if (amount > remaining + 0.001) {
      return reply.badRequest(`Abono supera el saldo pendiente (${remaining})`)
    }

    const newPayment = {
      id: `PAY-${Date.now()}`,
      amount: Math.round(amount * 100) / 100,
      method,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    }

    const allPayments = [...existingPayments, newPayment]
    const { paid, status, saldo } = recalcStatus(Number(sale.total), allPayments)

    const { data: updated, error } = await supabase.from('wholesale_sales')
      .update({ payments: allPayments, amount_paid: paid, status, saldo, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return { payment: newPayment, sale: updated }
  })

  // POST /api/wholesalers/sales/:id/payment-link — Stripe link for unpaid balance
  fastify.post('/sales/:id/payment-link', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const stripeKey = process.env['STRIPE_SECRET_KEY']
    if (!stripeKey) return reply.serviceUnavailable('Stripe no configurado')

    const supabase = getClient()
    const { data: sale } = await supabase.from('wholesale_sales').select('*').eq('id', id).single()
    if (!sale) return reply.notFound('Venta no encontrada')

    const saldo = Number(sale.saldo ?? sale.total ?? 0)
    if (saldo <= 0) return reply.badRequest('Venta ya liquidada')

    const stripe = new Stripe(stripeKey)
    const base = process.env['PUBLIC_BASE_URL'] ?? 'http://localhost:3001'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: { name: `Mayoreo ${sale.wholesaler_name ?? id}`, description: `Saldo pendiente venta ${id}` },
          unit_amount: Math.round(saldo * 100),
        },
        quantity: 1,
      }],
      success_url: `${base}/?paid_wholesale=${encodeURIComponent(id)}`,
      cancel_url: `${base}/?cancel_wholesale=${encodeURIComponent(id)}`,
      metadata: { kind: 'wholesale', id },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    })

    const qrDataUrl = await QRCode.toDataURL(session.url!, { width: 256, margin: 1 })
    reply.code(201)
    return { url: session.url, qrDataUrl, sessionId: session.id, amount: saldo }
  })
}

export default wholesalersRoutes
