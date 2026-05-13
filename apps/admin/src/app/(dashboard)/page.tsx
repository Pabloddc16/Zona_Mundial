'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const [range, setRange] = useState(30)

  const from = format(subDays(new Date(), range), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard', from, to],
    queryFn: () => api.dashboard.kpis(from, to),
  })

  const { data: orders } = useQuery({
    queryKey: ['dashboard', 'orders-summary'],
    queryFn: () => api.dashboard.ordersSummary(),
  })

  if (isLoading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>

  const s = kpis?.summary

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Dashboard</h1>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: 'oklch(0.24 0.012 260)', border: '1px solid oklch(1 0 0 / 0.12)', color: 'var(--text-secondary)' }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cash on hand" value={fmt(s?.cashOnHand ?? 0)} accent="green" />
        <StatCard label="Total revenue" value={fmt(s?.ingresoTotal ?? 0)} accent="blue" />
        <StatCard label="Collected" value={fmt(s?.cobrado ?? 0)} accent="green" />
        <StatCard label="Pending collection" value={fmt(s?.porCobrar ?? 0)} accent="yellow" />
        <StatCard label="Net profit" value={fmt(s?.utilidadNeta ?? 0)} accent={s?.utilidadNeta ?? 0 >= 0 ? 'green' : 'red'} />
        <StatCard label="Expenses" value={fmt(s?.totalEgresos ?? 0)} accent="red" />
        <StatCard label="Gross profit" value={fmt(s?.utilidadBruta ?? 0)} accent="green" />
        <StatCard label="Inventory (cost)" value={fmt(s?.valorInventario ?? 0)} />
        <StatCard label="Stock retail value" value={fmt(s?.inventarioPotencialVenta ?? 0)} accent="blue" />
        <StatCard label="Potential profit" value={fmt(s?.gananciaPotencial ?? 0)} accent="green" />
        <StatCard label="Inventory (units)" value={s?.unidadesInventario?.toLocaleString() ?? '0'} />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle>Daily revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={kpis?.dailyCashFlow ?? []}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(n: number) => `$${(n / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l: string) => l} />
              <Area type="monotone" dataKey="revenue" stroke="#d97706" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by source + Orders status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by source</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {['pos', 'wholesale', 'app'].map((src) => {
              const d = kpis?.bySource?.[src as keyof typeof kpis.bySource]
              return (
                <div key={src} className="flex items-center justify-between">
                  <span className="text-sm text-white/60 capitalize">{src === 'pos' ? 'POS' : src === 'wholesale' ? 'Wholesale' : 'App'}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{fmt(d?.revenue ?? 0)}</span>
                    <span className="ml-2 text-xs text-white/40">{d?.count} sales</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Order status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders && Object.entries(orders.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-medium tabular-nums">{count}</span>
              </div>
            ))}
            {orders && (
              <div className="mt-3 border-t border-white/5 pt-3 text-sm text-white/50">
                Today: {orders.ordersToday} orders · {fmt(orders.revenueToday)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts receivable */}
      {(kpis?.cuentasPorCobrar?.count ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Accounts receivable — Wholesale ({fmt(kpis!.cuentasPorCobrar.total)})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(kpis!.cuentasPorCobrar.items as Array<{ id: string; wholesaler_name: string; saldo: number; status: string }>).slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/75">{c.wholesaler_name}</span>
                  <span className="font-medium text-red-600">{fmt(c.saldo)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
    CREATED: 'info',
    ASSIGNED: 'warning',
    IN_ROUTE: 'warning',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}
