import { cn } from '@/lib/cn'

export function Card({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg', className)} style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)', ...style }} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 p-4 pb-3', className)} {...props} />
}

export function CardTitle({ className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold', className)} style={{ color: 'var(--text-primary)', ...style }} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}
