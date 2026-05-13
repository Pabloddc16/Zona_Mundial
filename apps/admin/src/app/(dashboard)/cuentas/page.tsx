'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format, subDays } from 'date-fns'
import { Input } from '@/components/ui/input'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

const ACCOUNTS = [
  {
    id: 'efectivo',
    name: 'Efectivo',
    bank: 'Cash',
    icon: '💵',
    color: 'oklch(0.55 0.18 145)',
    bg: 'oklch(0.55 0.18 145 / 0.12)',
    border: 'oklch(0.55 0.18 145 / 0.25)',
    method: 'efectivo' as const,
  },
  {
    id: 'tarjeta',
    name: 'Card (generic)',
    bank: 'Any card payment',
    icon: '💳',
    color: 'oklch(0.55 0.18 260)',
    bg: 'oklch(0.55 0.18 260 / 0.12)',
    border: 'oklch(0.55 0.18 260 / 0.25)',
    method: 'tarjeta' as const,
  },
  {
    id: 'tarjeta_bbva',
    name: 'BBVA',
    bank: 'BBVA card',
    icon: '🏦',
    color: 'oklch(0.50 0.20 240)',
    bg: 'oklch(0.50 0.20 240 / 0.12)',
    border: 'oklch(0.50 0.20 240 / 0.25)',
    method: 'tarjeta_bbva' as const,
  },
  {
    id: 'transferencia',
    name: 'Nu Bank',
    bank: 'Bank transfer',
    icon: '💜',
    color: 'oklch(0.60 0.22 310)',
    bg: 'oklch(0.60 0.22 310 / 0.12)',
    border: 'oklch(0.60 0.22 310 / 0.25)',
    method: 'transferencia' as const,
  },
]

export default function CuentasPage() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-accounts', from, to],
    queryFn: () => api.dashboard.kpis(from, to),
  })

  const byMethod = data?.byMethod
  const totalIncoming = (byMethod?.efectivo ?? 0) + (byMethod?.tarjeta ?? 0) + (byMethod?.tarjeta_bbva ?? 0) + (byMethod?.transferencia ?? 0)
  const summary = data?.summary

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white/90">Accounts</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-38" />
          <span className="text-white/40 text-sm">→</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-38" />
        </div>
      </div>

      {/* Summary total */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'oklch(0.22 0.012 260)', border: '1px solid oklch(1 0 0 / 0.07)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">Total collected</p>
        <p className="text-4xl font-black text-white/90">{isLoading ? '—' : fmt(totalIncoming)}</p>
        <p className="text-sm text-white/40 mt-1">{from} → {to}</p>
      </div>

      {/* Financial statement */}
      <Card>
        <CardHeader><CardTitle>Financial statement</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatRow label="Cash on hand" value={fmt(summary?.cashOnHand ?? 0)} hint="Collected − expenses (range)" tone="primary" />
            <StatRow label="Capital in stock" value={fmt(summary?.valorInventario ?? 0)} hint="Inventory at cost" />
            <StatRow label="Stock retail value" value={fmt(summary?.inventarioPotencialVenta ?? 0)} hint="If all stock sold at retail" />
            <StatRow label="Potential profit" value={fmt(summary?.gananciaPotencial ?? 0)} hint="Retail value − cost" tone="success" />
            <StatRow label="Total collected" value={fmt(summary?.cobrado ?? 0)} hint="Range" />
            <StatRow label="Total expenses" value={fmt(summary?.totalEgresos ?? 0)} hint="Range" tone="danger" />
            <StatRow label="Gross profit" value={fmt(summary?.utilidadBruta ?? 0)} hint="Revenue − COGS" />
            <StatRow label="Net profit" value={fmt(summary?.utilidadNeta ?? 0)} hint="Gross profit − expenses" tone="success" />
          </div>
        </CardContent>
      </Card>

      {/* Account cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {ACCOUNTS.map((acc) => {
          const amount = byMethod?.[acc.method] ?? 0
          const pct = totalIncoming > 0 ? (amount / totalIncoming) * 100 : 0
          return (
            <div
              key={acc.id}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: acc.bg, border: `1px solid ${acc.border}` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{acc.icon}</span>
                <div>
                  <p className="text-base font-bold" style={{ color: acc.color }}>{acc.name}</p>
                  <p className="text-xs text-white/40">{acc.bank}</p>
                </div>
              </div>

              <div>
                <p className="text-3xl font-black text-white/90">
                  {isLoading ? '…' : fmt(amount)}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{pct.toFixed(1)}% of collected</p>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 0.07)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: acc.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Credit outstanding */}
      {(byMethod?.credito ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">{fmt(byMethod?.credito ?? 0)}</p>
            <p className="text-sm text-white/40 mt-1">Wholesale sales not yet fully paid</p>
          </CardContent>
        </Card>
      )}

      {/* Payment mapping reference */}
      <Card>
        <CardHeader><CardTitle>Account mapping</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row icon="💵" label="Cash" desc="All cash sales from POS, orders, and wholesale" />
          <Row icon="💳" label="Card (generic)" desc="Card payments not tied to a specific bank" />
          <Row icon="🏦" label="BBVA" desc="BBVA card payments specifically" />
          <Row icon="💜" label="Nu Bank (Transfer)" desc="All bank transfers" />
        </CardContent>
      </Card>
    </div>
  )
}

function StatRow({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'primary' | 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-emerald-400' :
    tone === 'danger' ? 'text-rose-400' :
    tone === 'primary' ? 'text-amber-300' :
    'text-white/90'
  return (
    <div className="rounded-xl p-3" style={{ background: 'oklch(1 0 0 / 0.04)', border: '1px solid oklch(1 0 0 / 0.06)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`text-xl font-black tabular-nums mt-1 ${color}`}>{value}</p>
      {hint ? <p className="text-[10px] text-white/30 mt-0.5">{hint}</p> : null}
    </div>
  )
}

function Row({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="font-medium text-white/80">{label}</p>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
    </div>
  )
}
