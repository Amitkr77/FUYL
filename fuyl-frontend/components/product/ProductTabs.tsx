'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { DeliveryInfo } from './DeliveryInfo'
import type { Product } from '@/types/product'

interface ProductTabsProps {
  product: Product
  // Pre-sanitized on the server (see the product page) so the Node HTML
  // sanitizer never has to be bundled into this client component.
  descriptionHtml: string
}

// Formula-level groupings + claims — same across every FUYL COMPLETE+ sachet,
// not per-product data, so kept static here rather than modeled as a field.
const INGREDIENT_CATEGORIES = [
  'Greens', 'Berries', 'Fruits', 'Superfoods', 'Botanicals', 'Detox Blend',
  'Adaptogens', 'Prebiotic', 'Probiotic', 'Digestive Enzymes', 'Omega Source',
  'Vitamins', 'Minerals', 'Antioxidants',
]

const FORMULA_HIGHLIGHTS = [
  'Sweetened with monk fruit', '100% vegetarian', 'No artificial colours & flavours',
]

export function ProductTabs({ product, descriptionHtml }: ProductTabsProps) {
  const hasIngredients = product.ingredients && product.ingredients.length > 0
  const tabs = ['Description', ...(hasIngredients ? ['Ingredients'] : []), 'Delivery'] as const
  const [active, setActive] = useState<string>('Description')

  return (
    <div className="mt-10">
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-brand-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              'px-4 py-3 text-label transition-colors duration-150 border-b-2 -mb-px',
              active === tab
                ? 'text-brand-forest border-brand-forest'
                : 'text-[#6B6B6B] border-transparent hover:text-[#0A0A0A]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        {active === 'Description' && (
          <div
            className="prose prose-sm max-w-none text-body-md leading-relaxed"
            dangerouslySetInnerHTML={{ __html: descriptionHtml || '<p>No description available.</p>' }}
          />
        )}

        {active === 'Ingredients' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-label mb-2.5 text-brand-muted">Formula Categories</p>
              <div className="flex flex-wrap gap-2">
                {INGREDIENT_CATEGORIES.map((c) => (
                  <Badge key={c} variant="muted">{c}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-label mb-2.5 text-brand-muted">Highlights</p>
              <div className="flex flex-wrap gap-2">
                {FORMULA_HIGHLIGHTS.map((h) => (
                  <Badge key={h} variant="success">{h}</Badge>
                ))}
              </div>
            </div>

            {product.ingredients.length ? (
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {product.ingredients.map((ingredient) => (
                  <li key={ingredient} className="flex items-start gap-2.5 text-body-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                    <span className="text-brand-forest">{ingredient}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-brand-muted">No ingredient list available.</p>
            )}
          </div>
        )}

        {active === 'Delivery' && <DeliveryInfo />}
      </div>
    </div>
  )
}
