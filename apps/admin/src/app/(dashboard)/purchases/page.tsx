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
import { Dialog } from '@/components/ui/dialog'
import { Plus, Package, CheckCircle2, Truck } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  draft: 'default', paid: 'warning', received: 'success', cancelled: 'danger',
}

export default function PurchasesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, status],
    queryFn: () => api.purchases.list({ page: String(page), ...(status ? { status } : {}) }),
  })

  const payMut = useMutation({ mutationFn: (id: string) => api.purchases.pay(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }) })
  const receiveMut = useMutation({ mutationFn: (id: string) => api.purchases.receive(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const cancelMut = useMutation({ mutationFn: (id: string) => api.purchases.cancel(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }) })
  const createMut = useMutation({ mutationFn: (body: unknown) => api.purchases.create(body), onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setCreating(false) } })

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Purchase) => <span className="font-mono text-xs" style={{ color: 'var(--amber)' }}>{r.id}</span> },
    { key: 'supplier', header: 'Proveedor' },
    { key: 'status', header: 'Estado', cell: (r: Purchase) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge> },
    { key: 'total', header: 'Total', cell: (r: Purchase) => fmt(r.total), className: 'text-right font-medium' },
    { key: 'created_at', header: 'Fecha', cell: (r: Purchase) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: Purchase) => (
      <div className="flex gap-1 justify-end">
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={() => payMut.mutate(r.id)} className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pagada
          </Button>
        )}
        {(r.status === 'draft' || r.status === 'paid') && (
          <Button size="sm" variant="ghost" onClick={() => {
            if (confirm(`Marcar como recibida la compra ${r.id}? Esto generará movimientos de inventario.`)) receiveMut.mutate(r.id)
          }} className="gap-1">
            <Truck className="h-3.5 w-3.5" /> Recibida
          </Button>
        )}
        {r.status === 'draft' && (
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => {
            if (confirm('¿Cancelar compra?')) cancelMut.mutate(r.id)
          }}>Cancelar</Button>
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
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Compras</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nueva compra</Button>
      </div>

      <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-40">
        <option value="">Todos los estados</option>
        {['draft', 'paid', 'received', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="Sin compras registradas" />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Nueva compra">
        <PurchaseForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Dialog>
    </div>
  )
}

function PurchaseForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ sku_id: '', qty: '', unit_cost: '' }])
  const { data: products } = useQuery({ queryKey: ['products', 1, '', ''], queryFn: () => api.products.list({ limit: '100' }) })

  const addLine = () => setLines([...lines, { sku_id: '', qty: '', unit_cost: '' }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, val: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const total = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.unit_cost) || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Proveedor *</label>
        <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nombre del proveedor" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notas</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Líneas de compra *</label>
          <Button size="sm" variant="ghost" onClick={addLine}>+ Agregar</Button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2 rounded-lg p-2" style={{ background: 'var(--surface-deep)' }}>
              <Select value={l.sku_id} onChange={(e) => updateLine(i, 'sku_id', e.target.value)} className="flex-1">
                <option value="">Producto...</option>
                {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} className="w-20" />
              <Input type="number" placeholder="Costo unit." value={l.unit_cost} onChange={(e) => updateLine(i, 'unit_cost', e.target.value)} className="w-28" step="0.01" />
              {lines.length > 1 && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeLine(i)}>×</Button>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}</strong></p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button className="w-full" disabled={saving || !supplier || lines.every((l) => !l.sku_id)} onClick={() => onSave({ supplier, notes: notes || undefined, lines: lines.filter((l) => l.sku_id).map((l) => ({ sku_id: l.sku_id, qty: Number(l.qty), unit_cost: Number(l.unit_cost) })) })}>
        {saving ? 'Guardando...' : 'Crear compra'}
      </Button>
    </div>
  )
}
