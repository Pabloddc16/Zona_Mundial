'use client'
import { cn } from '@/lib/cn'

interface Column<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn: (row: T) => string
  emptyMessage?: string
  loading?: boolean
  className?: string
}

export function DataTable<T>({ columns, data, keyFn, emptyMessage = 'Sin datos', loading, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-lg', className)} style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: 'oklch(1 0 0 / 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide', col.className)} style={{ color: 'var(--text-muted)' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={keyFn(row)} className="transition-colors" style={{ borderTop: '1px solid var(--glass-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(1 0 0 / 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3', col.className)} style={{ color: 'var(--text-primary)' }}>
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
