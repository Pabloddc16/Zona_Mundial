'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Order } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { format } from 'date-fns'
import { RefreshCw, ExternalLink } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  CREATED: 'info', ASSIGNED: 'warning', IN_ROUTE: 'warning', DELIVERED: 'success', CANCELLED: 'danger',
}

const VALID_STATUSES = ['CREATED', 'ASSIGNED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']

export default function OrdersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [linkResult, setLinkResult] = useState<{ url: string; qrDataUrl: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => api.orders.list({ page: String(page), ...(status ? { status } : {}) }),
  })

  const { data: deliverers } = useQuery({ queryKey: ['deliverers'], queryFn: api.deliverers.list })

  const updateMut = useMutation({
    mutationFn: ({ n, body }: { n: string; body: unknown }) => api.orders.update(n, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setSelected(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (n: string) => api.orders.delete(n),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const linkMut = useMutation({
    mutationFn: (n: string) => api.orders.paymentLink(n),
    onSuccess: (d) => setLinkResult(d),
  })

  const columns = [
    { key: 'order_number', header: 'Order', cell: (r: Order) => <span className="font-mono text-xs">{r.order_number}</span> },
    { key: 'date', header: 'Date', cell: (r: Order) => format(new Date(r.date), 'MM/dd/yy HH:mm') },
    { key: 'customer_name', header: 'Customer' },
    { key: 'status', header: 'Status', cell: (r: Order) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'total', header: 'Total', cell: (r: Order) => fmt(r.total), className: 'text-right' },
    {
      key: 'actions', header: '', cell: (r: Order) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => linkMut.mutate(r.order_number)}>
            <ExternalLink className="h-3 w-3" />
          </Button>
          {r.status === 'CREATED' && (
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
              if (confirm(`Delete ${r.order_number}?`)) deleteMut.mutate(r.order_number)
            }}>Delete</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Orders</h1>
        <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['orders'] })}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-48">
          <option value="">All statuses</option>
          {VALID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.order_number} loading={isLoading} />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      {/* Edit order dialog */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={`Edit ${selected?.order_number}`}>
        {selected && (
          <EditOrderForm
            order={selected}
            deliverers={deliverers ?? []}
            onSave={(body) => updateMut.mutate({ n: selected.order_number, body })}
            saving={updateMut.isPending}
          />
        )}
      </Sheet>

      {/* Payment link dialog */}
      <Sheet open={!!linkResult} onClose={() => setLinkResult(null)} title="Payment link">
        {linkResult && (
          <div className="space-y-3 text-center">
            <img src={linkResult.qrDataUrl} alt="QR" className="mx-auto h-48 w-48" />
            <a href={linkResult.url} target="_blank" rel="noreferrer" className="block text-sm text-brand-600 hover:underline truncate">
              {linkResult.url}
            </a>
            <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(linkResult.url)}>
              Copy link
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function EditOrderForm({ order, deliverers, onSave, saving }: {
  order: Order
  deliverers: import('@/lib/api').Deliverer[]
  onSave: (body: unknown) => void
  saving: boolean
}) {
  const [status, setStatus] = useState(order.status)
  const [delivererId, setDelivererId] = useState(order.deliverer_id ?? '')

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Status</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['CREATED', 'ASSIGNED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Deliverer</label>
        <Select value={delivererId} onChange={(e) => setDelivererId(e.target.value)}>
          <option value="">Unassigned</option>
          {deliverers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>
      <Button
        className="w-full"
        disabled={saving}
        onClick={() => onSave({ status, deliverer_id: delivererId || undefined })}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
