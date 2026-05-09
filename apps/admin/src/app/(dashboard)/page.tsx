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
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

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
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ingreso total" value={fmt(s?.ingresoTotal ?? 0)} accent="blue" />
        <StatCard label="Cobrado" value={fmt(s?.cobrado ?? 0)} accent="green" />
        <StatCard label="Por cobrar" value={fmt(s?.porCobrar ?? 0)} accent="yellow" />
        <StatCard label="Utilidad neta" value={fmt(s?.utilidadNeta ?? 0)} accent={s?.utilidadNeta ?? 0 >= 0 ? 'green' : 'red'} />
        <StatCard label="Egresos" value={fmt(s?.totalEgresos ?? 0)} accent="red" />
        <StatCard label="Utilidad bruta" value={fmt(s?.utilidadBruta ?? 0)} accent="green" />
        <StatCard label="Inventario (valor)" value={fmt(s?.valorInventario ?? 0)} />
        <StatCard label="Inventario (unid.)" value={s?.unidadesInventario?.toLocaleString() ?? '0'} />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle>Ingresos diarios</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Ingresos por fuente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {['pos', 'wholesale', 'app'].map((src) => {
              const d = kpis?.bySource?.[src as keyof typeof kpis.bySource]
              return (
                <div key={src} className="flex items-center justify-between">
                  <span className="text-sm text-white/60 capitalize">{src === 'pos' ? 'POS' : src === 'wholesale' ? 'Mayoreo' : 'App'}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{fmt(d?.revenue ?? 0)}</span>
                    <span className="ml-2 text-xs text-white/40">{d?.count} ventas</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Estado de pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders && Object.entries(orders.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-medium tabular-nums">{count}</span>
              </div>
            ))}
            {orders && (
              <div className="mt-3 border-t border-white/5 pt-3 text-sm text-white/50">
                Hoy: {orders.ordersToday} pedidos · {fmt(orders.revenueToday)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CXC */}
      {(kpis?.cuentasPorCobrar?.count ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Cuentas por cobrar — Mayoreo ({fmt(kpis!.cuentasPorCobrar.total)})</CardTitle></CardHeader>
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
