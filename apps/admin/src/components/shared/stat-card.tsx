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
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 border-l-4 shadow-sm', accentMap[accent], className)}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}
