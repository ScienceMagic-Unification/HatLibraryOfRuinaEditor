import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-500/15 text-emerald-400',
        warning: 'border-transparent bg-amber-500/15 text-amber-400',
        destructive: 'border-transparent bg-red-500/15 text-red-400'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
