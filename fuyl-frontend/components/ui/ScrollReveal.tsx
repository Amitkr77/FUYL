'use client'

import { useIntersection } from '@/lib/hooks/useIntersection'
import { cn } from '@/lib/utils/cn'

interface ScrollRevealProps {
  children:   React.ReactNode
  delay?:     number
  className?: string
}

export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const { ref, visible } = useIntersection<HTMLDivElement>({ threshold: 0.12 })

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7',
        className
      )}
    >
      {children}
    </div>
  )
}
