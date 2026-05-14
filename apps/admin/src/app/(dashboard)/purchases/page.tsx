'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Purchase } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Plus, Package, CheckCircle2, Truck } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  draft: 'default', paid: 'warning', received: 'success', cancelled: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', paid: 'Paid', received: 'Received', cancelled: 'Cancelled',
}

const PAYMENT_METHODS = [
  { value: 'efectivo', label: '💵 Cash' },
  { value: 'tarjeta', label: '💳 Card (generic)' },
  { value: 'tarjeta_bbva', label: '🏦 BBVA card' },
  { value: 'transferencia', label: '💜 Bank transfer' },
]

export default function PurchasesPage() {
  const qc = useQueryClient()
  const [payDlg, setPayDlg] = useState<Purchase | null>(null)
  const [payMethod, setPayMethod] = useState('efectivo')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, status],
    queryFn: () => api.purchases.list({ page: String(page), ...(status ? { status } : {}) }),
  })

  const payMut = useMutation({
    mutationFn: ({ id, payment_method }: { id: string; payment_method: string }) => api.purchases.pay(id, { payment_method }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['expenses'] }) },
  })
  const receiveMut = useMutation({ mutationFn: (id: string) => api.purchases.receive(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const cancelMut = useMutation({ mutationFn: (id: string) => api.purchases.cancel(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }) })
  const createMut = useMutation({ mutationFn: (body: unknown) => api.purchases.create(body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setCreating(false) } })

  const [detailId, setDetailId] = useState<string | null>(null)

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Purchase) => (
      <button onClick={() => setDetailId(r.id)} className="font-mono text-xs underline" style={{ color: 'var(--amber)' }}>{r.id}</button>
    ) },
    { key: 'supplier', header: 'Supplier', cell: (r: Purchase) => (
      <button onClick={() => setDetailId(r.id)} className="underline" style={{ color: 'var(--text-primary)' }}>{r.supplier}</button>
    ) },
    { key: 'status', header: 'Status', cell: (r: Purchase) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge> },
    { key: 'total', header: 'Total', cell: (r: Purchase) => fmt(r.total), className: 'text-right font-medium' },
    { key: 'created_at', header: 'Date', cell: (r: Purchase) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: Purchase) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setDetailId(r.id)}>View</Button>
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={() => { setPayMethod('efectivo'); setPayDlg(r) }} className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
          </Button>
        )}
        {(r.status === 'draft' || r.status === 'paid') && (
          <Button size="sm" variant="ghost" onClick={() => {
            if (confirm(`Mark purchase ${r.id} as received? This will generate inventory movements.`)) receiveMut.mutate(r.id)
          }} className="gap-1">
            <Truck className="h-3.5 w-3.5" /> Receive
          </Button>
        )}
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => {
            if (confirm('Cancel purchase?')) cancelMut.mutate(r.id)
          }}>Cancel</Button>
        )}
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'oklch(0.77 0.163 70 / 0.12)' }}>
            <Package className="h-5 w-5" style={{ color: 'var(--amber)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Purchases</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New purchase</Button>
      </div>

      <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-40">
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="No purchases recorded" />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="New purchase">
        <PurchaseForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>

      <Sheet open={!!payDlg} onClose={() => setPayDlg(null)} title="Mark as paid">
        {payDlg && (
          <div className="space-y-4">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Purchase</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{payDlg.id} — {payDlg.supplier}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Payment method *</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              This creates an expense row (category: inventory) so it shows up in Accounts and the dashboard cash flow.
            </p>
            <Button
              className="w-full"
              disabled={payMut.isPending}
              onClick={() => { payMut.mutate({ id: payDlg.id, payment_method: payMethod }); setPayDlg(null) }}
            >
              {payMut.isPending ? 'Saving…' : 'Confirm payment'}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!detailId} onClose={() => setDetailId(null)} title="Purchase detail" width="lg">
        {detailId && <PurchaseDetail id={detailId} />}
      </Sheet>
    </div>
  )
}

function PurchaseDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['purchase', id], queryFn: () => api.purchases.get(id) })
  if (isLoading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Not found</p>
  type DetailLine = { id: string; sku_id: string; qty: number; unit_cost: number; product?: { name?: string; sku?: string } }
  const p = data as unknown as Purchase & { lines?: DetailLine[]; received_location?: { name?: string } }
  const total = (p.lines ?? []).reduce((s, l) => s + Number(l.qty) * Number(l.unit_cost), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">ID</p>
          <p className="font-mono" style={{ color: 'var(--amber)' }}>{p.id}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">Status</p>
          <Badge variant={STATUS_BADGE[p.status]}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">Supplier</p>
          <p style={{ color: 'var(--text-primary)' }}>{p.supplier}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">Created</p>
          <p>{p.created_at.slice(0, 16).replace('T', ' ')}</p>
        </div>
        {p.paid_at && (
          <div>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">Paid</p>
            <p>{p.paid_at.slice(0, 16).replace('T', ' ')}</p>
          </div>
        )}
        {p.received_at && (
          <div>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs uppercase tracking-wide">Received</p>
            <p>{p.received_at.slice(0, 16).replace('T', ' ')}</p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Line items</p>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'oklch(1 0 0 / 0.03)' }}>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Product</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Qty</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Unit cost</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {((p.lines as DetailLine[] | undefined) ?? []).map((l: DetailLine) => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <td className="px-3 py-2">
                    <p style={{ color: 'var(--text-primary)' }}>{l.product?.name ?? l.sku_id}</p>
                    {l.product?.sku && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{l.product.sku}</p>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(Number(l.unit_cost))}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(l.qty) * Number(l.unit_cost))}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--glass-border)', background: 'oklch(1 0 0 / 0.02)' }}>
                <td className="px-3 py-2 font-semibold" colSpan={3} style={{ color: 'var(--text-primary)' }}>Total</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {p.notes && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Notes</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.notes}</p>
        </div>
      )}

      {p.received_location?.name && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Received to: {p.received_location.name}</p>
      )}
    </div>
  )
}

function PurchaseForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ sku_id: '', qty: '', unit_cost: '', received_to: '' }])
  const { data: products } = useQuery({ queryKey: ['products', 1, '', ''], queryFn: () => api.products.list({ limit: '100' }) })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: api.locations.list })
  const warehouses = (locations ?? []).filter((l) => l.active && !l.type.startsWith('wip'))

  const addLine = () => setLines([...lines, { sku_id: '', qty: '', unit_cost: '', received_to: '' }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, val: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const total = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.unit_cost) || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Supplier *</label>
        <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Line items *</label>
          <Button size="sm" variant="ghost" onClick={addLine}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="space-y-1.5 rounded-lg p-2" style={{ background: 'var(--surface-deep)' }}>
              <div className="flex gap-2">
                <Select value={l.sku_id} onChange={(e) => updateLine(i, 'sku_id', e.target.value)} className="flex-1">
                  <option value="">Product...</option>
                  {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="w-20" />
                <Input type="number" placeholder="Cost" value={l.unit_cost} onChange={(e) => updateLine(i, 'unit_cost', e.target.value)} className="w-24" step="0.01" />
                {lines.length > 1 && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeLine(i)}>×</Button>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>Destination:</span>
                <Select value={l.received_to} onChange={(e) => updateLine(i, 'received_to', e.target.value)} className="flex-1 text-xs">
                  <option value="">Default warehouse</option>
                  {warehouses.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </Select>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}</strong></p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button className="w-full" disabled={saving || !supplier || lines.every((l) => !l.sku_id)} onClick={() => onSave({ supplier, notes: notes || undefined, lines: lines.filter((l) => l.sku_id).map((l) => ({ sku_id: l.sku_id, qty: Number(l.qty), unit_cost: Number(l.unit_cost), received_to: l.received_to || undefined })) })}>
        {saving ? 'Saving...' : 'Create purchase'}
      </Button>
    </div>
  )
}
