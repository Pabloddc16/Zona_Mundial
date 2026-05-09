import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        'flex h-9 w-full rounded-md px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ background: 'oklch(1 0 0 / 0.06)', border: '1px solid oklch(1 0 0 / 0.10)', color: 'var(--text-primary)' }}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
