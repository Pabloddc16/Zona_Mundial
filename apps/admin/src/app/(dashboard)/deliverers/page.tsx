'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Deliverer } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Route, UserPlus } from 'lucide-react'

type FormValues = {
  name: string; phone: string; vehicle: string; plate: string; zone: string; username: string; status?: string;
  createAccount?: boolean; email?: string; password?: string
}

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DISPONIBLE: 'success', EN_RUTA: 'warning', DESCANSO: 'default',
}

export default function DeliverersPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Deliverer | null>(null)
  const [creating, setCreating] = useState(false)
  const [routeDlg, setRouteDlg] = useState<string | null>(null)
  const [accountError, setAccountError] = useState('')

  const { data: deliverers, isLoading } = useQuery({ queryKey: ['deliverers'], queryFn: api.deliverers.list })
  const { data: route } = useQuery({
    queryKey: ['route', routeDlg],
    queryFn: () => api.deliverers.route(routeDlg!),
    enabled: !!routeDlg,
  })

  const createMut = useMutation({
    mutationFn: (values: FormValues) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createAccount: _ca, email: _e, password: _p, ...deliverer } = values
      return api.deliverers.create(deliverer)
    },
    onSuccess: async (_, values) => {
      qc.invalidateQueries({ queryKey: ['deliverers'] })
      if (values.createAccount && values.username && values.email && values.password) {
        try {
          await api.users.create({ username: values.username, email: values.email, password: values.password, role: 'repartidor' })
          setAccountError('')
          setCreating(false)
        } catch (e) {
          setAccountError(`Deliverer saved. Account creation failed: ${(e as Error).message}. Create it manually from the Users page.`)
        }
      } else {
        setCreating(false)
      }
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.deliverers.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliverers'] }); setSelected(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deliverers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverers'] }),
  })

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Deliverer) => <span className="font-mono text-xs text-white/50">{r.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'vehicle', header: 'Vehicle', cell: (r: Deliverer) => r.vehicle ?? '—' },
    { key: 'zone', header: 'Zone', cell: (r: Deliverer) => r.zone ?? '—' },
    { key: 'status', header: 'Status', cell: (r: Deliverer) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'rating', header: 'Rating', cell: (r: Deliverer) => `⭐ ${r.rating}`, className: 'text-center' },
    { key: 'deliveries_today', header: 'Today', className: 'text-center' },
    {
      key: 'actions', header: '', cell: (r: Deliverer) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setRouteDlg(r.id)}><Route className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Edit</Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
            if (confirm(`Delete ${r.name}?`)) deleteMut.mutate(r.id)
          }}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Deliverers</h1>
        <Button onClick={() => setCreating(true)}>New deliverer</Button>
      </div>

      <DataTable columns={columns} data={deliverers ?? []} keyFn={(r) => r.id} loading={isLoading} />

      <Sheet open={creating} onClose={() => { setCreating(false); setAccountError('') }} title="New deliverer">
        <DelivererForm
          onSave={(b) => createMut.mutate(b as FormValues)}
          saving={createMut.isPending}
          error={accountError || (createMut.isError ? (createMut.error as Error).message : '')}
          isNew
        />
      </Sheet>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Edit deliverer">
        {selected && (
          <DelivererForm
            initial={selected}
            onSave={(b) => updateMut.mutate({ id: selected.id, body: b })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Sheet>

      <Sheet open={!!routeDlg} onClose={() => setRouteDlg(null)} title="Optimized route" className="max-w-2xl">
        {route && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm text-white/60">
              <span>{route.totals.stops} stops</span>
              <span>{route.totals.distanceKm} km</span>
              <span>~{route.totals.etaMinutes} min</span>
            </div>
            <div className="space-y-2">
              {route.stops.map((s) => (
                <div key={s.order_number} className="flex items-center gap-3 rounded-md border border-white/5 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{s.sequence}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.customer_name}</p>
                    <p className="text-xs text-white/50">{s.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${s.total}</p>
                    <p className="text-xs text-white/40">{s.distanceFromPrev} km</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function DelivererForm({ initial, onSave, saving, error, isNew }: {
  initial?: Deliverer
  onSave: (b: Record<string, unknown>) => void
  saving: boolean
  error: string
  isNew?: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [vehicle, setVehicle] = useState(initial?.vehicle ?? '')
  const [plate, setPlate] = useState((initial as unknown as Record<string, unknown>)?.['plate'] as string ?? '')
  const [zone, setZone] = useState(initial?.zone ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'DISPONIBLE')
  const [createAccount, setCreateAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const accountIncomplete = createAccount && (!email || password.length < 8)

  return (
    <div className="space-y-3">
      {([
        ['Name', name, setName],
        ['Phone', phone, setPhone],
        ['Vehicle', vehicle, setVehicle],
        ['Plate', plate, setPlate],
        ['Zone', zone, setZone],
        ['Username', username, setUsername],
      ] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input value={value} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      {initial && (
        <div>
          <label className="mb-1 block text-sm font-medium text-white/75">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['DISPONIBLE', 'EN_RUTA', 'DESCANSO'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      )}

      {isNew && (
        <div className="border-t border-white/10 pt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: createAccount ? 'oklch(0.55 0.18 145 / 0.10)' : 'oklch(1 0 0 / 0.03)', border: '1px solid oklch(1 0 0 / 0.08)' }}>
            <input
              type="checkbox"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="h-4 w-4 rounded accent-green-500"
            />
            <UserPlus className="h-4 w-4 text-white/60" />
            <span className="text-sm font-medium text-white/80">Create login account</span>
          </label>
          {createAccount && (
            <>
              <p className="text-xs text-white/40 px-1">Account will be created with role <span className="font-mono text-white/60">repartidor</span>. Username: <span className="font-mono text-white/60">{username || '(fill above)'}</span></p>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/75">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="deliverer@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/75">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !name || accountIncomplete}
        onClick={() => onSave({
          name, phone, vehicle, plate, zone, username,
          ...(initial ? { status } : {}),
          ...(isNew ? { createAccount, email, password } : {}),
        })}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
