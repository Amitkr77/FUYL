import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
}

/** Base shimmer block — size and shape are controlled entirely via className (w-*, h-*, rounded-*). */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton rounded-brand', className)} aria-hidden="true" />
}

/** A paragraph of skeleton text lines; the last line is shorter so it reads as a natural line-wrap. */
export function SkeletonText({ lines = 3, className, lineClassName }: {
  lines?: number
  className?: string
  lineClassName?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full', lineClassName)}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn('rounded-full', className)} />
}
