'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Conversion } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Plus, GitMerge, Play, CheckCircle2, XCircle } from 'lucide-react'

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  planned: 'default', in_progress: 'warning', done: 'success', cancelled: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  planned: 'Planificada', in_progress: 'En proceso', done: 'Completada', cancelled: 'Cancelada',
}

export default function ConversionsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['conversions', page, statusFilter],
    queryFn: () => api.conversions.list({ page: String(page), ...(statusFilter ? { status: statusFilter } : {}) }),
  })

  const startMut = useMutation({ mutationFn: (id: string) => api.conversions.start(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversions'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const finishMut = useMutation({ mutationFn: (id: string) => api.conversions.finish(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversions'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const cancelMut = useMutation({ mutationFn: (id: string) => api.conversions.cancel(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversions'] }); qc.invalidateQueries({ queryKey: ['stock'] }) } })
  const createMut = useMutation({ mutationFn: (b: unknown) => api.conversions.create(b), onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversions'] }); setCreating(false) } })

  const columns = [
    { key: 'id', header: 'ID', cell: (r: Conversion) => <span className="font-mono text-xs" style={{ color: 'var(--amber)' }}>{r.id}</span> },
    { key: 'recipe', header: 'Receta', cell: (r: Conversion) => (
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.recipe_name ?? '—'}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {r.output_sku_name ?? '?'}</p>
      </div>
    )},
    { key: 'qty', header: 'Cantidad', cell: (r: Conversion) => <span className="font-bold">{r.qty}×</span>, className: 'text-center' },
    { key: 'location', header: 'Destino', cell: (r: Conversion) => r.location_name ?? r.location_id },
    { key: 'status', header: 'Estado', cell: (r: Conversion) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status] ?? r.status}</Badge> },
    { key: 'created_at', header: 'Fecha', cell: (r: Conversion) => r.created_at.slice(0, 10) },
    { key: 'actions', header: '', cell: (r: Conversion) => (
      <div className="flex gap-1 justify-end">
        {r.status === 'planned' && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm('¿Iniciar conversión? Los insumos se moverán a WIP.')) startMut.mutate(r.id) }} className="gap-1">
            <Play className="h-3.5 w-3.5" /> Iniciar
          </Button>
        )}
        {r.status === 'in_progress' && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm('¿Finalizar conversión? Se producirán las salidas.')) finishMut.mutate(r.id) }} className="gap-1 text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar
          </Button>
        )}
        {(r.status === 'planned' || r.status === 'in_progress') && (
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('¿Cancelar? Si está en proceso, los insumos regresarán del WIP.')) cancelMut.mutate(r.id) }}>
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'oklch(0.72 0.19 145 / 0.12)' }}>
            <GitMerge className="h-5 w-5" style={{ color: 'oklch(0.72 0.19 145)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Conversiones</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nueva conversión</Button>
      </div>

      <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="w-44">
        <option value="">Todos los estados</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="Sin conversiones registradas" />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Nueva conversión">
        <ConversionForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Dialog>
    </div>
  )
}

function ConversionForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [recipeId, setRecipeId] = useState('')
  const [qty, setQty] = useState('1')
  const [locationId, setLocationId] = useState('loc_warehouse')
  const [notes, setNotes] = useState('')
  const { data: recipes } = useQuery({ queryKey: ['recipes'], queryFn: () => api.recipes.list() })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: () => api.locations.list() })

  const selectedRecipe = recipes?.find((r) => r.id === recipeId)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Receta *</label>
        <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
          <option value="">Seleccionar receta...</option>
          {recipes?.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </div>
      {selectedRecipe && (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface-deep)', border: '1px solid var(--glass-border)' }}>
          <p className="mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Vista previa:</p>
          {selectedRecipe.lines?.map((l) => (
            <p key={l.id} style={{ color: 'var(--text-muted)' }}>• {l.input_qty * Number(qty)} × {(l as unknown as { input_product?: { name?: string } }).input_product?.name ?? l.input_sku_id}</p>
          ))}
          <p className="mt-1 font-medium" style={{ color: 'oklch(0.72 0.19 145)' }}>→ {selectedRecipe.output_qty * Number(qty)} × {(selectedRecipe as unknown as { output_product?: { name?: string } }).output_product?.name}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Cantidad (ejecuciones) *</label>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Destino del output *</label>
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations?.filter((l) => !l.type.startsWith('wip')).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Notas</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button className="w-full" disabled={saving || !recipeId || !qty || !locationId} onClick={() => onSave({ recipe_id: recipeId, qty: Number(qty), location_id: locationId, notes: notes || undefined })}>
        {saving ? 'Guardando...' : 'Planificar conversión'}
      </Button>
    </div>
  )
}
