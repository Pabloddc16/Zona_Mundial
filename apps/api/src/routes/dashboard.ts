import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard — comprehensive financial KPIs
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const now = new Date()

    const fromStr = query['from'] ?? ''
    const toStr = query['to'] ?? ''
    const fromDate = fromStr ? new Date(`${fromStr}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1)
    const toDate = toStr ? new Date(`${toStr}T23:59:59.999`) : now

    const fromISO = fromDate.toISOString()
    const toISO = toDate.toISOString()

    const supabase = getClient()

    const [
      { data: posRaw },
      { data: wsRaw },
      { data: ordersRaw },
      { data: products },
      { data: expensesRaw },
      { data: returnsRaw },
    ] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*)').gte('created_at', fromISO).lte('created_at', toISO),
      supabase.from('wholesale_sales').select('*, wholesale_sale_items(*)').gte('created_at', fromISO).lte('created_at', toISO),
      supabase.from('orders').select('*, order_items(*)').eq('deleted', false).gte('date', fromISO).lte('date', toISO),
      supabase.from('products').select('id, stock, cost, price'),
      supabase.from('expenses').select('*').gte('date', fromDate.toISOString().slice(0, 10)).lte('date', toDate.toISOString().slice(0, 10)),
      supabase.from('returns').select('*').gte('created_at', fromISO).lte('created_at', toISO),
    ])

    const pos = posRaw ?? []
    const ws = wsRaw ?? []
    const orders = ordersRaw ?? []
    const expenses = expensesRaw ?? []
    const returns = returnsRaw ?? []

    // Refunds by source
    const refundsBySource = { pos: 0, wholesale: 0, app: 0 }
    for (const r of returns) {
      const src = (r.source as string) || 'pos'
      const key = src as keyof typeof refundsBySource
      if (key in refundsBySource) refundsBySource[key] += Number(r.refund_amount ?? 0)
    }
    const refundsTotal = returns.reduce((s, r) => s + Number(r.refund_amount ?? 0), 0)

    // Revenue by method
    const byMethod = { efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0 }
    function addByMethod(arr: Array<Record<string, unknown>>, defaultMethod: string) {
      for (const s of arr) {
        const m = (String(s['payment_method'] ?? defaultMethod)).toLowerCase()
        const amt = Number(s['total'] ?? 0)
        if (m === 'credito' || m === 'crédito') {
          const pays = (s['payments'] as Array<{ amount: number; method: string }>) ?? []
          const cobrado = pays.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
          byMethod.credito += amt - cobrado
          for (const p of pays) {
            const pm = (p.method ?? 'efectivo').toLowerCase()
            if (pm === 'tarjeta') byMethod.tarjeta += Number(p.amount ?? 0)
            else if (pm === 'transferencia') byMethod.transferencia += Number(p.amount ?? 0)
            else byMethod.efectivo += Number(p.amount ?? 0)
          }
          if (pays.length === 0 && cobrado > 0) byMethod.efectivo += cobrado
        } else {
          if (m in byMethod) (byMethod as Record<string, number>)[m] = ((byMethod as Record<string, number>)[m] ?? 0) + amt
          else byMethod.efectivo += amt
        }
      }
    }

    addByMethod(pos as Array<Record<string, unknown>>, 'efectivo')
    addByMethod(ws as Array<Record<string, unknown>>, 'credito')
    addByMethod(orders as Array<Record<string, unknown>>, 'tarjeta')

    const cobradoBruto = byMethod.efectivo + byMethod.tarjeta + byMethod.transferencia
    const cobrado = Math.max(0, cobradoBruto - refundsTotal)
    const porCobrar = byMethod.credito
    const ingresoTotal = cobrado + porCobrar

    // Gross profit from items
    function sumGrossProfit(sales: Array<Record<string, unknown>>, itemsKey: string) {
      let sum = 0
      for (const s of sales) {
        const items = (s[itemsKey] as Array<Record<string, unknown>>) ?? []
        for (const it of items) {
          const profitTotal = it['profit_total'] ?? it['profitTotal']
          if (profitTotal != null && Number.isFinite(Number(profitTotal))) sum += Number(profitTotal)
        }
      }
      return sum
    }
    const utilidadBruta = sumGrossProfit(pos as Array<Record<string, unknown>>, 'sale_items')
      + sumGrossProfit(ws as Array<Record<string, unknown>>, 'wholesale_sale_items')
      + sumGrossProfit(orders as Array<Record<string, unknown>>, 'order_items')

    // Expenses
    const totalEgresos = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    const utilidadNeta = cobrado - totalEgresos
    const expensesByCat: Record<string, number> = {}
    for (const e of expenses) {
      const c = String(e.category ?? 'otros')
      expensesByCat[c] = (expensesByCat[c] ?? 0) + Number(e.amount ?? 0)
    }
    Object.keys(expensesByCat).forEach((k) => { expensesByCat[k] = Math.round(expensesByCat[k]! * 100) / 100 })

    // Inventory value
    const inventoryValue = (products ?? []).reduce((s, p) => s + Number(p.stock ?? 0) * Number(p.cost ?? p.price ?? 0), 0)
    const inventoryUnits = (products ?? []).reduce((s, p) => s + Number(p.stock ?? 0), 0)

    // Accounts receivable (wholesale unpaid)
    const allWs = (await supabase.from('wholesale_sales').select('id, wholesaler_id, wholesaler_name, total, amount_paid, saldo, created_at, status').neq('status', 'pagado')).data ?? []
    const cxc = allWs.map((s) => ({
      id: s.id,
      wholesaler_id: s.wholesaler_id,
      wholesaler_name: s.wholesaler_name,
      total: Number(s.total ?? 0),
      amount_paid: Number(s.amount_paid ?? 0),
      saldo: Number(s.saldo ?? 0),
      created_at: s.created_at,
      status: s.status,
    })).sort((a, b) => b.saldo - a.saldo)
    const cxcTotal = cxc.reduce((s, x) => s + x.saldo, 0)

    // By source
    const sumTotals = (arr: Array<Record<string, unknown>>) => arr.reduce((s, x) => s + Number(x['total'] ?? 0), 0)
    const bySource = {
      pos: { count: pos.length, revenue: Math.round(sumTotals(pos as Array<Record<string, unknown>>) * 100) / 100 },
      wholesale: { count: ws.length, revenue: Math.round(sumTotals(ws as Array<Record<string, unknown>>) * 100) / 100 },
      app: { count: orders.length, revenue: Math.round(sumTotals(orders as Array<Record<string, unknown>>) * 100) / 100 },
    }

    // Daily cash flow
    const dayMs = 24 * 60 * 60 * 1000
    const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / dayMs) + 1)
    const dayStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime()
    const cashByDay = new Map<string, number>()
    for (let i = 0; i < days; i++) cashByDay.set(dayKey(new Date(dayStart + i * dayMs)), 0)

    const allSales = [
      ...pos.map((s) => ({ total: s.total, date: s.created_at })),
      ...ws.map((s) => ({ total: s.total, date: s.created_at })),
      ...orders.map((o) => ({ total: o.total, date: o.date ?? o.created_at })),
    ]
    for (const s of allSales) {
      const k = dayKey(new Date(s.date as string))
      if (cashByDay.has(k)) cashByDay.set(k, (cashByDay.get(k) ?? 0) + Number(s.total ?? 0))
    }
    const dailyCashFlow = Array.from(cashByDay.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }))

    return {
      range: { from: dayKey(fromDate), to: dayKey(toDate), days },
      summary: {
        ingresoTotal: Math.round(ingresoTotal * 100) / 100,
        cobrado: Math.round(cobrado * 100) / 100,
        cobradoBruto: Math.round(cobradoBruto * 100) / 100,
        devoluciones: Math.round(refundsTotal * 100) / 100,
        porCobrar: Math.round(porCobrar * 100) / 100,
        utilidadBruta: Math.round(utilidadBruta * 100) / 100,
        totalEgresos: Math.round(totalEgresos * 100) / 100,
        utilidadNeta: Math.round(utilidadNeta * 100) / 100,
        valorInventario: Math.round(inventoryValue * 100) / 100,
        unidadesInventario: inventoryUnits,
      },
      devoluciones: {
        total: Math.round(refundsTotal * 100) / 100,
        count: returns.length,
        bySource: {
          pos: Math.round(refundsBySource.pos * 100) / 100,
          wholesale: Math.round(refundsBySource.wholesale * 100) / 100,
          app: Math.round(refundsBySource.app * 100) / 100,
        },
      },
      expensesByCat,
      byMethod: {
        efectivo: Math.round(byMethod.efectivo * 100) / 100,
        tarjeta: Math.round(byMethod.tarjeta * 100) / 100,
        transferencia: Math.round(byMethod.transferencia * 100) / 100,
        credito: Math.round(porCobrar * 100) / 100,
      },
      bySource,
      cuentasPorCobrar: { total: Math.round(cxcTotal * 100) / 100, count: cxc.length, items: cxc.slice(0, 50) },
      dailyCashFlow,
    }
  })

  // GET /api/dashboard/orders-summary — quick order stats for kanban/header
  fastify.get('/orders-summary', { preHandler: fastify.authenticate }, async (_req, reply) => {
    const supabase = getClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [{ data: allOrders }, { data: todayOrders }] = await Promise.all([
      supabase.from('orders').select('status, total').eq('deleted', false),
      supabase.from('orders').select('status, total').eq('deleted', false).gte('date', today.toISOString()),
    ])

    const STATUSES = ['CREATED', 'ASSIGNED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']
    const byStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = (allOrders ?? []).filter((o) => o.status === s).length
      return acc
    }, {})

    const revenueToday = (todayOrders ?? [])
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((s, o) => s + Number(o.total ?? 0), 0)

    const { data: recent } = await supabase.from('orders')
      .select('order_number, date, customer_name, total, status')
      .eq('deleted', false)
      .order('date', { ascending: false })
      .limit(10)

    return {
      ordersToday: (todayOrders ?? []).length,
      revenueToday: Math.round(revenueToday * 100) / 100,
      byStatus,
      recent: recent ?? [],
    }
  })
}

export default dashboardRoutes
