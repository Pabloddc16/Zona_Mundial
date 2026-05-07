'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Deliverer } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Route } from 'lucide-react'

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DISPONIBLE: 'success', EN_RUTA: 'warning', DESCANSO: 'default',
}

export default function DeliverersPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Deliverer | null>(null)
  const [creating, setCreating] = useState(false)
  const [routeDlg, setRouteDlg] = useState<string | null>(null)

  const { data: deliverers, isLoading } = useQuery({ queryKey: ['deliverers'], queryFn: api.deliverers.list })
  const { data: route } = useQuery({
    queryKey: ['route', routeDlg],
    queryFn: () => api.deliverers.route(routeDlg!),
    enabled: !!routeDlg,
  })

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.deliverers.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliverers'] }); setCreating(false) },
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
    { key: 'id', header: 'ID', cell: (r: Deliverer) => <span className="font-mono text-xs text-gray-500">{r.id}</span> },
    { key: 'name', header: 'Nombre' },
    { key: 'vehicle', header: 'Vehículo', cell: (r: Deliverer) => r.vehicle ?? '—' },
    { key: 'zone', header: 'Zona', cell: (r: Deliverer) => r.zone ?? '—' },
    { key: 'status', header: 'Estado', cell: (r: Deliverer) => <Badge variant={STATUS_COLORS[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'rating', header: 'Rating', cell: (r: Deliverer) => `⭐ ${r.rating}`, className: 'text-center' },
    { key: 'deliveries_today', header: 'Hoy', className: 'text-center' },
    {
      key: 'actions', header: '', cell: (r: Deliverer) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setRouteDlg(r.id)}><Route className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Editar</Button>
          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
            if (confirm(`Eliminar ${r.name}?`)) deleteMut.mutate(r.id)
          }}>Eliminar</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Repartidores</h1>
        <Button onClick={() => setCreating(true)}>Nuevo repartidor</Button>
      </div>

      <DataTable columns={columns} data={deliverers ?? []} keyFn={(r) => r.id} loading={isLoading} />

      {/* Create */}
      <Dialog open={creating} onClose={() => setCreating(false)} title="Nuevo repartidor">
        <DelivererForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Dialog>

      {/* Edit */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title="Editar repartidor">
        {selected && (
          <DelivererForm
            initial={selected}
            onSave={(b) => updateMut.mutate({ id: selected.id, body: b })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Dialog>

      {/* Route */}
      <Dialog open={!!routeDlg} onClose={() => setRouteDlg(null)} title="Ruta optimizada" className="max-w-2xl">
        {route && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm text-gray-600">
              <span>{route.totals.stops} paradas</span>
              <span>{route.totals.distanceKm} km</span>
              <span>~{route.totals.etaMinutes} min</span>
            </div>
            <div className="space-y-2">
              {route.stops.map((s) => (
                <div key={s.order_number} className="flex items-center gap-3 rounded-md border border-gray-100 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{s.sequence}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.customer_name}</p>
                    <p className="text-xs text-gray-500">{s.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${s.total}</p>
                    <p className="text-xs text-gray-400">{s.distanceFromPrev} km</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function DelivererForm({ initial, onSave, saving, error }: {
  initial?: Deliverer
  onSave: (b: unknown) => void
  saving: boolean
  error: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [vehicle, setVehicle] = useState(initial?.vehicle ?? '')
  const [plate, setPlate] = useState((initial as unknown as Record<string, unknown>)?.['plate'] as string ?? '')
  const [zone, setZone] = useState(initial?.zone ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'DISPONIBLE')

  return (
    <div className="space-y-3">
      {([
        ['Nombre', name, setName],
        ['Teléfono', phone, setPhone],
        ['Vehículo', vehicle, setVehicle],
        ['Placa', plate, setPlate],
        ['Zona', zone, setZone],
        ['Usuario', username, setUsername],
      ] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
          <Input value={value} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      {initial && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['DISPONIBLE', 'EN_RUTA', 'DESCANSO'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !name}
        onClick={() => onSave({ name, phone, vehicle, plate, zone, username, ...(initial ? { status } : {}) })}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
