/**
 * Mercado Pago webhook handler.
 *
 * Flow:
 *   1. MP sends POST /api/webhooks/mercadopago?data.id=<paymentId>&type=payment
 *   2. Verify HMAC-SHA256 signature (X-Signature header)
 *   3. Fetch payment from MP API to confirm status=approved
 *   4. Look up order by external_reference, mark PAID
 *   5. Fire side effects:
 *        - Trigger /api/referral/credit (5% to inviter on first-paid order)
 *        - Decrement star_player_stock for any Star SKUs (future)
 */
import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import { getClient } from '@pablo/db'
import { sendPickupCodeEmail } from '../../lib/email.js'

const mercadopagoWebhook: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 1_048_576 },
    (_req, body, done) => done(null, body),
  )

  fastify.post('/mercadopago', async (req, reply) => {
    const secret = process.env['MP_WEBHOOK_SECRET']

    if (secret) {
      const xSig = req.headers['x-signature'] as string | undefined
      const xRequestId = req.headers['x-request-id'] as string | undefined
      const urlQuery = new URL(req.url, 'http://localhost').searchParams
      const dataId = urlQuery.get('data.id') ?? ''

      if (!xSig) return reply.code(400).send({ error: 'Missing X-Signature' })

      const [tsPart, v1Part] = xSig.split(',')
      const ts = tsPart?.split('=')[1]
      const v1 = v1Part?.split('=')[1]
      const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts ?? ''};`
      const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

      if (v1 !== expected) {
        fastify.log.warn('Mercado Pago webhook signature mismatch')
        return reply.code(400).send({ error: 'Invalid signature' })
      }
    }

    const body = JSON.parse((req.body as Buffer).toString()) as Record<string, unknown>
    const topic = body['topic'] ?? body['type']
    const dataObj = body['data'] as Record<string, unknown> | undefined
    const paymentId = String(dataObj?.['id'] ?? '')

    fastify.log.info({ topic, paymentId }, 'Mercado Pago webhook received')

    // We care about payment events only.
    if (topic !== 'payment' || !paymentId) return { received: true, skipped: 'not a payment event' }

    const mpToken = process.env['MP_ACCESS_TOKEN_PROD'] || process.env['MP_ACCESS_TOKEN_TEST']
    if (!mpToken) {
      fastify.log.warn('Webhook hit but no MP token set — cannot fetch payment')
      return { received: true, skipped: 'no token' }
    }

    // Fetch the full payment from MP to verify status server-side.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    if (!mpRes.ok) {
      fastify.log.warn({ status: mpRes.status, paymentId }, 'MP payment fetch failed')
      return reply.code(502).send({ error: 'MP fetch failed' })
    }
    const payment = (await mpRes.json()) as {
      status?: string
      external_reference?: string
      transaction_amount?: number
    }

    if (payment.status !== 'approved') {
      return { received: true, skipped: `status=${payment.status}` }
    }

    const orderNumber = payment.external_reference
    if (!orderNumber) return { received: true, skipped: 'no external_reference' }

    const sb = getClient()

    // Mark order paid (idempotent — if already PAID, no-op).
    const { data: order, error: lookupErr } = await sb
      .from('orders')
      .select('order_number, status, user_id, total, customer_name, phone, address, delivery_type, pickup_code, order_items(product_id, qty)')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (lookupErr || !order) {
      fastify.log.warn({ orderNumber, lookupErr }, 'Order not found for webhook')
      return reply.code(404).send({ error: 'Order not found' })
    }

    if (order.status === 'PAID') {
      return { received: true, skipped: 'already paid' }
    }

    const { error: updateErr } = await sb
      .from('orders')
      .update({ status: 'PAID' })
      .eq('order_number', orderNumber)

    if (updateErr) {
      fastify.log.error({ updateErr, orderNumber }, 'Order status update failed')
      return reply.internalServerError(updateErr.message)
    }

    const ingestSecret = process.env['INGEST_SECRET']
    const apiBase = process.env['PUBLIC_API_URL'] ?? 'https://zona-mundial.onrender.com'

    // Fire referral credit (fire-and-forget; failures don't break webhook).
    if (order.user_id && ingestSecret) {
      fetch(`${apiBase}/api/referral/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ingestSecret}`,
        },
        body: JSON.stringify({
          orderNumber,
          payerUserId: order.user_id,
          amount: Number(payment.transaction_amount ?? order.total ?? 0),
        }),
      }).catch((err) => fastify.log.warn({ err }, 'referral credit call failed'))
    }

    // Decrement Star player stock for any STAR-<slug>-<RARITY> SKUs in the
    // order. Skip silently if INGEST_SECRET missing or order has no items.
    if (ingestSecret) {
      const items = (order as unknown as { order_items?: Array<{ product_id?: string; qty?: number }> }).order_items ?? []
      const starItems: Array<{ slug: string; rarity: string; qty: number }> = []
      for (const it of items) {
        const pid = String(it.product_id ?? '')
        if (!pid.startsWith('STAR-')) continue
        const rest = pid.slice('STAR-'.length)
        const lastDash = rest.lastIndexOf('-')
        if (lastDash <= 0) continue
        starItems.push({
          slug: rest.slice(0, lastDash),
          rarity: rest.slice(lastDash + 1),
          qty: Number(it.qty ?? 1),
        })
      }
      if (starItems.length > 0) {
        fetch(`${apiBase}/api/stars/stock/decrement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ingestSecret}`,
          },
          body: JSON.stringify({ items: starItems }),
        }).catch((err) => fastify.log.warn({ err }, 'star stock decrement failed'))
      }
    }

    // Pickup-code confirmation email (fire-and-forget; never blocks webhook).
    // Looks up the user's email via auth.users since orders table doesn't
    // store it directly. Skips silently when no user_id, no pickup code,
    // no email, or RESEND_API_KEY missing.
    if (order.pickup_code && order.user_id) {
      ;(async () => {
        try {
          const { data: userRow } = await sb
            .from('users')
            .select('email')
            .eq('id', order.user_id)
            .maybeSingle()
          const email = userRow?.email
          if (!email) {
            fastify.log.warn({ orderNumber, userId: order.user_id }, 'no email for pickup notification')
            return
          }
          const result = await sendPickupCodeEmail({
            to: email,
            customerName: order.customer_name ?? 'cliente',
            orderNumber,
            pickupCode: order.pickup_code!,
            total: Number(payment.transaction_amount ?? order.total ?? 0),
          })
          if (!result.ok) fastify.log.warn({ orderNumber, err: result.error }, 'pickup email send failed')
        } catch (err) {
          fastify.log.warn({ err, orderNumber }, 'pickup email pipeline failed')
        }
      })()
    }

    return { received: true, status: 'paid', orderNumber }
  })
}

export default mercadopagoWebhook
