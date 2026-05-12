'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type StockEntry, type Movement } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { Warehouse, TrendingUp, AlertTriangle, Clock, Package, Plus } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)

const LOCATION_COLORS: Record<string, string> = {
  warehouse: 'default', pos: 'success', wip_conversion: 'warning', wip_assembly: 'warning',
}

export default function InventoryPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'stock' | 'wip' | 'idle' | 'movements'>('stock')
  const [movePage, setMovePage] = useState(1)
  const [idleDays, setIdleDays] = useState('30')
  const [adjustOpen, setAdjustOpen] = useState(false)

  const adjustMut = useMutation({
    mutationFn: api.stock.adjust,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['stock-wip'] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setAdjustOpen(false)
    },
  })

  const { data: summary } = useQuery({ queryKey: ['stock-summary'], queryFn: () => api.stock.summary(), refetchOnWindowFocus: true })
  const { data: stock, isLoading: stockLoading } = useQuery({ queryKey: ['stock'], queryFn: () => api.stock.list(), enabled: tab === 'stock', refetchOnWindowFocus: true })
  const { data: wip, isLoading: wipLoading } = useQuery({ queryKey: ['stock-wip'], queryFn: () => api.stock.wip(), enabled: tab === 'wip', refetchOnWindowFocus: true })
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
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory — Stock</h1>
        <Button onClick={() => setAdjustOpen(true)}><Plus className="h-4 w-4 mr-1" />Adjust stock</Button>
      </div>

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
            {t === 'stock' ? 'All stock' : t === 'wip' ? 'WIP' : t === 'idle' ? 'Idle' : 'Movements'}
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

      <Sheet open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust stock">
        <AdjustForm
          onSave={(b) => adjustMut.mutate(b)}
          saving={adjustMut.isPending}
          error={adjustMut.isError ? (adjustMut.error as Error).message : ''}
        />
      </Sheet>
    </div>
  )
}

function AdjustForm({ onSave, saving, error }: {
  onSave: (b: { sku_id: string; location_id: string; qty: number; direction: 'in' | 'out'; reason?: string }) => void
  saving: boolean
  error: string
}) {
  const [skuId, setSkuId] = useState('')
  const [locationId, setLocationId] = useState('loc_warehouse')
  const [qty, setQty] = useState('1')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [reason, setReason] = useState('')

  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.products.list({ limit: '200' }) })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.locations.list() })

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Use for initial stock, found/lost inventory, or corrections outside the purchases flow.
        Adjustments do NOT affect accounts — for paid stock use Purchases instead.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Product *</label>
        <Select value={skuId} onChange={(e) => setSkuId(e.target.value)}>
          <option value="">Select product...</option>
          {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Direction *</label>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
            <option value="in">Add stock (in)</option>
            <option value="out">Remove stock (out)</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Quantity *</label>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Location *</label>
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locations?.filter((l) => !l.type.startsWith('wip')).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Reason</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Initial stock, breakage, recount" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="w-full"
        disabled={saving || !skuId || !qty || !locationId || Number(qty) <= 0}
        onClick={() => onSave({ sku_id: skuId, location_id: locationId, qty: Number(qty), direction, ...(reason ? { reason } : {}) })}
      >
        {saving ? 'Saving...' : `${direction === 'in' ? 'Add' : 'Remove'} ${qty} units`}
      </Button>
    </div>
  )
}
