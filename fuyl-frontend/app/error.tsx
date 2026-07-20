'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Segment error boundary — catches uncaught render/data errors in any page so
// the shopper gets a branded, recoverable screen with a retry instead of
// Next's default error page.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface for logs / an error-reporting hook — otherwise the cause is lost.
    console.error(error)
  }, [error])

  return (
    <div className="container-brand section-py text-center flex flex-col items-center gap-6 min-h-[60vh] justify-center">
      <h1 className="text-display-xl font-display">SOMETHING WENT WRONG</h1>
      <p className="text-body-lg max-w-md" style={{ color: 'var(--color-brand-muted)' }}>
        An unexpected error occurred. Please try again — if it keeps happening, come back in a little while.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-11 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-8 text-xs font-semibold uppercase tracking-widest border border-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
