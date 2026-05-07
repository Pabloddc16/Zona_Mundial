'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Return } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const REASONS = ['defecto', 'error_pedido', 'arrepentimiento', 'otro']
const SOURCES = ['pos', 'app', 'wholesale']

export default function ReturnsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn: () => api.returns.list({ page: String(page) }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.returns.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  })

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.returns.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['returns'] }); setCreating(false) },
  })

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Return) => <span className="font-mono text-xs text-gray-500">{r.id.slice(-8)}</span> },
    { key: 'source', header: 'Fuente', cell: (r: Return) => <Badge>{r.source}</Badge> },
    { key: 'reason', header: 'Razón' },
    { key: 'refund_method', header: 'Método', cell: (r: Return) => r.refund_method },
    { key: 'refund_amount', header: 'Monto', cell: (r: Return) => fmt(r.refund_amount), className: 'text-right font-medium' },
    { key: 'created_at', header: 'Fecha', cell: (r: Return) => format(new Date(r.created_at), 'dd/MM/yy HH:mm') },
    { key: 'actions', header: '', cell: (r: Return) => (
      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
        if (confirm('Eliminar esta devolución?')) deleteMut.mutate(r.id)
      }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Devoluciones</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nueva</Button>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Nueva devolución">
        <ReturnForm
          onSave={(b) => createMut.mutate(b)}
          saving={createMut.isPending}
          error={createMut.isError ? (createMut.error as Error).message : ''}
        />
      </Dialog>
    </div>
  )
}

function ReturnForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [source, setSource] = useState('pos')
  const [reason, setReason] = useState('defecto')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('efectivo')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1, unit_price: '' }])

  function addItem() { setItems((p) => [...p, { name: '', qty: 1, unit_price: '' }]) }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)) }
  function setItem(i: number, field: string, value: string | number) {
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fuente</label>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Razón</label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Monto devuelto</label>
          <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} step="0.01" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Método</label>
          <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
            {['efectivo', 'tarjeta', 'transferencia'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Artículos</label>
          <Button size="sm" variant="ghost" onClick={addItem}><Plus className="h-3 w-3" /></Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <Input placeholder="Nombre" value={item.name} onChange={(e) => setItem(i, 'name', e.target.value)} className="flex-1" />
            <input type="number" className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={item.qty} min={1} onChange={(e) => setItem(i, 'qty', Number(e.target.value))} />
            <Input placeholder="Precio" type="number" className="w-24" value={item.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} />
            <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !refundAmount || items.some((i) => !i.name)}
        onClick={() => onSave({
          source, reason,
          refund_amount: Number(refundAmount),
          refund_method: refundMethod,
          notes,
          items: items.map((i) => ({ name: i.name, qty: i.qty, unit_price: i.unit_price ? Number(i.unit_price) : undefined })),
        })}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
