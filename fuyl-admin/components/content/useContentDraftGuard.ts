'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useContentDraftGuard(value: unknown) {
  const serialized = JSON.stringify(value)
  const savedValue = useRef(serialized)
  const [, refresh] = useState(0)
  const dirty = serialized !== savedValue.current

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const markSaved = useCallback((nextValue: unknown) => {
    savedValue.current = JSON.stringify(nextValue)
    refresh((value) => value + 1)
  }, [])

  return { dirty, markSaved }
}
