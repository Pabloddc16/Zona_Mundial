'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const CATEGORIES = ['album', 'sobre', 'caja', 'set', 'jersey', 'playera', 'gorra', 'bufanda', 'bandera', 'accesorio', 'llavero', 'poster', 'pack', 'sticker', 'coleccion', 'papeleria']

export default function ProductsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [stockDlg, setStockDlg] = useState<Product | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('ajuste')
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, category],
    queryFn: () => api.products.list({ page: String(page), ...(search ? { q: search } : {}), ...(category ? { category } : {}) }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.products.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setSelected(null) },
  })

  const stockMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.products.adjustStock(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setStockDlg(null); setDelta(''); setNote('') },
  })

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.products.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setCreating(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const columns = [
    { key: 'name', header: 'Producto', cell: (r: Product) => <span>{r.emoji} {r.name}</span> },
    { key: 'category', header: 'Categoría', cell: (r: Product) => <Badge>{r.category ?? '—'}</Badge> },
    { key: 'price', header: 'Precio', cell: (r: Product) => fmt(r.price), className: 'text-right' },
    { key: 'cost', header: 'Costo', cell: (r: Product) => r.cost ? fmt(r.cost) : '—', className: 'text-right' },
    { key: 'stock', header: 'Stock', cell: (r: Product) => (
      <Badge variant={r.stock > 10 ? 'success' : r.stock > 0 ? 'warning' : 'danger'}>{r.stock}</Badge>
    ), className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Product) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Editar</Button>
        <Button size="sm" variant="ghost" onClick={() => setStockDlg(r)}>Stock</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm(`Eliminar ${r.name}?`)) deleteMut.mutate(r.id)
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Productos</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nuevo producto</Button>
      </div>

      <div className="flex gap-3">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Buscar..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
          />
          <Button variant="secondary" onClick={() => { setSearch(searchInput); setPage(1) }}>Buscar</Button>
        </div>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-48">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      {/* Create product */}
      <Dialog open={creating} onClose={() => setCreating(false)} title="Nuevo producto">
        <ProductForm
          onSave={(b) => createMut.mutate(b)}
          saving={createMut.isPending}
          error={createMut.isError ? (createMut.error as Error).message : ''}
        />
      </Dialog>

      {/* Edit product */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title="Editar producto">
        {selected && (
          <ProductForm
            initial={selected}
            onSave={(body) => updateMut.mutate({ id: selected.id, body })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Dialog>

      {/* Stock adjustment */}
      <Dialog open={!!stockDlg} onClose={() => setStockDlg(null)} title={`Ajustar stock — ${stockDlg?.name}`}>
        {stockDlg && (
          <div className="space-y-4">
            <p className="text-sm text-white/50">Stock actual: <strong>{stockDlg.stock}</strong></p>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Delta (positivo = entrada, negativo = salida)</label>
              <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="ej. -5 o +20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Razón</label>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {['compra', 'merma', 'ajuste', 'devolucion', 'otro'].map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Nota</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
            </div>
            <Button
              className="w-full"
              disabled={!delta || stockMut.isPending}
              onClick={() => stockMut.mutate({ id: stockDlg.id, body: { delta: Number(delta), reason, note } })}
            >
              {stockMut.isPending ? 'Guardando...' : 'Aplicar'}
            </Button>
            {stockMut.isError && <p className="text-sm text-red-600">{(stockMut.error as Error).message}</p>}
          </div>
        )}
      </Dialog>
    </div>
  )
}

function ProductForm({ initial, onSave, saving, error }: {
  initial?: Product; onSave: (b: unknown) => void; saving: boolean; error?: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(String(initial?.price ?? ''))
  const [cost, setCost] = useState(String(initial?.cost ?? ''))
  const [category, setCategory] = useState(initial?.category ?? '')
  const [emoji, setEmoji] = useState((initial as unknown as Record<string, string>)?.['emoji'] ?? '')
  const [stock, setStock] = useState(String((initial as unknown as Record<string, number>)?.['stock'] ?? '0'))
  const [barcode, setBarcode] = useState(initial?.barcode ?? '')

  return (
    <div className="space-y-4">
      {[
        { label: 'Nombre *', value: name, set: setName, type: 'text' },
        { label: 'Emoji', value: emoji, set: setEmoji, type: 'text' },
        { label: 'Precio *', value: price, set: setPrice, type: 'number' },
        { label: 'Costo', value: cost, set: setCost, type: 'number' },
        ...(!initial ? [{ label: 'Stock inicial', value: stock, set: setStock, type: 'number' }] : []),
        { label: 'Código de barras', value: barcode, set: setBarcode, type: 'text' },
      ].map(({ label, value, set, type }) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input type={type} value={value} onChange={(e) => set(e.target.value)} step={type === 'number' ? '0.01' : undefined} />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Categoría</label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Sin categoría</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !name || !price}
        onClick={() => onSave({ name, emoji: emoji || undefined, price: Number(price), cost: cost ? Number(cost) : undefined, category: category || undefined, barcode: barcode || undefined, ...(!initial ? { stock: Number(stock) } : {}) })}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
