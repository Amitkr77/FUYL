'use client'

import { useEffect } from 'react'

// Segment error boundary for the admin area — a failed data fetch (e.g. the
// backend 500s) now renders a recoverable panel with the actual message
// (admins are trusted internal users) instead of Next's default crash screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-500">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-slate-800 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  )
}
