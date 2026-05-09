'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Customer } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.customers.list(),
  })

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.customers.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setCreating(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.customers.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setEditing(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.customers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  const filtered = (data ?? []).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'phone', header: 'Teléfono', cell: (r: Customer) => r.phone ?? '—' },
    { key: 'email', header: 'Correo', cell: (r: Customer) => r.email ?? '—' },
    { key: 'address', header: 'Dirección', cell: (r: Customer) => <span className="text-xs text-white/50 truncate max-w-xs block">{r.address ?? '—'}</span> },
    { key: 'total_orders', header: 'Pedidos', cell: (r: Customer) => r.total_orders, className: 'text-center' },
    { key: 'total_spent', header: 'Gastado', cell: (r: Customer) => fmt(r.total_spent), className: 'text-right' },
    { key: 'actions', header: '', cell: (r: Customer) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Editar</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm(`Eliminar a ${r.name}?`)) deleteMut.mutate(r.id)
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Clientes</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />Nuevo cliente</Button>
      </div>

      <Input
        placeholder="Buscar por nombre / teléfono / correo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <DataTable columns={columns} data={filtered} keyFn={(r) => r.id} loading={isLoading} emptyMessage="Sin clientes" />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Nuevo cliente">
        <CustomerForm
          onSave={(b) => createMut.mutate(b)}
          saving={createMut.isPending}
          error={createMut.isError ? (createMut.error as Error).message : ''}
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar cliente">
        {editing && (
          <CustomerForm
            initial={editing}
            onSave={(b) => updateMut.mutate({ id: editing.id, body: b })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Dialog>
    </div>
  )
}

function CustomerForm({ initial, onSave, saving, error }: {
  initial?: Customer; onSave: (b: unknown) => void; saving: boolean; error: string
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')

  return (
    <div className="space-y-4">
      {([
        ['Nombre *', name, setName, 'text'],
        ['Teléfono', phone, setPhone, 'tel'],
        ['Correo', email, setEmail, 'email'],
        ['Dirección', address, setAddress, 'text'],
      ] as [string, string, (v: string) => void, string][]).map(([label, value, set, type]) => (
        <div key={label}>
          <label className="mb-1 block text-sm font-medium text-white/75">{label}</label>
          <Input type={type} value={value} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={saving || !name} onClick={() => onSave({ name, phone: phone || undefined, email: email || undefined, address: address || undefined })}>
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
