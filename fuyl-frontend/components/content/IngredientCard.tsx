'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface IngredientData {
  id:          string
  name:        string
  amount:      string
  benefit:     string
  description: string
  emoji:       string
  category:    string
  bg:          string
  accent:      string
  clinical?:   string
}

interface IngredientCardProps {
  ingredient: IngredientData
}

export function IngredientCard({ ingredient }: IngredientCardProps) {
  const [open, setOpen] = useState(false)
  const { name, amount, benefit, description, emoji, bg, accent, clinical } = ingredient

  return (
    <>
      {/* Card */}
      <button
        onClick={() => setOpen(true)}
        className="group w-full text-left flex flex-col gap-3 p-5 rounded-sm border transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
        style={{ borderColor: 'var(--color-brand-border)', background: bg }}
        aria-label={`Learn more about ${name}`}
      >
        <div className="flex items-start justify-between">
          <span className="text-3xl">{emoji}</span>
          <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-body-sm font-semibold leading-snug">{name}</p>
          <p className="text-body-xs font-medium mt-0.5" style={{ color: accent }}>{amount}</p>
          <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>{benefit}</p>
        </div>
      </button>

      {/* Detail modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto rounded-sm shadow-2xl p-7 animate-fade-in"
            style={{ background: bg }}
            role="dialog"
            aria-modal="true"
            aria-label={name}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-black/10"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <span className="text-4xl">{emoji}</span>
            <p className="text-body-xs font-semibold uppercase tracking-widest mt-3 mb-1" style={{ color: accent }}>{ingredient.category}</p>
            <h3 className="text-display-md font-display mt-1">{name.toUpperCase()}</h3>
            <p className="text-label mt-1" style={{ color: accent }}>{amount} per sachet</p>
            <p className="text-body-md leading-relaxed mt-4" style={{ color: 'var(--color-brand-muted)' }}>
              {description}
            </p>
            {clinical && (
              <p className="text-body-xs mt-4 p-3 rounded-sm" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--color-brand-muted)' }}>
                <strong>Clinical backing:</strong> {clinical}
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}
