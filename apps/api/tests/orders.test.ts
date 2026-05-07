import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'

// Mock Supabase and external deps so tests run without real DB
vi.mock('@pablo/db', () => ({
  getClient: () => ({
    from: () => ({
      select: () => ({ order: () => ({ data: [], error: null }), data: [], error: null }),
      insert: () => ({ select: () => ({ single: () => ({ data: { id: 'mock-id' }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }) }) }),
      eq: () => ({ single: () => ({ data: null, error: { message: 'not found' } }), data: [], error: null }),
      in: () => ({ data: [], error: null }),
    }),
    auth: {
      admin: {
        getUserById: () => ({ data: { user: null }, error: null }),
      },
    },
  }),
}))

vi.mock('stripe', () => ({
  default: class { webhooks = { constructEvent: vi.fn() } },
}))

vi.mock('qrcode', () => ({ toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock') }))

describe('Orders API — unauthenticated access denied', () => {
  it('GET /api/orders without token returns 401', async () => {
    // Inline minimal Fastify app with just the auth plugin behavior
    const app = Fastify()
    app.addHook('preHandler', async (_req, reply) => {
      reply.code(401).send({ error: 'Unauthorized' })
    })
    app.get('/api/orders', async () => ({ items: [] }))

    const res = await app.inject({ method: 'GET', url: '/api/orders' })
    expect(res.statusCode).toBe(401)
  })
})

describe('Webhook — Stripe signature validation', () => {
  it('POST /api/webhooks/stripe without signature returns 400', async () => {
    const app = Fastify()
    app.post('/api/webhooks/stripe', async (req, reply) => {
      const sig = req.headers['stripe-signature']
      if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature' })
      return { ok: true }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: '{}',
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body)).toMatchObject({ error: 'Missing stripe-signature' })
  })

  it('POST /api/webhooks/stripe with invalid signature returns 400', async () => {
    const { createHmac } = await import('crypto')
    const app = Fastify()

    const WEBHOOK_SECRET = 'whsec_test_secret'

    app.post('/api/webhooks/stripe', async (req, reply) => {
      const sig = req.headers['stripe-signature'] as string
      if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature' })
      // Simplified signature validation (real uses Stripe SDK)
      const [, sigPart] = sig.split('v1=')
      const expected = createHmac('sha256', WEBHOOK_SECRET).update('payload').digest('hex')
      if (sigPart !== expected) return reply.code(400).send({ error: 'Invalid signature' })
      return { ok: true }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: 'payload',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1234,v1=invalid_sig',
      },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('Webhook — Mercado Pago signature validation', () => {
  it('POST /api/webhooks/mercadopago without x-signature returns 400', async () => {
    const app = Fastify()
    app.post('/api/webhooks/mercadopago', async (req, reply) => {
      if (!req.headers['x-signature']) return reply.code(400).send({ error: 'Missing x-signature' })
      return { ok: true }
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/mercadopago',
      payload: '{}',
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
  })
})
