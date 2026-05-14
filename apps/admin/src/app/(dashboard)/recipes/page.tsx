'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Recipe } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Plus, FlaskConical, Trash2 } from 'lucide-react'

export default function RecipesPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const [mutError, setMutError] = useState('')

  const { data: recipes, isLoading } = useQuery({ queryKey: ['recipes'], queryFn: () => api.recipes.list() })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.recipes.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
    onError: (e: Error) => setMutError(`Delete failed: ${e.message}. If the recipe is used by any conversions, deactivate it instead.`),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.recipes.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
    onError: (e: Error) => setMutError(e.message),
  })
  const createMut = useMutation({
    mutationFn: (b: unknown) => api.recipes.create(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); setCreating(false); setMutError('') },
    onError: (e: Error) => setMutError(e.message),
  })

  const columns = [
    { key: 'name', header: 'Recipe', cell: (r: Recipe) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span> },
    { key: 'output', header: 'Produces', cell: (r: Recipe) => (
      <span className="text-sm" style={{ color: 'oklch(0.72 0.19 145)' }}>
        {r.output_qty}× {(r as unknown as { output_product?: { name?: string } }).output_product?.name ?? r.output_sku_id}
      </span>
    )},
    { key: 'inputs', header: 'Inputs', cell: (r: Recipe) => (
      <div className="flex flex-wrap gap-1">
        {(r.lines?.length ?? 0) === 0 ? (
          <Badge variant="danger">⚠ No ingredients</Badge>
        ) : (
          r.lines?.map((l) => (
            <Badge key={l.id} variant="default">{l.input_qty}× {(l as unknown as { input_product?: { name?: string } }).input_product?.name ?? l.input_sku_id}</Badge>
          ))
        )}
      </div>
    )},
    { key: 'active', header: 'Active', cell: (r: Recipe) => <Badge variant={r.active ? 'success' : 'default'}>{r.active ? 'Yes' : 'No'}</Badge>, className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Recipe) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: r.id, active: !r.active })}>{r.active ? 'Deactivate' : 'Activate'}</Button>
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm(`Delete recipe "${r.name}"?`)) deleteMut.mutate(r.id) }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    )},
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'oklch(0.62 0.20 260 / 0.12)' }}>
            <FlaskConical className="h-5 w-5" style={{ color: 'oklch(0.62 0.20 260)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Conversion Recipes</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New recipe</Button>
      </div>

      {mutError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400 flex items-center justify-between" style={{ background: 'oklch(0.63 0.225 27 / 0.12)', border: '1px solid oklch(0.63 0.225 27 / 0.25)' }}>
          <span>{mutError}</span>
          <button onClick={() => setMutError('')} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <DataTable columns={columns} data={recipes ?? []} keyFn={(r) => r.id} loading={isLoading} emptyMessage="No recipes" />
      <Sheet open={creating} onClose={() => setCreating(false)} title="New recipe">
        <RecipeForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>
    </div>
  )
}

function RecipeForm({ onSave, saving, error }: { onSave: (b: unknown) => void; saving: boolean; error: string }) {
  const [name, setName] = useState('')
  const [outputSkuId, setOutputSkuId] = useState('')
  const [outputQty, setOutputQty] = useState('1')
  const [lines, setLines] = useState([{ input_sku_id: '', input_qty: '1' }])
  const { data: products } = useQuery({ queryKey: ['products', 1, '', ''], queryFn: () => api.products.list({ limit: '100' }) })

  const validLines = lines
    .filter((l) => l.input_sku_id && Number(l.input_qty) > 0)
    .map((l) => ({ input_sku_id: l.input_sku_id, input_qty: Number(l.input_qty) }))

  const addLine = () => setLines([...lines, { input_sku_id: '', input_qty: '1' }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: string, val: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Recipe name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Open corrugated box → single boxes" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Produces (SKU) *</label>
          <Select value={outputSkuId} onChange={(e) => setOutputSkuId(e.target.value)}>
            <option value="">Select...</option>
            {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Output qty</label>
          <Input type="number" min="1" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Inputs *</label>
          <Button size="sm" variant="ghost" onClick={addLine}>+ Add</Button>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 flex gap-2 rounded-lg p-2" style={{ background: 'var(--surface-deep)' }}>
            <Select value={l.input_sku_id} onChange={(e) => updateLine(i, 'input_sku_id', e.target.value)} className="flex-1">
              <option value="">Input product...</option>
              {products?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input type="number" min="1" placeholder="Qty" value={l.input_qty} onChange={(e) => updateLine(i, 'input_qty', e.target.value)} className="w-20" />
            {lines.length > 1 && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeLine(i)}>×</Button>}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {validLines.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ⚠ Add at least one input ingredient. A recipe without ingredients can't be used to start a conversion.
        </p>
      )}
      <Button className="w-full" disabled={saving || !name || !outputSkuId || validLines.length === 0} onClick={() => onSave({ name, output_sku_id: outputSkuId, output_qty: Number(outputQty), lines: validLines })}>
        {saving ? 'Saving...' : 'Create recipe'}
      </Button>
    </div>
  )
}
