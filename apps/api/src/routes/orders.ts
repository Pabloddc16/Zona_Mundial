import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateOrderSchema, UpdateOrderSchema } from '@pablo/validators'
import Stripe from 'stripe'
import QRCode from 'qrcode'

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/orders/mine — auth user's own orders. Mobile profile uses this.
  fastify.get('/mine', { preHandler: fastify.authenticate }, async (req, reply) => {
    const supabase = getClient()
    const { data, error } = await supabase
      .from('orders')
      .select('order_number, status, total, delivery_type, pickup_code, date, order_items(name, qty, price)')
      .eq('user_id', req.user!.id)
      .eq('deleted', false)
      .order('date', { ascending: false })
      .limit(50)

    if (error) return reply.internalServerError(error.message)
    return { items: data ?? [] }
  })

  // GET /api/orders
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('date', { ascending: false })

    if (req.user?.role === 'repartidor') {
      const { data: deliverer } = await supabase
        .from('deliverers').select('id').eq('username', req.user.username).single()
      if (!deliverer) return { items: [], total: 0, page: 1, pages: 1, limit: 25 }
      q = q.eq('deliverer_id', deliverer.id).eq('deleted', false)
    } else {
      if (query['includeDeleted'] !== 'true') q = q.eq('deleted', false)
    }

    if (query['status']) q = q.eq('status', query['status'])
    if (query['deliverer']) q = q.eq('deliverer_id', query['deliverer'])
    if (query['deliveryType']) q = q.eq('delivery_type', query['deliveryType'])

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)

    const page = Math.max(1, Number(query['page'] ?? 1))
    const limit = Math.min(Math.max(Number(query['limit'] ?? 25), 1), 200)
    const total = data?.length ?? 0
    const items = data?.slice((page - 1) * limit, page * limit) ?? []
    return { items, total, page, pages: Math.ceil(total / limit), limit }
  })

  // GET /api/orders/:orderNumber
  fastify.get('/:orderNumber', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string }
    const { data, error } = await getClient()
      .from('orders').select('*, order_items(*)').eq('order_number', orderNumber).single()
    if (error || !data) return reply.notFound('Pedido no encontrado')
    return data
  })

  // POST /api/orders — admin/capturista create internal; customer create own orders from mobile
  fastify.post('/', { preHandler: fastify.requireRole('admin', 'capturista', 'customer') }, async (req, reply) => {
    const parsed = CreateOrderSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { items, ...orderData } = parsed.data
    const supabase = getClient()

    const productIds = items.map((i) => i.product_id).filter(Boolean) as string[]
    const { data: products } = productIds.length
      ? await supabase.from('products').select('id, cost').in('id', productIds)
      : { data: [] }

    const enrichedItems = items.map((item) => {
      const product = products?.find((p) => p.id === item.product_id)
      const cost = Number(product?.cost ?? 0)
      return {
        ...item,
        cost_at_sale: cost,
        profit: Math.round((item.price - cost) * 100) / 100,
        profit_total: Math.round((item.price - cost) * item.qty * 100) / 100,
      }
    })

    const subtotal = enrichedItems.reduce((s, i) => s + i.qty * i.price, 0)
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
    const pickupCode = orderData.delivery_type === 'local'
      ? String(Math.floor(100000 + Math.random() * 900000))
      : null

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        ...orderData,
        subtotal,
        total: subtotal + (orderData.shipping ?? 0),
        status: 'CREATED',
        created_at: new Date().toISOString(),
        pickup_code: pickupCode,
      })
      .select().single()

    if (orderErr) return reply.internalServerError(orderErr.message)

    await supabase.from('order_items').insert(
      enrichedItems.map((item, i) => ({ ...item, order_number: orderNumber, position: i }))
    )

    reply.code(201)
    return { ...order, order_items: enrichedItems }
  })

  // PATCH /api/orders/:orderNumber
  fastify.patch('/:orderNumber', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string }
    const supabase = getClient()
    const { data: existing } = await supabase
      .from('orders').select('*').eq('order_number', orderNumber).single()
    if (!existing) return reply.notFound('Pedido no encontrado')

    // Repartidor: only their orders, only IN_ROUTE or DELIVERED
    if (req.user?.role === 'repartidor') {
      const { data: deliverer } = await supabase
        .from('deliverers').select('id').eq('username', req.user.username).single()
      if (!deliverer || existing.deliverer_id !== deliverer.id) return reply.forbidden()
      const body = req.body as { status?: string }
      if (!body.status || !['IN_ROUTE', 'DELIVERED'].includes(body.status)) return reply.forbidden()
      const { data, error } = await supabase.from('orders')
        .update({ status: body.status, updated_at: new Date().toISOString(), updated_by: req.user.username })
        .eq('order_number', orderNumber).select().single()
      if (error) return reply.internalServerError(error.message)
      return data
    }

    const parsed = UpdateOrderSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.username,
    }
    if (parsed.data.deliverer_id && existing.status === 'CREATED') updates['status'] = 'ASSIGNED'

    const { data, error } = await supabase.from('orders')
      .update(updates).eq('order_number', orderNumber).select().single()
    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/orders/:orderNumber — soft if IN_ROUTE/DELIVERED, hard otherwise
  fastify.delete('/:orderNumber', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string }
    const supabase = getClient()
    const { data: order } = await supabase
      .from('orders').select('status').eq('order_number', orderNumber).single()
    if (!order) return reply.notFound('Pedido no encontrado')

    if (['IN_ROUTE', 'DELIVERED'].includes(order.status as string)) {
      await supabase.from('orders').update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: req.user?.username,
      }).eq('order_number', orderNumber)
      return { ok: true, mode: 'soft' }
    }

    await supabase.from('orders').delete().eq('order_number', orderNumber)
    return { ok: true, mode: 'hard' }
  })

  // POST /api/orders/:orderNumber/payment-link
  fastify.post('/:orderNumber/payment-link', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string }
    const stripeKey = process.env['STRIPE_SECRET_KEY']
    if (!stripeKey) return reply.serviceUnavailable('Stripe no configurado')

    const supabase = getClient()
    const { data: order } = await supabase
      .from('orders').select('*').eq('order_number', orderNumber).single()
    if (!order) return reply.notFound('Pedido no encontrado')
    if (Number(order.total) <= 0) return reply.badRequest('Pedido sin saldo')

    const stripe = new Stripe(stripeKey)
    const base = process.env['PUBLIC_BASE_URL'] ?? 'http://localhost:3001'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: { name: `Pedido ${orderNumber}`, description: order.customer_name ?? 'Cliente' },
          unit_amount: Math.round(Number(order.total) * 100),
        },
        quantity: 1,
      }],
      success_url: `${base}/?paid_order=${encodeURIComponent(orderNumber)}`,
      cancel_url: `${base}/?cancel_order=${encodeURIComponent(orderNumber)}`,
      metadata: { kind: 'order', id: orderNumber },
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    })

    const qrDataUrl = await QRCode.toDataURL(session.url!, { width: 256, margin: 1 })
    reply.code(201)
    return { url: session.url, qrDataUrl, sessionId: session.id, amount: order.total }
  })

  // POST /api/orders/external — ingest paid orders from consumer app
  fastify.post('/external', async (req, reply) => {
    const secret = process.env['INGEST_SECRET']
    if (!secret) return reply.serviceUnavailable('Ingest deshabilitado')
    const [, token] = (req.headers.authorization ?? '').split(' ')
    if (!token || token !== secret) return reply.unauthorized('Token inválido')

    const body = req.body as Record<string, unknown>
    const orderNumber = String(body['orderNumber'] ?? '').trim()
    if (!orderNumber) return reply.badRequest('missing_order_number')

    const supabase = getClient()
    const { data: existing } = await supabase
      .from('orders').select('order_number').eq('order_number', orderNumber).single()
    if (existing) return { ok: true, deduped: true, orderNumber }

    const user = (body['user'] as Record<string, unknown>) ?? {}
    const items = ((body['items'] as unknown[]) ?? []) as Array<Record<string, unknown>>
    const shipping = Number(body['shipping'] ?? 0)
    const subtotal = items.reduce(
      (s, i) => s + Number(i['unit_price'] ?? i['price'] ?? 0) * Number(i['quantity'] ?? i['qty'] ?? 0), 0
    )
    const total = Number.isFinite(Number(body['total'])) ? Number(body['total']) : subtotal + shipping

    const { error } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_name: user['name'] ?? 'Cliente',
      phone: user['phone'] ?? '',
      address: user['address'] ?? '',
      subtotal, shipping, total,
      status: 'CREATED',
      payment_method: 'Mercado Pago',
      delivery_type: String(body['delivery'] ?? '').toLowerCase().includes('nacion') ? 'envio' : 'local',
      notes: body['referralCode'] ? `Referido: ${body['referralCode']}` : '',
      date: body['paidAt'] ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return { ok: true, orderNumber }
  })
}

export default ordersRoutes
