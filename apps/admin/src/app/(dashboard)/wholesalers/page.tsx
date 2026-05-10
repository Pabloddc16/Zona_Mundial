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
import { Sheet } from '@/components/ui/sheet'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  pagado: 'success', parcial: 'warning', pendiente_credito: 'danger',
}

export default function WholesalersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'wholesalers' | 'sales'>('wholesalers')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Wholesaler | null>(null)
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

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.wholesalers.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wholesalers'] }); setCreating(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.wholesalers.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wholesalers'] }); setEditing(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.wholesalers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wholesalers'] }),
  })

  const wCols = [
    { key: 'razon_social', header: 'Business name' },
    { key: 'rfc', header: 'Tax ID', cell: (r: Wholesaler) => <span className="font-mono text-xs">{r.rfc ?? '—'}</span> },
    { key: 'email', header: 'Email', cell: (r: Wholesaler) => r.email ?? '—' },
    { key: 'active', header: 'Active', cell: (r: Wholesaler) => <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Yes' : 'No'}</Badge>, className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Wholesaler) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: r.id, active: !r.active })}>
          {r.active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm(`Archive ${r.razon_social}? Sales history will be preserved.`)) deleteMut.mutate(r.id)
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ]

  const sCols = [
    { key: 'id', header: 'ID', cell: (r: WholesaleSale) => <span className="font-mono text-xs">{r.id.slice(-8)}</span> },
    { key: 'wholesaler_name', header: 'Wholesaler' },
    { key: 'total', header: 'Total', cell: (r: WholesaleSale) => fmt(r.total), className: 'text-right' },
    { key: 'amount_paid', header: 'Paid', cell: (r: WholesaleSale) => fmt(r.amount_paid), className: 'text-right' },
    { key: 'saldo', header: 'Balance', cell: (r: WholesaleSale) => fmt(r.saldo), className: 'text-right' },
    { key: 'status', header: 'Status', cell: (r: WholesaleSale) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'created_at', header: 'Date', cell: (r: WholesaleSale) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: WholesaleSale) => (
      <div className="flex gap-1">
        {r.saldo > 0 && <>
          <Button size="sm" variant="ghost" onClick={() => setPayDlg(r)}>Record payment</Button>
          <Button size="sm" variant="ghost" onClick={() => linkMut.mutate(r.id)}><ExternalLink className="h-3.5 w-3.5" /></Button>
        </>}
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Wholesalers</h1>
        {tab === 'wholesalers' && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New wholesaler</Button>}
      </div>

      <div className="flex border border-white/8 rounded-md overflow-hidden w-fit">
        {(['wholesalers', 'sales'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-surface-elevated text-white/60 hover:bg-white/5'}`}
          >
            {t === 'wholesalers' ? 'Directory' : 'Wholesale sales'}
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

      <Sheet open={creating} onClose={() => setCreating(false)} title="New wholesaler">
        <WholesalerForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit wholesaler">
        {editing && <WholesalerForm initial={editing} onSave={(b) => updateMut.mutate({ id: editing.id, body: b })} saving={updateMut.isPending} error={updateMut.isError ? (updateMut.error as Error).message : ''} />}
      </Sheet>

      <Sheet open={!!payDlg} onClose={() => setPayDlg(null)} title="Record payment">
        {payDlg && (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Outstanding balance: <strong className="text-red-600">{fmt(payDlg.saldo)}</strong></p>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Amount</label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} step="0.01" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Method</label>
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {['efectivo', 'tarjeta', 'transferencia'].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!payAmount || payMut.isPending}
              onClick={() => payMut.mutate({ id: payDlg.id, body: { amount: Number(payAmount), method: payMethod } })}
            >
              {payMut.isPending ? 'Saving...' : 'Record payment'}
            </Button>
            {payMut.isError && <p className="text-sm text-red-600">{(payMut.error as Error).message}</p>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!linkResult} onClose={() => setLinkResult(null)} title="Payment link">
        {linkResult && (
          <div className="space-y-3 text-center">
            <img src={linkResult.qrDataUrl} alt="QR" className="mx-auto h-48 w-48" />
            <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(linkResult.url)}>
              Copy link
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function WholesalerForm({ initial, onSave, saving, error }: {
  initial?: Wholesaler; onSave: (b: unknown) => void; saving: boolean; error: string
}) {
  const [razonSocial, setRazonSocial] = useState(initial?.razon_social ?? '')
  const [rfc, setRfc] = useState((initial as unknown as Record<string, string>)?.['rfc'] ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [contacto, setContacto] = useState((initial as unknown as Record<string, string>)?.['contacto'] ?? '')
  const [regimenFiscal, setRegimenFiscal] = useState((initial as unknown as Record<string, string>)?.['regimen_fiscal'] ?? '')
  const [usoCfdi, setUsoCfdi] = useState((initial as unknown as Record<string, string>)?.['uso_cfdi'] ?? '')
  const [cp, setCp] = useState((initial as unknown as Record<string, string>)?.['codigo_postal'] ?? '')
  const [nota, setNota] = useState((initial as unknown as Record<string, string>)?.['nota'] ?? '')

  return (
    <div className="space-y-3">
      {([
        ['Business name *', razonSocial, setRazonSocial],
        ['Tax ID (RFC)', rfc, setRfc],
        ['Email', email, setEmail],
        ['Contact', contacto, setContacto],
        ['Tax regime (SAT 3-digit code)', regimenFiscal, setRegimenFiscal],
        ['CFDI use', usoCfdi, setUsoCfdi],
        ['Postal code', cp, setCp],
        ['Internal note', nota, setNota],
      ] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input value={value} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !razonSocial}
        onClick={() => onSave({ razon_social: razonSocial, rfc: rfc || undefined, email: email || undefined, contacto: contacto || undefined, regimen_fiscal: regimenFiscal || undefined, uso_cfdi: usoCfdi || undefined, codigo_postal: cp || undefined, nota: nota || undefined })}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
