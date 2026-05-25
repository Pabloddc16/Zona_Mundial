'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Order, type MiPaniniDraft } from '@/lib/api'
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
    {
      key: 'pickup_code', header: 'Pickup', cell: (r: Order) =>
        r.delivery_type === 'local' && r.pickup_code
          ? <span className="font-mono font-black tracking-wider text-emerald-700">{r.pickup_code}</span>
          : <span className="text-stone-300">—</span>,
    },
    { key: 'status', header: 'Status', cell: (r: Order) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'total', header: 'Total', cell: (r: Order) => fmt(r.total), className: 'text-right' },
    {
      key: 'actions', header: '', cell: (r: Order) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => linkMut.mutate(r.order_number)}>
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
            if (confirm(`Delete ${r.order_number}?`)) deleteMut.mutate(r.order_number)
          }}>Delete</Button>
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
          <>
            <EditOrderForm
              order={selected}
              deliverers={deliverers ?? []}
              onSave={(body) => updateMut.mutate({ n: selected.order_number, body })}
              saving={updateMut.isPending}
            />
            <MiPaniniDraftsPanel orderNumber={selected.order_number} />
          </>
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

function MiPaniniDraftsPanel({ orderNumber }: { orderNumber: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mi-panini-drafts', orderNumber],
    queryFn: () => api.miPanini.drafts(orderNumber),
    refetchInterval: 5000, // pick up ai_processed_url as it lands
  })

  if (isLoading) return null
  const drafts = data?.items ?? []
  if (drafts.length === 0) return null

  return (
    <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-[oklch(0.77_0.163_70)]">
        Mi Panini · {drafts.length} sticker{drafts.length === 1 ? '' : 's'}
      </h3>
      {drafts.map((d: MiPaniniDraft) => (
        <DraftCard key={d.id} draft={d} />
      ))}
    </div>
  )
}

function DraftCard({ draft }: { draft: MiPaniniDraft }) {
  const printUrl = draft.ai_processed_url ?? draft.photo_public_url
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3">
      {printUrl ? (
        <a href={printUrl} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded overflow-hidden bg-white/5">
          <img src={printUrl} alt={draft.player_name} className="w-full h-full object-cover" />
        </a>
      ) : (
        <div className="w-20 h-20 rounded bg-white/5 flex items-center justify-center text-white/30 text-xs">
          no photo
        </div>
      )}
      <div className="flex-1 min-w-0 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{draft.player_name}</span>
          <span className="text-white/50 text-xs">· {draft.country}</span>
          <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-black ${
            draft.card_type === 'ORO' ? 'bg-[oklch(0.84_0.150_80)] text-[#0B1F15]'
            : draft.card_type === 'PLATA' ? 'bg-white/80 text-[#0B1F15]'
            : draft.card_type === 'BRONCE' ? 'bg-[oklch(0.55_0.10_50)] text-white'
            : 'bg-white/10 text-white/70'
          }`}>{draft.card_type}</span>
        </div>
        <div className="text-white/40 text-[11px] mt-1 font-mono">
          PAC {draft.stat_pace} · TIR {draft.stat_shooting} · PAS {draft.stat_passing} · DEF {draft.stat_defending}
        </div>
        <div className="text-white/40 text-[10px] mt-1 flex items-center gap-2">
          <span>Status: <span className="text-white/70 font-bold">{draft.status}</span></span>
          {draft.ai_processed_url ? (
            <span className="text-emerald-400">✓ AI processed</span>
          ) : (
            <span className="text-amber-400">pending AI</span>
          )}
        </div>
      </div>
    </div>
  )
}
