import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateDelivererSchema, UpdateDelivererSchema } from '@pablo/validators'

// Haversine nearest-neighbor route optimizer (ported from server.js)
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function nearestNeighborOrder<T extends { lat: number; lng: number }>(start: { lat: number; lng: number }, points: T[]): Array<T & { distanceFromPrev: number }> {
  const remaining = points.slice()
  const ordered: Array<T & { distanceFromPrev: number }> = []
  let cur = start
  while (remaining.length) {
    let bestIdx = 0, bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(cur, remaining[i]!)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const next = remaining.splice(bestIdx, 1)[0]!
    ordered.push({ ...next, distanceFromPrev: bestDist })
    cur = next
  }
  return ordered
}

const deliverersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/deliverers
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, reply) => {
    const { data, error } = await getClient().from('deliverers').select('*').order('name')
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })

  // POST /api/deliverers
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const parsed = CreateDelivererSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const supabase = getClient()
    const { data: existing } = await supabase.from('deliverers').select('id').order('id', { ascending: false }).limit(1).single()
    const lastNum = parseInt(String(existing?.id ?? 'DEL-000').replace('DEL-', ''), 10) || 0
    const id = `DEL-${String(lastNum + 1).padStart(3, '0')}`

    const { data, error } = await supabase.from('deliverers').insert({
      id, ...parsed.data,
      status: 'DISPONIBLE',
      rating: 5.0,
      deliveries_today: 0,
      deliveries_total: 0,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return data
  })

  // PATCH /api/deliverers/:id
  fastify.patch('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()

    // Repartidor can only update their own record
    if (req.user?.role === 'repartidor') {
      const { data: me } = await supabase.from('deliverers').select('id').eq('username', req.user.username).single()
      if (!me || me.id !== id) return reply.forbidden()
    }

    const parsed = UpdateDelivererSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    // Non-repartidor can also update name/phone/vehicle/etc.
    const updates: Record<string, unknown> = { ...parsed.data }
    if (req.user?.role !== 'repartidor') {
      const body = req.body as Record<string, unknown>
      for (const field of ['name', 'phone', 'vehicle', 'plate', 'zone', 'username']) {
        if (body[field] !== undefined) updates[field] = String(body[field]).trim()
      }
    }

    const { data, error } = await supabase.from('deliverers').update(updates).eq('id', id).select().single()
    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/deliverers/:id
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()

    // Block if has active orders
    const { data: blocking } = await supabase
      .from('orders').select('order_number').eq('deliverer_id', id).in('status', ['ASSIGNED', 'IN_ROUTE']).eq('deleted', false)
    if (blocking && blocking.length > 0) {
      return reply.conflict(`Repartidor tiene ${blocking.length} pedido(s) activo(s)`)
    }

    const { error } = await supabase.from('deliverers').delete().eq('id', id)
    if (error) return reply.internalServerError(error.message)
    return { ok: true }
  })

  // GET /api/deliverers/:id/route — nearest-neighbor optimized route
  fastify.get('/:id/route', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()

    const [{ data: deliverer }, { data: orders }] = await Promise.all([
      supabase.from('deliverers').select('*').eq('id', id).single(),
      supabase.from('orders').select('*, order_items(*)').eq('deliverer_id', id).in('status', ['ASSIGNED', 'IN_ROUTE']),
    ])

    if (!deliverer) return reply.notFound('Repartidor no encontrado')
    if (!orders?.length) {
      return { deliverer, stops: [], totals: { stops: 0, distanceKm: 0, etaMinutes: 0 }, generatedAt: new Date().toISOString() }
    }

    const start = { lat: Number(deliverer.lat ?? 19.4326), lng: Number(deliverer.lng ?? -99.1332) }
    const points = orders.map((o) => ({ ...o, lat: Number(deliverer.lat ?? 19.4326), lng: Number(deliverer.lng ?? -99.1332) }))
    const optimized = nearestNeighborOrder(start, points)

    const SPEED_KMH = 25, STOP_MIN = 5
    const totalKm = optimized.reduce((s, p) => s + p.distanceFromPrev, 0)
    const etaMinutes = Math.round((totalKm / SPEED_KMH) * 60 + optimized.length * STOP_MIN)

    const stops = optimized.map((s, i) => ({
      sequence: i + 1,
      order_number: s.order_number,
      customer_name: s.customer_name,
      phone: s.phone,
      address: s.address,
      total: s.total,
      status: s.status,
      distanceFromPrev: Math.round(s.distanceFromPrev * 10) / 10,
    }))

    return { deliverer, stops, totals: { stops: stops.length, distanceKm: Math.round(totalKm * 10) / 10, etaMinutes }, generatedAt: new Date().toISOString() }
  })
}

export default deliverersRoutes
