import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { recordMovements } from '../services/inventory.js'
import { randomUUID } from 'crypto'

const stockRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/stock — stock by sku/location
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { sku_id, location_id } = req.query as Record<string, string>
    const sb = getClient()
    let q = sb.from('stock').select('*, product:products!sku_id(name, sku, unit_type, avg_cost), location:locations!location_id(name, type)')
    if (sku_id) q = q.eq('sku_id', sku_id) as typeof q
    if (location_id) q = q.eq('location_id', location_id) as typeof q
    const { data, error } = await q.order('qty', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  })

  // GET /api/stock/summary
  fastify.get('/summary', { preHandler: fastify.authenticate }, async () => {
    const sb = getClient()
    const { data: stockRows } = await sb
      .from('stock')
      .select('sku_id, location_id, qty, product:products!sku_id(name, sku, avg_cost), location:locations!location_id(name, type)')
    const rows = (stockRows ?? []) as unknown as Array<{ sku_id: string; location_id: string; qty: number; product: { avg_cost?: number } | null; location: { name: string; type: string } | null }>

    const byLocation: Record<string, { location_id: string; location_name: string; location_type: string; skus: number; units: number; value: number }> = {}
    let totalSkus = 0, totalUnits = 0, totalValue = 0, wipUnits = 0

    for (const r of rows) {
      const loc = r.location_id
      const locName = r.location?.name ?? loc
      const locType = r.location?.type ?? ''
      const avgCost = r.product?.avg_cost ?? 0
      const value = r.qty * avgCost

      if (!byLocation[loc]) byLocation[loc] = { location_id: loc, location_name: locName, location_type: locType, skus: 0, units: 0, value: 0 }
      byLocation[loc].skus++
      byLocation[loc].units += r.qty
      byLocation[loc].value += value

      totalUnits += r.qty
      totalValue += value
      if (locType.startsWith('wip')) wipUnits += r.qty
    }

    totalSkus = new Set(rows.map((r) => r.sku_id)).size

    return { totalSkus, totalUnits, totalValue, wipUnits, byLocation: Object.values(byLocation) }
  })

  // GET /api/stock/wip
  fastify.get('/wip', { preHandler: fastify.authenticate }, async () => {
    const { data, error } = await getClient()
      .from('stock')
      .select('*, product:products!sku_id(name, sku, unit_type), location:locations!location_id(name, type)')
      .in('location_id', ['loc_wip_conv', 'loc_wip_assembly'])
    if (error) throw new Error(error.message)
    return data
  })

  // GET /api/stock/idle?days=30
  fastify.get('/idle', { preHandler: fastify.authenticate }, async (req) => {
    const { days = '30' } = req.query as Record<string, string>
    const sb = getClient()
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString()

    const { data: stockRows } = await sb
      .from('stock')
      .select('sku_id, location_id, qty, product:products!sku_id(name, sku), location:locations!location_id(name, type)')
      .gt('qty', 0)

    if (!stockRows?.length) return []

    const result = []
    for (const row of stockRows as Array<{ sku_id: string; location_id: string; qty: number; product: unknown; location: unknown }>) {
      const { data: lastMove } = await sb.from('movements').select('created_at').eq('sku_id', row.sku_id).order('created_at', { ascending: false }).limit(1).single()
      const lastAt = (lastMove as { created_at?: string } | null)?.created_at ?? '1970-01-01'
      if (lastAt < cutoff) {
        const daysIdle = Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000)
        result.push({ ...row, last_movement: lastAt, days_idle: daysIdle })
      }
    }
    return result.sort((a, b) => b.days_idle - a.days_idle)
  })

  // POST /api/stock/adjust — manual stock adjustment (in or out)
  // Use for initial stock, found/lost inventory, corrections outside the purchases flow.
  fastify.post('/adjust', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const body = req.body as { sku_id?: string; location_id?: string; qty?: number; direction?: 'in' | 'out'; reason?: string }
    if (!body.sku_id || !body.location_id || !body.qty || !body.direction) {
      return reply.badRequest('sku_id, location_id, qty y direction requeridos')
    }
    if (body.qty <= 0) return reply.badRequest('qty debe ser > 0')

    const adjustmentId = `adj_${randomUUID().slice(0, 8)}`
    const movement = body.direction === 'in'
      ? { location_from: null, location_to: body.location_id }
      : { location_from: body.location_id, location_to: null }

    try {
      await recordMovements([{
        sku_id: body.sku_id,
        qty: body.qty,
        ...movement,
        type: 'adjustment' as const,
        ref_table: 'stock_adjustments',
        ref_id: adjustmentId,
        note: body.reason ?? null,
        created_by: req.user?.username ?? null,
      }])
    } catch (err) {
      return reply.badRequest((err as Error).message)
    }

    return { ok: true, id: adjustmentId }
  })
}

const movementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (req) => {
    const { sku_id, location_id, type, from, to, page = '1', limit = '50' } = req.query as Record<string, string>
    const sb = getClient()
    const p = Number(page), l = Number(limit), offset = (p - 1) * l
    let q = sb.from('movements').select(
      '*, product:products!sku_id(name, sku), from_loc:locations!location_from(name), to_loc:locations!location_to(name)',
      { count: 'exact' }
    ).order('created_at', { ascending: false }).range(offset, offset + l - 1)
    if (sku_id) q = q.eq('sku_id', sku_id) as typeof q
    if (location_id) q = (q.or(`location_from.eq.${location_id},location_to.eq.${location_id}`)) as typeof q
    if (type) q = q.eq('type', type) as typeof q
    if (from) q = q.gte('created_at', from) as typeof q
    if (to) q = q.lte('created_at', to) as typeof q
    const { data, count, error } = await q
    if (error) throw new Error(error.message)
    return { items: data, total: count ?? 0, page: p, pages: Math.ceil((count ?? 0) / l), limit: l }
  })
}

export { movementsRoutes }
export default stockRoutes
