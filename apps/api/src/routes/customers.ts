import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateCustomerSchema, UpdateCustomerSchema } from '@pablo/validators'
import { randomUUID } from 'crypto'

const customersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/customers
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('customers').select('*').order('name')
    if (query['q']) q = q.or(`name.ilike.%${query['q']}%,phone.ilike.%${query['q']}%,email.ilike.%${query['q']}%`)

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })

  // GET /api/customers-unified — app customers + wholesalers with revenue stats
  fastify.get('/unified', { preHandler: fastify.authenticate }, async (_req, reply) => {
    const supabase = getClient()

    const [
      { data: customers },
      { data: wholesalers },
      { data: wholesaleSales },
    ] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('wholesalers').select('*').eq('active', true),
      supabase.from('wholesale_sales').select('wholesaler_id, total'),
    ])

    if (!customers || !wholesalers || !wholesaleSales) return reply.internalServerError('DB error')

    // Wholesale revenue rollup
    const wsRevenue = new Map<string, number>()
    const wsCount = new Map<string, number>()
    for (const s of wholesaleSales) {
      const wid = s.wholesaler_id as string
      if (!wid) continue
      wsCount.set(wid, (wsCount.get(wid) ?? 0) + 1)
      wsRevenue.set(wid, (wsRevenue.get(wid) ?? 0) + Number(s.total ?? 0))
    }

    const wholesale = wholesalers.map((w) => ({
      source: 'wholesale',
      id: w.id,
      name: w.razon_social,
      rfc: w.rfc,
      email: w.email ?? '',
      totalOrders: wsCount.get(w.id as string) ?? 0,
      totalSpent: Math.round((wsRevenue.get(w.id as string) ?? 0) * 100) / 100,
    }))

    const app = customers.map((c) => ({
      source: 'app',
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      memberSince: c.member_since,
      totalOrders: c.total_orders ?? 0,
      totalSpent: c.total_spent ?? 0,
    }))

    return { app, wholesale }
  })

  // GET /api/customers/:id
  fastify.get('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
    if (error || !data) return reply.notFound('Cliente no encontrado')

    const { data: orders } = await supabase
      .from('orders').select('order_number, date, status, total').eq('customer_id', id)
      .order('date', { ascending: false }).limit(20)

    return { ...data, orders: orders ?? [] }
  })

  // POST /api/customers
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const parsed = CreateCustomerSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { data, error } = await getClient().from('customers').insert({
      id: randomUUID(),
      ...parsed.data,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return data
  })

  // PATCH /api/customers/:id
  fastify.patch('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateCustomerSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const supabase = getClient()
    const { data: existing } = await supabase.from('customers').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Cliente no encontrado')

    const { data, error } = await supabase
      .from('customers').update(parsed.data).eq('id', id).select().single()

    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/customers/:id
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()
    const { data: existing } = await supabase.from('customers').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Cliente no encontrado')
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return reply.internalServerError(error.message)
    return { ok: true }
  })
}

export default customersRoutes
