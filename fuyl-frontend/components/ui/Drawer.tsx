'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DrawerProps {
  open:       boolean
  onClose:    () => void
  side?:      'right' | 'left'
  title?:     string
  children:   React.ReactNode
  className?: string
}

export function Drawer({ open, onClose, side = 'right', title, children, className }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed top-0 bottom-0 z-50 w-full max-w-md bg-white flex flex-col',
          'shadow-2xl',
          side === 'right'
            ? 'right-0 animate-slide-in-r'
            : 'left-0 animate-slide-in-l',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-cream">
          {title && (
            <span className="text-label tracking-widest text-brand-forest">{title}</span>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto p-1 text-brand-olive hover:text-brand-teal transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
