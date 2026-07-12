import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'default' | 'berry' | 'premium' | 'success' | 'warning' | 'muted'

interface BadgeProps {
  children:   React.ReactNode
  variant?:   BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand-forest  text-white',
  /* Forest Green — premium membership, featured pricing, luxury highlight */
  berry:   'bg-brand-forest  text-white',
  premium: 'bg-brand-forest  text-white',
  success: 'bg-brand-teal    text-white',
  warning: 'bg-amber-500     text-white',
  muted:   'bg-brand-border  text-brand-muted',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block text-body-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-brand',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
