'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { uploadProductImage } from '@/lib/supabase'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet } from '@/components/ui/sheet'
import { Plus, Trash2, ImageIcon, Upload } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const CATEGORIES = ['album', 'sobre', 'caja', 'set', 'jersey', 'playera', 'gorra', 'bufanda', 'bandera', 'accesorio', 'llavero', 'poster', 'pack', 'sticker', 'coleccion', 'papeleria']

export default function ProductsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, category],
    queryFn: () => api.products.list({ page: String(page), ...(search ? { q: search } : {}), ...(category ? { category } : {}) }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.products.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setSelected(null) },
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
    { key: 'name', header: 'Product', cell: (r: Product) => (
      <div className="flex items-center gap-2">
        {(r as unknown as Record<string, string>)['image_url'] ? (
          <img
            src={(r as unknown as Record<string, string>)['image_url']}
            alt={r.name}
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        ) : r.emoji ? (
          <span className="h-8 w-8 flex items-center justify-center text-xl shrink-0">{r.emoji}</span>
        ) : (
          <span className="h-8 w-8 flex items-center justify-center rounded bg-white/10 shrink-0">
            <ImageIcon className="h-4 w-4 text-white/30" />
          </span>
        )}
        <span>{r.name}</span>
      </div>
    ) },
    { key: 'category', header: 'Category', cell: (r: Product) => <Badge>{r.category ?? '—'}</Badge> },
    { key: 'price', header: 'Price', cell: (r: Product) => fmt(r.price), className: 'text-right' },
    { key: 'cost', header: 'Cost', cell: (r: Product) => r.cost ? fmt(r.cost) : '—', className: 'text-right' },
    { key: 'stock', header: 'Stock', cell: (r: Product) => (
      <Badge variant={r.stock > 10 ? 'success' : r.stock > 0 ? 'warning' : 'danger'}>{r.stock}</Badge>
    ), className: 'text-center' },
    { key: 'actions', header: '', cell: (r: Product) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm(`Delete ${r.name}?`)) deleteMut.mutate(r.id)
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Products</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New product</Button>
      </div>

      <div className="flex gap-3">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
          />
          <Button variant="secondary" onClick={() => { setSearch(searchInput); setPage(1) }}>Search</Button>
        </div>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-48">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      {/* Create product */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="New product">
        <ProductForm
          onSave={(b) => createMut.mutate(b)}
          saving={createMut.isPending}
          error={createMut.isError ? (createMut.error as Error).message : ''}
        />
      </Sheet>

      {/* Edit product */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Edit product">
        {selected && (
          <ProductForm
            initial={selected}
            onSave={(body) => updateMut.mutate({ id: selected.id, body })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Sheet>

    </div>
  )
}

function ProductForm({ initial, onSave, saving, error }: {
  initial?: Product; onSave: (b: unknown) => void; saving: boolean; error?: string
}) {
  const rec = initial as unknown as Record<string, string | number>
  const existingImageUrl = String(rec?.['image_url'] ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(String(initial?.price ?? ''))
  const [cost, setCost] = useState(String(initial?.cost ?? ''))
  const [category, setCategory] = useState(initial?.category ?? '')
  const [emoji, setEmoji] = useState(String(rec?.['emoji'] ?? ''))
  const [stock, setStock] = useState(String(rec?.['stock'] ?? '0'))
  const [barcode, setBarcode] = useState(initial?.barcode ?? '')
  const [imageUrl, setImageUrl] = useState(existingImageUrl)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewSrc, setPreviewSrc] = useState(existingImageUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setUploadError('')
  }

  const handleSave = async () => {
    let finalUrl = imageUrl
    if (imageFile) {
      setUploading(true)
      try {
        const id = initial?.id ?? `new-${Date.now()}`
        finalUrl = await uploadProductImage(imageFile, id)
        setImageUrl(finalUrl)
      } catch (e) {
        setUploadError((e as Error).message)
        setUploading(false)
        return
      }
      setUploading(false)
    }
    onSave({
      name,
      emoji: emoji || undefined,
      image_url: finalUrl || undefined,
      price: Number(price),
      cost: cost ? Number(cost) : undefined,
      category: category || undefined,
      barcode: barcode || undefined,
      ...(!initial ? { stock: Number(stock) } : {}),
    })
  }

  return (
    <div className="space-y-4">
      {/* Image upload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Product image</label>
        <div
          className="relative flex items-center gap-3 cursor-pointer rounded-xl border border-dashed p-3 transition-colors"
          style={{ borderColor: previewSrc ? 'oklch(1 0 0 / 0.15)' : 'oklch(1 0 0 / 0.12)' }}
          onClick={() => fileRef.current?.click()}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="preview" className="h-20 w-20 rounded-lg object-cover shrink-0 border border-white/10" />
          ) : (
            <span className="h-20 w-20 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'oklch(1 0 0 / 0.05)' }}>
              <ImageIcon className="h-7 w-7 text-white/20" />
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-white/70 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {previewSrc ? 'Click to replace image' : 'Click to upload image'}
            </p>
            <p className="text-xs text-white/30 mt-0.5">JPG, PNG, WebP — max 5 MB</p>
            {previewSrc && (
              <button
                type="button"
                className="mt-1.5 text-xs text-white/30 hover:text-red-400 transition-colors"
                onClick={(e) => { e.stopPropagation(); setImageFile(null); setPreviewSrc(''); setImageUrl('') }}
              >
                Remove image
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {uploadError && (
          <p className="mt-2 text-xs text-red-400 rounded-lg px-3 py-2" style={{ background: 'oklch(0.63 0.225 27 / 0.1)' }}>
            Upload failed: {uploadError} — check Supabase credentials in .env.local
          </p>
        )}
        <p className="mt-1.5 text-xs text-white/30">Or paste a URL:</p>
        <Input
          className="mt-1"
          value={imageUrl}
          onChange={(e) => { setImageUrl(e.target.value); if (e.target.value.startsWith('http')) setPreviewSrc(e.target.value) }}
          placeholder="https://..."
        />
      </div>

      {[
        { label: 'Name *', value: name, set: setName, type: 'text' },
        { label: 'Emoji (fallback icon)', value: emoji, set: setEmoji, type: 'text' },
        { label: 'Sale price *', value: price, set: setPrice, type: 'number' },
        { label: 'Purchase cost', value: cost, set: setCost, type: 'number' },
        ...(!initial ? [{ label: 'Initial stock', value: stock, set: setStock, type: 'number' }] : []),
        { label: 'Barcode', value: barcode, set: setBarcode, type: 'text' },
      ].map(({ label, value, set, type }) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input type={type} value={value} onChange={(e) => set(e.target.value)} step={type === 'number' ? '0.01' : undefined} />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Category</label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">No category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || uploading || !name || !price}
        onClick={handleSave}
      >
        {uploading ? 'Uploading image...' : saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
