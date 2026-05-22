/**
 * Mercado Pago payment routes. Stubbed for Phase 5 — returns a fake
 * `init_point` URL until Pablo provides real MP credentials.
 *
 * To switch to live MP:
 *   1. Set MP_ACCESS_TOKEN_TEST (sandbox) or MP_ACCESS_TOKEN_PROD on Render.
 *   2. Install `mercadopago` npm package.
 *   3. Replace stub block with real Preference.create() call.
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getClient } from '@pablo/db'

const PreferenceItemSchema = z.object({
  title: z.string().min(1).max(240),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
})

const CheckoutPayloadSchema = z.object({
  items: z.array(PreferenceItemSchema).min(1).max(50),
  user: z.object({
    name: z.string().min(1),
    phone: z.string().min(7),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  }),
  delivery: z.enum(['gdl', 'nacional', 'pickup']),
  payment: z.enum(['card', 'cash']).default('card'),
  referralCode: z.string().optional(),
  welcomeCredit: z.number().nonnegative().optional(),
  referralCredit: z.number().nonnegative().optional(),
})

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/payments/mp/preference
  // Creates an order placeholder and returns a Mercado Pago init_point URL.
  fastify.post('/mp/preference', async (req, reply) => {
    const parsed = CheckoutPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid checkout payload', issues: parsed.error.issues })
    }
    const data = parsed.data
    const sb = getClient()

    // Compute total server-side (don't trust client).
    const subtotal = data.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const welcomeApplied = Math.min(data.welcomeCredit ?? 0, subtotal)
    const referralApplied = Math.min(data.referralCredit ?? 0, Math.max(0, subtotal - welcomeApplied))
    const shipping =
      data.delivery === 'pickup' ? 0
      : data.delivery === 'gdl' ? (subtotal >= 1000 ? 0 : 100)
      : data.delivery === 'nacional' ? (subtotal >= 2500 ? 0 : 200)
      : 0
    const total = Math.max(0, subtotal - welcomeApplied - referralApplied) + shipping

    const orderNumber = 'MP-' + Date.now().toString(36).toUpperCase()

    // Persist order placeholder (use existing orders table; status starts pending).
    const { error: orderErr } = await sb.from('orders').insert({
      order_number: orderNumber,
      customer_name: data.user.name,
      phone: data.user.phone,
      address: data.user.address ?? '',
      delivery_type: data.delivery === 'pickup' ? 'local' : 'envio',
      payment_method: data.payment === 'card' ? 'tarjeta' : 'efectivo',
      shipping,
      status: 'CREATED',
      // store totals on the order so webhook can verify before marking paid
      total,
    } as Record<string, unknown>)

    if (orderErr) {
      fastify.log.warn({ err: orderErr }, 'order insert failed in /mp/preference')
      return reply.code(500).send({ error: 'Could not create order', message: orderErr.message })
    }

    // ── LIVE MP STUB ─────────────────────────────────────────────────────
    const accessToken = process.env['MP_ACCESS_TOKEN_PROD'] || process.env['MP_ACCESS_TOKEN_TEST']
    if (!accessToken) {
      // Stub mode — fake init_point that the mobile app can recognize.
      const initPoint = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=STUB-${orderNumber}`
      fastify.log.info({ orderNumber, total }, 'MP preference (stub)')
      return { init_point: initPoint, preferenceId: `STUB-${orderNumber}`, orderNumber }
    }

    // ── LIVE MP CALL ─────────────────────────────────────────────────────
    // Build preference items: collapse to single line if any discount applied,
    // so the MP charge total matches our computed total.
    const totalDiscount = welcomeApplied + referralApplied
    const items = totalDiscount > 0
      ? [{
          title: `Cromos 26 — ${data.items.length} items`,
          quantity: 1,
          unit_price: Math.max(1, subtotal - totalDiscount),
        }]
      : data.items

    try {
      const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          external_reference: orderNumber,
          payer: {
            name: data.user.name,
            email: data.user.email,
            phone: { number: data.user.phone },
          },
          // MP requires HTTPS URLs (no custom schemes), so we proxy through
          // /api/payments/mp/return → that endpoint deep-links into the app.
          back_urls: {
            success: `${process.env['PUBLIC_API_URL'] ?? 'https://zona-mundial.onrender.com'}/api/payments/mp/return?status=success&order=${orderNumber}`,
            failure: `${process.env['PUBLIC_API_URL'] ?? 'https://zona-mundial.onrender.com'}/api/payments/mp/return?status=failure&order=${orderNumber}`,
            pending: `${process.env['PUBLIC_API_URL'] ?? 'https://zona-mundial.onrender.com'}/api/payments/mp/return?status=pending&order=${orderNumber}`,
          },
          auto_return: 'approved',
          notification_url: `${process.env['PUBLIC_API_URL'] ?? 'https://zona-mundial.onrender.com'}/api/webhooks/mercadopago`,
          shipments: { cost: shipping, mode: 'not_specified' },
        }),
      })

      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as Record<string, unknown>
        fastify.log.warn({ status: r.status, body }, 'MP preference create failed')
        return reply.code(502).send({ error: 'MP preference failed', message: body['message'] ?? `HTTP ${r.status}` })
      }
      const pref = (await r.json()) as Record<string, unknown>
      return {
        init_point: pref['init_point'] ?? pref['sandbox_init_point'],
        preferenceId: pref['id'],
        orderNumber,
      }
    } catch (err) {
      fastify.log.error({ err }, 'MP preference network error')
      return reply.code(502).send({ error: 'MP network error' })
    }
  })

  // GET /api/payments/mp/return — HTTPS bridge between MP back_urls and the
  // mobile app's custom URL scheme. MP rejects custom schemes in back_urls.
  fastify.get('/mp/return', async (req, reply) => {
    const q = req.query as { status?: string; order?: string }
    const status = String(q.status ?? 'pending')
    const order = String(q.order ?? '')
    const appScheme = process.env['PUBLIC_APP_URL'] ?? 'cromos26://'
    const target = `${appScheme}order/${order}?status=${status}`

    // Use a tiny HTML page that immediately redirects to the app scheme so
    // iOS / Android open Cromos 26. Fallback link shown if the OS doesn't.
    return reply.type('text/html').send(`<!doctype html>
<meta charset="utf-8">
<title>Returning to Cromos 26…</title>
<script>window.location.href = ${JSON.stringify(target)}</script>
<p style="font-family:system-ui;padding:24px">Opening Cromos 26… <a href="${target}">tap here</a> if nothing happens.</p>`)
  })

  // GET /api/payments/mp/orders/:orderNumber — polled by mobile after MP redirect
  fastify.get('/mp/orders/:orderNumber', async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string }
    const sb = getClient()
    const { data: order, error } = await sb
      .from('orders')
      .select('order_number, status, total')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (error) return reply.code(500).send({ error: error.message })
    if (!order) return reply.code(404).send({ error: 'Order not found' })

    return {
      orderNumber: order.order_number,
      status: order.status === 'PAID' ? 'paid' : order.status === 'CANCELLED' ? 'failed' : 'pending',
      total: order.total,
    }
  })
}

export default paymentsRoutes
