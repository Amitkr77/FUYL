import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[60vh]">
        <div className="bg-brand-cream flex items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-24 lg:py-28">
          <div className="w-full max-w-lg">
            <Skeleton className="h-3 w-16 mb-5" />
            <Skeleton className="h-10 w-3/4 mb-6" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="min-h-[50vh] lg:min-h-0 rounded-none" />
      </section>

      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand">
          <div className="mb-12 flex justify-center gap-6 border-b border-brand-border pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-16" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-video rounded-sm mb-4" />
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
