import type { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'

const stripeWebhook: FastifyPluginAsync = async (fastify) => {
  // Raw body needed for signature verification — add content type parser
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 1_048_576 },
    (_req, body, done) => done(null, body),
  )

  fastify.post('/stripe', async (req, reply) => {
    const sig = req.headers['stripe-signature']
    const secret = process.env['STRIPE_WEBHOOK_SECRET']

    if (!sig || !secret) {
      return reply.code(400).send({ error: 'Missing stripe-signature header or webhook secret' })
    }

    const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '')

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret)
    } catch (err) {
      fastify.log.warn({ err }, 'Stripe webhook signature verification failed')
      return reply.code(400).send({ error: 'Invalid signature' })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        fastify.log.info({ sessionId: session.id }, 'Stripe checkout completed')
        // TODO: update order payment status in DB
        // const orderNumber = session.metadata?.order_number
        break
      }
      case 'payment_intent.payment_failed': {
        fastify.log.warn({ event: event.id }, 'Stripe payment failed')
        break
      }
      default:
        fastify.log.info({ type: event.type }, 'Unhandled Stripe event')
    }

    return { received: true }
  })
}

export default stripeWebhook
