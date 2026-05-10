'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type StockEntry, type Movement } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Warehouse, TrendingUp, AlertTriangle, Clock, Package } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)

const LOCATION_COLORS: Record<string, string> = {
  warehouse: 'default', pos: 'success', wip_conversion: 'warning', wip_assembly: 'warning',
}

export default function InventoryPage() {
  const [tab, setTab] = useState<'stock' | 'wip' | 'idle' | 'movements'>('stock')
  const [movePage, setMovePage] = useState(1)
  const [idleDays, setIdleDays] = useState('30')

  const { data: summary } = useQuery({ queryKey: ['stock-summary'], queryFn: () => api.stock.summary() })
  const { data: stock, isLoading: stockLoading } = useQuery({ queryKey: ['stock'], queryFn: () => api.stock.list(), enabled: tab === 'stock' })
  const { data: wip, isLoading: wipLoading } = useQuery({ queryKey: ['stock-wip'], queryFn: () => api.stock.wip(), enabled: tab === 'wip' })
  const { data: idle, isLoading: idleLoading } = useQuery({ queryKey: ['stock-idle', idleDays], queryFn: () => api.stock.idle(Number(idleDays)), enabled: tab === 'idle' })
  const { data: movements, isLoading: moveLoading } = useQuery({ queryKey: ['movements', movePage], queryFn: () => api.stock.movements({ page: String(movePage) }), enabled: tab === 'movements' })

  const summaryCards = [
    { label: 'Total SKUs', value: fmtNum(summary?.totalSkus ?? 0), icon: Package, color: 'oklch(0.62 0.20 260)' },
    { label: 'Units in stock', value: fmtNum(summary?.totalUnits ?? 0), icon: Warehouse, color: 'oklch(0.72 0.19 145)' },
    { label: 'Inventory value', value: fmt(summary?.totalValue ?? 0), icon: TrendingUp, color: 'oklch(0.77 0.163 70)' },
    { label: 'WIP units', value: fmtNum(summary?.wipUnits ?? 0), icon: Clock, color: 'oklch(0.63 0.225 27)' },
  ]

  const stockCols = [
    { key: 'product', header: 'SKU / Product', cell: (r: StockEntry) => (
      <div>
        <p className="font-mono text-xs" style={{ color: 'var(--amber)' }}>{(r as unknown as { product?: { sku?: string } }).product?.sku ?? r.sku_id}</p>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{(r as unknown as { product?: { name?: string } }).product?.name}</p>
      </div>
    ) },
    { key: 'unit_type', header: 'Type', cell: (r: StockEntry) => <Badge>{(r as unknown as { product?: { unit_type?: string } }).product?.unit_type ?? '—'}</Badge> },
    { key: 'location', header: 'Location', cell: (r: StockEntry) => {
      const loc = r as unknown as { location?: { name?: string; type?: string } }
      return <Badge variant={(LOCATION_COLORS[loc.location?.type ?? ''] ?? 'default') as 'default' | 'success' | 'warning' | 'danger'}>{loc.location?.name ?? r.location_id}</Badge>
    }},
    { key: 'qty', header: 'Qty', cell: (r: StockEntry) => <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtNum(r.qty)}</span>, className: 'text-right' },
    { key: 'avg_cost', header: 'Avg cost', cell: (r: StockEntry) => r.avg_cost ? fmt(r.avg_cost) : '—', className: 'text-right' },
    { key: 'value', header: 'Value', cell: (r: StockEntry) => r.avg_cost ? fmt(r.qty * r.avg_cost) : '—', className: 'text-right font-medium' },
  ]

  const moveCols = [
    { key: 'type', header: 'Type', cell: (r: Movement) => <Badge variant={r.type.includes('out') || r.type === 'sale' ? 'danger' : r.type === 'adjustment' ? 'warning' : 'success'}>{r.type}</Badge> },
    { key: 'product', header: 'SKU', cell: (r: Movement) => <span className="font-mono text-xs" style={{ color: 'var(--amber)' }}>{(r as unknown as { product?: { sku?: string } }).product?.sku ?? r.sku_id.slice(-8)}</span> },
    { key: 'qty', header: 'Qty', cell: (r: Movement) => fmtNum(r.qty), className: 'text-right' },
    { key: 'from', header: 'From', cell: (r: Movement) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(r as unknown as { from_loc?: { name?: string } }).from_loc?.name ?? (r.location_from ? r.location_from : '— inbound')}</span> },
    { key: 'to', header: 'To', cell: (r: Movement) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(r as unknown as { to_loc?: { name?: string } }).to_loc?.name ?? (r.location_to ? r.location_to : '— outbound')}</span> },
    { key: 'ref', header: 'Reference', cell: (r: Movement) => <span className="font-mono text-xs">{r.ref_table}/{r.ref_id.slice(-8)}</span> },
    { key: 'created_at', header: 'Date', cell: (r: Movement) => r.created_at.slice(0, 16).replace('T', ' ') },
  ]

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory — Stock</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}20` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Location breakdown */}
      {summary?.byLocation?.length ? (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
          <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Stock by location</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {summary.byLocation.map((loc) => (
              <div key={loc.location_id} className="rounded-lg p-3" style={{ background: 'var(--surface-deep)' }}>
                <Badge variant={(LOCATION_COLORS[loc.location_type] ?? 'default') as 'default' | 'success' | 'warning' | 'danger'} className="mb-2">{loc.location_name}</Badge>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtNum(loc.units)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loc.skus} SKUs · {fmt(loc.value)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex border border-white/8 rounded-md overflow-hidden w-fit">
        {(['stock', 'wip', 'idle', 'movements'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-white/60 hover:bg-white/5'}`}>
            {t === 'stock' ? 'All stock' : t === 'wip' ? 'In progress' : t === 'idle' ? 'Idle' : 'Movements'}
          </button>
        ))}
      </div>

      {tab === 'idle' && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No movement in more than</span>
          <Select value={idleDays} onChange={(e) => setIdleDays(e.target.value)} className="w-28">
            {['7', '14', '30', '60', '90'].map((d) => <option key={d} value={d}>{d} days</option>)}
          </Select>
        </div>
      )}

      {tab === 'stock' && <DataTable columns={stockCols} data={stock ?? []} keyFn={(r) => `${r.sku_id}-${r.location_id}`} loading={stockLoading} emptyMessage="No stock recorded" />}
      {tab === 'wip' && <DataTable columns={stockCols} data={wip ?? []} keyFn={(r) => `${r.sku_id}-${r.location_id}`} loading={wipLoading} emptyMessage="No WIP stock" />}
      {tab === 'idle' && (
        <DataTable
          columns={[...stockCols, { key: 'days_idle', header: 'Days idle', cell: (r) => <Badge variant="warning">{(r as unknown as { days_idle?: number }).days_idle} days</Badge>, className: 'text-right' }]}
          data={idle ?? []} keyFn={(r) => `${r.sku_id}-${r.location_id}`} loading={idleLoading} emptyMessage="No idle stock"
        />
      )}
      {tab === 'movements' && (
        <>
          <DataTable columns={moveCols} data={movements?.items ?? []} keyFn={(r) => r.id} loading={moveLoading} emptyMessage="No movements" />
          <Pagination page={movements?.page ?? 1} pages={movements?.pages ?? 1} total={movements?.total ?? 0} onPage={setMovePage} />
        </>
      )}
    </div>
  )
}
