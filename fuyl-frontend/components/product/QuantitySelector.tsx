'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  value:    number
  min?:     number
  max?:     number
  onChange: (v: number) => void
}

export function QuantitySelector({ value, min = 1, max = 10, onChange }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center border rounded-sm" style={{ borderColor: 'var(--color-brand-border)' }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[#F5EDE8] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center text-body-sm font-semibold tabular-nums select-none">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[#F5EDE8] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
