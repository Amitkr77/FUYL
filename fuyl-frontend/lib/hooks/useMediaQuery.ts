'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Convenience exports
export const useIsMobile  = () => useMediaQuery('(max-width: 767px)')
export const useIsTablet  = () => useMediaQuery('(max-width: 1023px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
