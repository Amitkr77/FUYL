// Segment loading UI — shown while a Server Component page awaits its data,
// so navigation gives immediate feedback instead of a blocked click.
export default function Loading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
    </div>
  )
}
