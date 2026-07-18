import { cn } from '@/lib/utils/cn'
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  loading?:   boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  /* Forest Green — primary conversion action */
  primary:   'bg-brand-forest text-white hover:bg-brand-sage hover:text-brand-forest active:scale-[0.98] border border-brand-forest hover:border-brand-sage',
  /* Deep Forest Green — strong secondary action */
  secondary: 'bg-brand-forest text-white hover:bg-brand-olive active:scale-[0.98] border border-brand-forest',
  /* Forest Green outline */
  outline:   'bg-transparent text-brand-forest border border-brand-forest hover:bg-brand-forest hover:text-white active:scale-[0.98]',
  /* Subtle sage hover — ghost / tertiary */
  ghost:     'bg-transparent text-brand-forest hover:bg-brand-sage-mid',
  /* Teal text link */
  link:      'bg-transparent text-brand-teal hover:underline p-0 h-auto',
}

const sizes: Record<Size, string> = {
  sm: 'h-9  px-4  text-xs  tracking-widest',
  md: 'h-11 px-6  text-xs  tracking-widest',
  lg: 'h-13 px-8  text-sm  tracking-widest',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-body font-semibold uppercase',
        'transition-all duration-200 ease-brand rounded-brand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={16} />
          {children}
        </>
      ) : children}
    </button>
  )
)

Button.displayName = 'Button'
