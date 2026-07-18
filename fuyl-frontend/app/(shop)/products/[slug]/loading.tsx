import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="container-brand section-py">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* PDP grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery — 2×3 grid, matches ProductGallery */}
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3.5 w-56" />
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-13 flex-1" />
              <Skeleton className="h-13 w-13" />
            </div>
            <Skeleton className="h-13 w-full" />
          </div>
          <div className="pt-2 space-y-2.5 border-t border-brand-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-3.5 w-48" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="flex gap-6 border-b border-brand-border mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20 mb-3" />
          ))}
        </div>
        <Skeleton className="h-3.5 w-full mb-2" />
        <Skeleton className="h-3.5 w-full mb-2" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  )
}
