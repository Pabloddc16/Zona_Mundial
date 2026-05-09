import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/8 text-white/70',
        success: 'bg-green-500/15 text-green-400',
        warning: 'bg-amber-500/15 text-amber-400',
        danger: 'bg-red-500/15 text-red-400',
        info: 'bg-blue-500/15 text-blue-400',
        brand: 'bg-brand-500/20 text-brand-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
