'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Star, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface MockProduct {
  id: string
  name: string
  tag: string
  badge?: string
  image: string
  hoverImage: string
  price: number
  comparePrice?: number
  rating: number
  reviewCount: number
  slug: string
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function MockProductCard({ product }: { product: MockProduct }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)

  function handleATC(e: React.MouseEvent) {
    e.preventDefault()
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null

  return (
    <div className="group relative flex flex-col">
      {/* ── Image container ────────────────────────────────────── */}
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-brand-sage">

          {/* Primary image */}
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
          />

          {/* Hover image */}
          <img
            src={product.hoverImage}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 scale-[1.04] group-hover:scale-100 transition-[opacity,transform] duration-500"
          />

          {/* Badge — top left */}
          {product.badge && (
            <div className="absolute left-3 top-3">
              <span className="inline-block rounded-full bg-brand-forest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                {product.badge}
              </span>
            </div>
          )}

          {/* Wishlist — top right */}
          <button
            type="button"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={(e) => {
              e.preventDefault()
              setWishlisted((v) => !v)
            }}
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200',
              wishlisted
                ? 'bg-brand-rose text-white'
                : 'bg-white/80 text-brand-muted hover:bg-white hover:text-brand-rose',
            )}
          >
            <Heart
              size={15}
              className={cn('transition-all duration-200', wishlisted && 'fill-current')}
            />
          </button>

          {/* ATC button — slides up on hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleATC}
              className={cn(
                'flex w-full items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-200',
                added
                  ? 'bg-brand-teal text-white'
                  : 'bg-brand-forest text-white hover:bg-brand-teal',
              )}
            >
              <ShoppingBag size={14} />
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </Link>

      {/* ── Info ──────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-1.5">
        {/* Tag */}
        <span className="text-label text-brand-teal">{product.tag}</span>

        {/* Title */}
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-semibold leading-snug text-brand-forest transition-colors hover:text-brand-teal"
        >
          {product.name}
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={11}
                className={cn(
                  s <= Math.round(product.rating)
                    ? 'fill-brand-rose text-brand-rose'
                    : 'fill-brand-border text-brand-border',
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-brand-muted">
            {product.rating} ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-brand-forest">
            {formatINR(product.price)}
          </span>
          {product.comparePrice && (
            <>
              <span className="text-sm text-brand-muted line-through">
                {formatINR(product.comparePrice)}
              </span>
              {discount && (
                <span className="text-xs font-semibold text-brand-teal">
                  {discount}% off
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
