import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

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
}

export default customersRoutes
