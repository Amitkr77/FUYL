import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="container-brand section-py max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-32" />
      </div>

      <Skeleton className="aspect-video rounded-sm mb-8" />

      <Skeleton className="h-3 w-24 mb-6" />
      <Skeleton className="h-9 w-3/4 mb-4" />

      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="flex gap-2 mb-8">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={`h-3.5 ${i === 5 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}
