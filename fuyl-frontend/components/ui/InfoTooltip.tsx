'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface Props {
  text: string
  side?: 'top' | 'bottom' | 'right'
  size?: 'sm' | 'md'
}

export function InfoTooltip({ text, side = 'top', size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const posClass =
    side === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2'
    : side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-2'

  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="More information"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center ml-1 transition-colors"
        style={{ color: 'var(--color-brand-muted)' }}
      >
        <Info className={iconSize} />
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute z-50 w-60 rounded-sm px-3 py-2.5 text-xs leading-relaxed shadow-lg pointer-events-none whitespace-normal ${posClass}`}
          style={{ background: '#1C3B31', color: '#fff' }}
        >
          {text}
          {/* Arrow */}
          <span
            className={`absolute w-2 h-2 rotate-45 ${
              side === 'bottom'
                ? '-top-1 left-1/2 -translate-x-1/2'
                : side === 'right'
                ? 'top-1/2 -translate-y-1/2 -left-1'
                : '-bottom-1 left-1/2 -translate-x-1/2'
            }`}
            style={{ background: '#1C3B31' }}
          />
        </div>
      )}
    </div>
  )
}
