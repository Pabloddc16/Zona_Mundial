'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DataTable } from '@/components/shared/data-table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)

export default function CustomersPage() {
  const [tab, setTab] = useState<'app' | 'wholesale'>('app')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'unified'],
    queryFn: api.customers.unified,
  })

  const appCols = [
    { key: 'name', header: 'Nombre' },
    { key: 'phone', header: 'Teléfono', cell: (r: { phone?: string }) => r.phone ?? '—' },
    { key: 'email', header: 'Correo', cell: (r: { email?: string }) => r.email ?? '—' },
    { key: 'total_orders', header: 'Pedidos', cell: (r: { total_orders: number }) => r.total_orders, className: 'text-center' },
    { key: 'total_spent', header: 'Gastado', cell: (r: { total_spent: number }) => fmt(r.total_spent), className: 'text-right' },
  ]

  const wsCols = [
    { key: 'name', header: 'Razón social' },
    { key: 'rfc', header: 'RFC', cell: (r: { rfc?: string }) => <span className="font-mono text-xs">{r.rfc ?? '—'}</span> },
    { key: 'email', header: 'Correo', cell: (r: { email?: string }) => r.email ?? '—' },
    { key: 'totalOrders', header: 'Ventas', cell: (r: { totalOrders: number }) => r.totalOrders, className: 'text-center' },
    { key: 'totalSpent', header: 'Total', cell: (r: { totalSpent: number }) => fmt(r.totalSpent), className: 'text-right' },
  ]

  const appData = (data?.app ?? []).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)
  )
  const wsData = (data?.wholesale ?? []).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Clientes</h1>

      <div className="flex gap-4 items-center">
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => setTab('app')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'app' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            App <Badge className="ml-1">{data?.app.length ?? 0}</Badge>
          </button>
          <button
            onClick={() => setTab('wholesale')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'wholesale' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Mayoristas <Badge className="ml-1">{data?.wholesale.length ?? 0}</Badge>
          </button>
        </div>
        <Input
          placeholder="Buscar por nombre / teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {tab === 'app' ? (
        <DataTable
          columns={appCols as Parameters<typeof DataTable>[0]['columns']}
          data={appData}
          keyFn={(r) => r.id}
          loading={isLoading}
          emptyMessage="Sin clientes"
        />
      ) : (
        <DataTable
          columns={wsCols as Parameters<typeof DataTable>[0]['columns']}
          data={wsData}
          keyFn={(r) => r.id}
          loading={isLoading}
          emptyMessage="Sin mayoristas activos"
        />
      )}
    </div>
  )
}
