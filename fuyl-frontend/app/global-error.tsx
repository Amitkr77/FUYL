'use client'

import { useEffect } from 'react'

// Root error boundary — only fires when the root layout itself throws, so it
// replaces <html>/<body> and can't rely on globals.css or brand tokens being
// available. Kept intentionally self-contained with inline styles.
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          color: '#12291F',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 480 }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              height: 44,
              padding: '0 2rem',
              border: 'none',
              background: '#12291F',
              color: '#fff',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
