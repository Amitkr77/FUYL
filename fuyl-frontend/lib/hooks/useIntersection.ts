'use client'

import { useEffect, useRef, useState } from 'react'

interface Options {
  threshold?: number
  rootMargin?: string
  once?:      boolean  // trigger only once (default: true)
}

export function useIntersection<T extends Element = HTMLDivElement>({
  threshold  = 0.15,
  rootMargin = '0px',
  once       = true,
}: Options = {}) {
  const ref      = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, visible }
}
