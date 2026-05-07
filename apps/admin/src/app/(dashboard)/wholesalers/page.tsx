'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Wholesaler, type WholesaleSale } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { ExternalLink } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  pagado: 'success', parcial: 'warning', pendiente_credito: 'danger',
}

export default function WholesalersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'wholesalers' | 'sales'>('wholesalers')
  const [page, setPage] = useState(1)
  const [payDlg, setPayDlg] = useState<WholesaleSale | null>(null)
  const [linkResult, setLinkResult] = useState<{ url: string; qrDataUrl: string } | null>(null)

  const { data: wholesalers, isLoading: wLoading } = useQuery({ queryKey: ['wholesalers'], queryFn: () => api.wholesalers.list() })
  const { data: sales, isLoading: sLoading } = useQuery({
    queryKey: ['wholesale-sales', page],
    queryFn: () => api.wholesalers.sales({ page: String(page) }),
    enabled: tab === 'sales',
  })

  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('efectivo')

  const payMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.wholesalers.recordPayment(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wholesale-sales'] }); setPayDlg(null); setPayAmount('') },
  })

  const linkMut = useMutation({
    mutationFn: (id: string) => api.wholesalers.paymentLink(id),
    onSuccess: (d) => setLinkResult(d),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.wholesalers.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wholesalers'] }),
  })

  const wCols = [
    { key: 'razon_social', header: 'Razón social' },
    { key: 'rfc', header: 'RFC', cell: (r: Wholesaler) => <span className="font-mono text-xs">{r.rfc ?? '—'}</span> },
    { key: 'email', header: 'Correo', cell: (r: Wholesaler) => r.email ?? '—' },
    { key: 'active', header: 'Activo', cell: (r: Wholesaler) => <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Sí' : 'No'}</Badge>, className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Wholesaler) => (
      <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: r.id, active: !r.active })}>
        {r.active ? 'Desactivar' : 'Activar'}
      </Button>
    ) },
  ]

  const sCols = [
    { key: 'id', header: 'ID', cell: (r: WholesaleSale) => <span className="font-mono text-xs">{r.id.slice(-8)}</span> },
    { key: 'wholesaler_name', header: 'Mayorista' },
    { key: 'total', header: 'Total', cell: (r: WholesaleSale) => fmt(r.total), className: 'text-right' },
    { key: 'amount_paid', header: 'Pagado', cell: (r: WholesaleSale) => fmt(r.amount_paid), className: 'text-right' },
    { key: 'saldo', header: 'Saldo', cell: (r: WholesaleSale) => fmt(r.saldo), className: 'text-right' },
    { key: 'status', header: 'Estado', cell: (r: WholesaleSale) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'created_at', header: 'Fecha', cell: (r: WholesaleSale) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: WholesaleSale) => (
      <div className="flex gap-1">
        {r.saldo > 0 && <>
          <Button size="sm" variant="ghost" onClick={() => setPayDlg(r)}>Abonar</Button>
          <Button size="sm" variant="ghost" onClick={() => linkMut.mutate(r.id)}><ExternalLink className="h-3.5 w-3.5" /></Button>
        </>}
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mayoristas</h1>

      <div className="flex border border-gray-200 rounded-md overflow-hidden w-fit">
        {(['wholesalers', 'sales'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {t === 'wholesalers' ? 'Directorio' : 'Ventas mayoreo'}
          </button>
        ))}
      </div>

      {tab === 'wholesalers' ? (
        <DataTable columns={wCols} data={wholesalers ?? []} keyFn={(r) => r.id} loading={wLoading} />
      ) : (
        <>
          <DataTable columns={sCols} data={sales?.items ?? []} keyFn={(r) => r.id} loading={sLoading} />
          <Pagination page={sales?.page ?? 1} pages={sales?.pages ?? 1} total={sales?.total ?? 0} onPage={setPage} />
        </>
      )}

      {/* Record payment */}
      <Dialog open={!!payDlg} onClose={() => setPayDlg(null)} title="Registrar abono">
        {payDlg && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Saldo pendiente: <strong className="text-red-600">{fmt(payDlg.saldo)}</strong></p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Monto</label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Método</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {['efectivo', 'tarjeta', 'transferencia'].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!payAmount || payMut.isPending}
              onClick={() => payMut.mutate({ id: payDlg.id, body: { amount: Number(payAmount), method: payMethod } })}
            >
              {payMut.isPending ? 'Guardando...' : 'Registrar abono'}
            </Button>
            {payMut.isError && <p className="text-sm text-red-600">{(payMut.error as Error).message}</p>}
          </div>
        )}
      </Dialog>

      {/* Payment link */}
      <Dialog open={!!linkResult} onClose={() => setLinkResult(null)} title="Enlace de pago">
        {linkResult && (
          <div className="space-y-3 text-center">
            <img src={linkResult.qrDataUrl} alt="QR" className="mx-auto h-48 w-48" />
            <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(linkResult.url)}>
              Copiar enlace
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  )
}
