'use client'

import { formatPrice } from '@/lib/utils/formatPrice'
import type { ProductVariant } from '@/types/product'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedId: string
  onChange: (variant: ProductVariant) => void
}

export function VariantSelector({ variants, selectedId, onChange }: VariantSelectorProps) {
  if (variants.length <= 1) return null

  const basePrice = variants[0].price

  return (
    <div>
      <span className="text-label text-brand-muted">Size / Variant</span>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {variants.map((v) => {
          const isSelected = v.id === selectedId
          const isUnavailable = !v.available
          const priceDiff = v.price - basePrice

          return (
            <button
              key={v.id || v.title}
              type="button"
              disabled={isUnavailable}
              onClick={() => onChange(v)}
              title={isUnavailable ? 'Out of stock' : v.title}
              className={`relative px-3.5 py-2 rounded-xl border text-body-sm font-medium transition-all
                ${isSelected
                  ? 'border-brand-forest bg-brand-forest text-white shadow-sm'
                  : isUnavailable
                    ? 'border-brand-border/50 text-brand-muted/60 bg-brand-cream/30 cursor-not-allowed select-none'
                    : 'border-brand-border text-brand-forest hover:border-brand-forest hover:bg-brand-sage/10'
                }`}
            >
              {/* Diagonal strike-through for out-of-stock variants */}
              {isUnavailable && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-full border-t border-brand-muted/40 rotate-[-20deg] absolute" />
                </span>
              )}
              <span className={isUnavailable ? 'opacity-50' : ''}>
                {v.title}
                {!isUnavailable && priceDiff !== 0 && (
                  <span className={`ml-1.5 text-body-xs ${isSelected ? 'text-white/70' : 'text-brand-muted'}`}>
                    {priceDiff > 0 ? '+' : ''}{formatPrice(Math.abs(priceDiff))}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
