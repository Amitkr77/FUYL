'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml'
import type { Product } from '@/types/product'

interface ProductTabsProps {
  product: Product
}

export function ProductTabs({ product }: ProductTabsProps) {
  const tabs = [
    'Description',
    ...(product.ingredients.length ? ['Ingredients'] : []),
    ...(product.benefits.length ? ['Benefits'] : []),
  ] as const
  const [active, setActive] = useState<string>(tabs[0])

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
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) || '<p>No description available.</p>' }}
          />
        )}

        {active === 'Ingredients' && (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {product.ingredients.map((ingredient) => (
              <li key={ingredient} className="flex items-start gap-2.5 text-body-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                <span className="text-brand-forest">{ingredient}</span>
              </li>
            ))}
          </ul>
        )}

        {active === 'Benefits' && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-body-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-brand-teal" />
                <span className="text-brand-forest">{benefit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
