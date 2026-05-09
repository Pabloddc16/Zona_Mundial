import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'yellow' | 'default'
  className?: string
}

const accentMap = {
  green: 'border-l-green-500',
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
  yellow: 'border-l-brand-500',
  default: 'border-l-gray-300',
}

export function StatCard({ label, value, sub, accent = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn('rounded-lg p-4 border-l-4', accentMap[accent], className)}
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)', borderLeftWidth: '4px' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}
