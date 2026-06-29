'use client'

import { useState } from 'react'
import { Star, Shield, Truck, Leaf } from 'lucide-react'
import { QuantitySelector } from './QuantitySelector'
import { AddToCartButton } from './AddToCartButton'
import { ProductBadges } from './ProductBadges'
import { formatPrice, discountPercent } from '@/lib/utils/formatPrice'
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types/product'

interface ProductInfoProps {
  product: Product
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1)

  const variant = product.variants[0]
  if (!variant) return null

  const savings = discountPercent(variant.price, variant.compareAtPrice ?? 0)

  const usps = [
    { icon: Shield, text: '60+ Research-Backed Ingredients' },
    { icon: Leaf,   text: 'No Artificial Colours or Flavours' },
    { icon: Truck,  text: 'Free Shipping on All Orders' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Brand label — Teal */}
      <p className="text-label text-brand-teal">FUYL NUTRITION</p>

      {/* Title */}
      <h1 className="text-display-xl font-display text-brand-forest">{product.name}</h1>

      {/* Rating */}
      {product.rating && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1,2,3,4,5].map((n) => (
              <Star
                key={n}
                size={14}
                className={n <= Math.round(product.rating!) ? 'fill-amber-400 text-amber-400' : 'text-brand-border'}
              />
            ))}
          </div>
          <span className="text-body-sm font-semibold text-brand-forest">{product.rating}</span>
          {product.reviewCount && (
            <span className="text-body-xs text-brand-muted">
              ({product.reviewCount} reviews)
            </span>
          )}
        </div>
      )}

      {/* Price — Rose Gold featured pricing */}
      <div className="flex items-baseline gap-3">
        <span className="text-display-md font-display text-brand-forest">{formatPrice(variant.price)}</span>
        {variant.compareAtPrice && (
          <>
            <span className="text-body-md line-through text-brand-muted">
              {formatPrice(variant.compareAtPrice)}
            </span>
            {/* Rose Gold savings badge — premium pricing highlight */}
            {savings && <Badge variant="berry">{savings}</Badge>}
          </>
        )}
      </div>

      {/* Flavour / variant label */}
      <p className="text-body-sm text-brand-muted">
        Mixed Berry · 15 Sachets · 150g
      </p>

      {/* Badges */}
      <ProductBadges tags={product.tags} badge={product.badge} />

      {/* Qty + ATC */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-4">
          <span className="text-label text-brand-muted">Quantity</span>
          <QuantitySelector value={quantity} onChange={setQuantity} max={10} />
        </div>
        <AddToCartButton product={product} variant={variant} quantity={quantity} />
      </div>

      {/* USP row — Teal icons */}
      <div className="pt-2 space-y-2.5 border-t border-brand-border">
        {usps.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <Icon size={15} className="text-brand-teal shrink-0" />
            <span className="text-body-sm text-brand-forest">{text}</span>
          </div>
        ))}
      </div>

      {/* Money-back guarantee */}
      <p className="text-body-xs p-3 rounded-sm text-center font-medium bg-brand-cream text-brand-muted">
        30-Day Money-Back Guarantee · If you don't feel the difference, we'll refund you.
      </p>
    </div>
  )
}
