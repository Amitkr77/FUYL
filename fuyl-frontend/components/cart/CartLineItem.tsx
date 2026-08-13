'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'
import { useCart } from '@/lib/hooks/useCart'
import { getErrorMessage } from '@/lib/api/client'
import type { CartItem } from '@/types/cart'
import { getProductStock } from '@/lib/api/products'

interface CartLineItemProps {
  item: CartItem
}

export function CartLineItem({ item }: CartLineItemProps) {
  const { updateQty, removeItem, isLoading } = useCart()
  const [qtyError, setQtyError] = useState('')
  const [availableStock, setAvailableStock] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void getProductStock(item.productId, item.variantId || undefined).then((stock) => {
      if (active) setAvailableStock(stock ?? 0)
    })
    return () => { active = false }
  }, [item.productId, item.variantId])

  const handleUpdateQty = async (newQty: number) => {
    setQtyError('')
    if (availableStock !== null && newQty > availableStock) {
      setQtyError(`Only ${availableStock} unit${availableStock === 1 ? '' : 's'} available`)
      return
    }
    try {
      await updateQty(item.productId, item.variantId || undefined, newQty)
    } catch (err) {
      setQtyError(getErrorMessage(err, 'Could not update quantity'))
    }
  }

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
            disabled={isLoading}
            aria-label="Remove"
            className="shrink-0 p-1 transition-colors hover:text-red-500 disabled:opacity-50"
            style={{ color: 'var(--color-brand-muted)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Qty controls */}
          <div className="inline-flex items-center border rounded-sm" style={{ borderColor: 'var(--color-brand-border)' }}>
            {/* Disabled at qty 1 so a stray tap can't silently delete the line —
                removal is the explicit trash button above. */}
            <button onClick={() => handleUpdateQty(item.quantity - 1)} disabled={isLoading || item.quantity <= 1} className="w-10 h-10 flex items-center justify-center hover:bg-[#F5EDE8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Decrease quantity">
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-body-sm font-semibold tabular-nums">{item.quantity}</span>
            <button onClick={() => handleUpdateQty(item.quantity + 1)} disabled={isLoading || (availableStock !== null && item.quantity >= availableStock)} className="w-10 h-10 flex items-center justify-center hover:bg-[#F5EDE8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Increase quantity">
              <Plus size={14} />
            </button>
          </div>
          <span className="text-body-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
        </div>

        {qtyError && (
          <p className="text-body-xs text-red-500">{qtyError}</p>
        )}
        {!qtyError && availableStock !== null && item.quantity >= availableStock && (
          <p className="text-body-xs text-brand-muted">Maximum available quantity reached</p>
        )}
      </div>
    </div>
  )
}
