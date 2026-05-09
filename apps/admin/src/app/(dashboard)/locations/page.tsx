'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Location } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Plus, MapPin } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = { warehouse: 'Bodega', pos: 'Punto de venta', wip_conversion: 'WIP Conversión', wip_assembly: 'WIP Ensamblado' }
const TYPE_BADGE: Record<string, 'default' | 'success' | 'warning'> = { warehouse: 'default', pos: 'success', wip_conversion: 'warning', wip_assembly: 'warning' }

export default function LocationsPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data: locations, isLoading } = useQuery({ queryKey: ['locations'], queryFn: () => api.locations.list() })
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => api.locations.update(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }) })
  const createMut = useMutation({ mutationFn: (b: unknown) => api.locations.create(b), onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setCreating(false) } })

  const columns = [
    { key: 'name', header: 'Nombre', cell: (r: Location) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span> },
    { key: 'type', header: 'Tipo', cell: (r: Location) => <Badge variant={TYPE_BADGE[r.type] ?? 'default'}>{TYPE_LABELS[r.type] ?? r.type}</Badge> },
    { key: 'id', header: 'ID', cell: (r: Location) => <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{r.id}</span> },
    { key: 'active', header: 'Activa', cell: (r: Location) => <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Sí' : 'No'}</Badge>, className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Location) => (
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: r.id, active: !r.active })}>{r.active ? 'Desactivar' : 'Activar'}</Button>
      </div>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'oklch(0.63 0.225 27 / 0.12)' }}>
            <MapPin className="h-5 w-5" style={{ color: 'oklch(0.75 0.18 27)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Locaciones</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nueva locación</Button>
      </div>
      <DataTable columns={columns} data={locations ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="Sin locaciones" />
      <Dialog open={creating} onClose={() => setCreating(false)} title="Nueva locación">
        <LocationForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Dialog>
    </div>
  )
}

function LocationForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('warehouse')
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nombre *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bodega Norte" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo *</label>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button className="w-full" disabled={saving || !name} onClick={() => onSave({ name, type })}>
        {saving ? 'Guardando...' : 'Crear locación'}
      </Button>
    </div>
  )
}
