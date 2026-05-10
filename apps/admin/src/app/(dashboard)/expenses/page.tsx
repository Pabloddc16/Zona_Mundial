'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Expense } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { Plus } from 'lucide-react'
import { format, subDays } from 'date-fns'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const CATEGORIES = ['compra-inventario', 'sueldos', 'renta', 'servicios', 'transporte', 'marketing', 'impuestos', 'otros']

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, from, to, category],
    queryFn: () => api.expenses.list({ page: String(page), from, to, ...(category ? { category } : {}) }),
  })

  const total = (data?.items ?? []).reduce((s, e) => s + e.amount, 0)

  const createMut = useMutation({
    mutationFn: (body: unknown) => api.expenses.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setCreating(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.expenses.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setEditing(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.expenses.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const columns = [
    { key: 'date', header: 'Date', cell: (r: Expense) => r.date },
    { key: 'concept', header: 'Concept' },
    { key: 'category', header: 'Category', cell: (r: Expense) => r.category ?? 'otros' },
    { key: 'payment_method', header: 'Method', cell: (r: Expense) => r.payment_method ?? '—' },
    { key: 'amount', header: 'Amount', cell: (r: Expense) => fmt(r.amount), className: 'text-right font-medium' },
    { key: 'actions', header: '', cell: (r: Expense) => (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
          if (confirm('Delete this expense?')) deleteMut.mutate(r.id)
        }}>Delete</Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white/90">Expenses</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="w-40" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="w-40" />
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="w-48">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        {data && (
          <div className="ml-auto text-sm font-medium text-white/75 flex items-center">
            Total: <span className="ml-1 text-red-600">{fmt(total)}</span>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={data?.items ?? []} keyFn={(r) => r.id} loading={isLoading} />
      <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} onPage={setPage} />

      <Sheet open={creating} onClose={() => setCreating(false)} title="New expense">
        <ExpenseForm onSave={(b) => createMut.mutate(b)} saving={createMut.isPending} error={createMut.isError ? (createMut.error as Error).message : ''} />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit expense">
        {editing && (
          <ExpenseForm
            initial={editing}
            onSave={(b) => updateMut.mutate({ id: editing.id, body: b })}
            saving={updateMut.isPending}
            error={updateMut.isError ? (updateMut.error as Error).message : ''}
          />
        )}
      </Sheet>
    </div>
  )
}

function ExpenseForm({ initial, onSave, saving, error }: {
  initial?: Expense; onSave: (b: unknown) => void; saving: boolean; error: string
}) {
  const [date, setDate] = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [concept, setConcept] = useState(initial?.concept ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'otros')
  const [amount, setAmount] = useState(String(initial?.amount ?? ''))
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? 'efectivo')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/75">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/75">Amount</label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0.01" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Concept</label>
        <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Expense description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/75">Category</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/75">Payment method</label>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {['efectivo', 'tarjeta', 'transferencia'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/75">Notes</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-full"
        disabled={saving || !concept || !amount}
        onClick={() => onSave({ date, concept, category, amount: Number(amount), payment_method: paymentMethod, notes })}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
