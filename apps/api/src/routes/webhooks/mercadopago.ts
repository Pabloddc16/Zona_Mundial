import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'

const mercadopagoWebhook: FastifyPluginAsync = async (fastify) => {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 1_048_576 },
    (_req, body, done) => done(null, body),
  )

  fastify.post('/mercadopago', async (req, reply) => {
    const secret = process.env['MP_WEBHOOK_SECRET']

    // Validate X-Signature — previously unsigned, could be forged
    if (secret) {
      const xSig = req.headers['x-signature'] as string | undefined
      const xRequestId = req.headers['x-request-id'] as string | undefined
      const urlQuery = new URL(req.url, 'http://localhost').searchParams
      const dataId = urlQuery.get('data.id') ?? ''

      if (!xSig) {
        return reply.code(400).send({ error: 'Missing X-Signature' })
      }

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

    fastify.log.info({ topic }, 'Mercado Pago webhook received')

    if (topic === 'payment' || topic === 'merchant_order') {
      // TODO: look up payment, verify status, update order in DB
    }

    return { received: true }
  })
}

export default mercadopagoWebhook
