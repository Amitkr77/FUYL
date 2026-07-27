'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleProps {
  title: string
  description?: string
  defaultOpen?: boolean
  /** Rendered to the right of the header, outside the toggle button (so it can hold its own interactive controls, e.g. an "Add" link). */
  headerRight?: React.ReactNode
  children: React.ReactNode
}

// Section wrapper with a collapse/expand toggle — used to separate the
// product form's less-frequently-edited sections (Variants, Product Details,
// Shipping) without permanently consuming vertical space.
export function Collapsible({ title, description, defaultOpen = true, headerRight, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-between gap-3 text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
        {headerRight && <div className="flex-shrink-0 ml-3">{headerRight}</div>}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}
