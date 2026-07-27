'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, Check, Search } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
}

// Dependency-free searchable dropdown (combobox) — replaces plain native
// <select> where the option list can grow long (e.g. categories).
export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', emptyText = 'No results' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = options.find((o) => o.value === value)
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
      >
        <span className={selected ? 'text-slate-900 truncate' : 'text-slate-400'}>{selected?.label ?? placeholder}</span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-sm bg-transparent focus:outline-none text-slate-900"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
                >
                  <span className="text-slate-900 truncate">{o.label}</span>
                  {o.value === value && <Check className="w-3.5 h-3.5 text-[#558476] flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
