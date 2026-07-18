import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="container-brand section-py">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Header */}
      <div className="mb-10">
        <Skeleton className="h-8 w-56 mb-3" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-sm mb-3" />
            <Skeleton className="h-3.5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
