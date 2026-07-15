'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'
import { useCart } from '@/lib/hooks/useCart'
import type { CartItem } from '@/types/cart'

interface CartLineItemProps {
  item: CartItem
}

export function CartLineItem({ item }: CartLineItemProps) {
  const { updateQty, removeItem } = useCart()

  return (
    <div className="flex gap-4 py-5 border-b" style={{ borderColor: 'var(--color-brand-border)' }}>
      <Link href={`/products/${item.slug}`} className="relative h-24 w-24 shrink-0 rounded-sm overflow-hidden" style={{ background: 'var(--color-brand-cream)' }}>
        <Image src={item.image} alt={item.imageAlt} fill className="object-cover" sizes="96px" />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/products/${item.slug}`} className="text-body-sm font-semibold hover:text-brand-teal transition-colors">
              {item.name}
            </Link>
            {item.variantTitle && item.variantTitle !== 'Default Title' && (
              <p className="text-body-xs mt-0.5" style={{ color: 'var(--color-brand-muted)' }}>{item.variantTitle}</p>
            )}
          </div>
          <button
            onClick={() => removeItem(item.productId, item.variantId || undefined)}
            aria-label="Remove"
            className="shrink-0 p-1 transition-colors hover:text-red-500"
            style={{ color: 'var(--color-brand-muted)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Qty controls */}
          <div className="inline-flex items-center border rounded-sm" style={{ borderColor: 'var(--color-brand-border)' }}>
            <button onClick={() => updateQty(item.productId, item.variantId || undefined, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F5EDE8] transition-colors" aria-label="Decrease">
              <Minus size={12} />
            </button>
            <span className="w-8 text-center text-body-sm font-semibold tabular-nums">{item.quantity}</span>
            <button onClick={() => updateQty(item.productId, item.variantId || undefined, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#F5EDE8] transition-colors" aria-label="Increase">
              <Plus size={12} />
            </button>
          </div>
          <span className="text-body-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  )
}
