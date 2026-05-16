'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Transfer } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Plus, ArrowLeftRight, CheckCircle2 } from 'lucide-react'

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  draft: 'default', in_transit: 'warning', completed: 'success', cancelled: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', in_transit: 'In transit', completed: 'Completed', cancelled: 'Cancelled',
}

export default function TransfersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['transfers', page], queryFn: () => api.transfers.list({ page: String(page) }) })
  const completeMut = useMutation({ mutationFn: (id: string) => api.transfers.complete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const cancelMut = useMutation({ mutationFn: (id: string) => api.transfers.cancel(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }) })
  const createMut = useMutation({ mutationFn: (b: unknown) => api.transfers.create(b), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); setCreating(false) } })

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Transfer) => <span className="font-mono text-xs" style={{ color: 'var(--amber)' }}>{r.id}</span> },
    { key: 'route', header: 'Route', cell: (r: Transfer) => (
      <div className="flex items-center gap-1.5 text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>{(r as unknown as { from_location?: { name?: string } }).from_location?.name ?? r.from_loc}</span>
        <ArrowLeftRight className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>{(r as unknown as { to_location?: { name?: string } }).to_location?.name ?? r.to_loc}</span>
      </div>
    )},
    { key: 'status', header: 'Status', cell: (r: Transfer) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge> },
    { key: 'created_at', header: 'Date', cell: (r: Transfer) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: Transfer) => (
      <div className="flex gap-1 justify-end">
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Complete transfer? This will move stock between locations.')) completeMut.mutate(r.id) }} className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Button>
        )}
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Cancel transfer?')) cancelMut.mutate(r.id) }}>Cancel</Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'oklch(0.62 0.20 260 / 0.12)' }}>
            <ArrowLeftRight className="h-5 w-5" style={{ color: 'oklch(0.72 0.19 260)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Transfers</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New transfer</Button>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="No transfers recorded" />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="New transfer">
        <TransferForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>
    </div>
  )
}

function TransferForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [fromLoc, setFromLoc] = useState('')
  const [toLoc, setToLoc] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ sku_id: '', qty: '' }])
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.locations.list() })
  const { data: products } = useQuery({ queryKey: ['products', 1, '', ''], queryFn: () => api.products.list({ limit: '100' }) })

  const addLine = () => setLines([...lines, { sku_id: '', qty: '' }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, val: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>From *</label>
          <Select value={fromLoc} onChange={(e) => setFromLoc(e.target.value)}>
            <option value="">Select...</option>
            {locations?.filter((l) => !l.type.startsWith('wip')).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>To *</label>
          <Select value={toLoc} onChange={(e) => setToLoc(e.target.value)}>
            <option value="">Select...</option>
            {locations?.filter((l) => !l.type.startsWith('wip') && l.id !== fromLoc).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Products *</label>
          <Button size="sm" variant="ghost" onClick={addLine}>+ Add</Button>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 flex gap-2 rounded-lg p-2" style={{ background: 'var(--surface-deep)' }}>
            <Select value={l.sku_id} onChange={(e) => updateLine(i, 'sku_id', e.target.value)} className="flex-1">
              <option value="">Product...</option>
              {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="w-24" />
            {lines.length > 1 && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeLine(i)}>×</Button>}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button className="w-full" disabled={saving || !fromLoc || !toLoc || lines.every((l) => !l.sku_id)} onClick={() => onSave({ from_loc: fromLoc, to_loc: toLoc, notes: notes || undefined, lines: lines.filter((l) => l.sku_id).map((l) => ({ sku_id: l.sku_id, qty: Number(l.qty) })) })}>
        {saving ? 'Saving...' : 'Create transfer'}
      </Button>
    </div>
  )
}
