'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/lib/hooks/useCart'
import { formatPrice } from '@/lib/utils/formatPrice'

export function CartDrawer() {
  const router = useRouter()
  const { items, isOpen, closeCart, updateQty, removeItem, subtotal, syncCart } = useCart()

  // Reconcile local cart state with the backend once on mount, rather than
  // trusting persisted localStorage indefinitely (this component is always
  // mounted, per app/layout.tsx).
  useEffect(() => {
    syncCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Drawer open={isOpen} onClose={closeCart} side="right" title="Your Bag">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center bg-white">
          <p className="text-display-md font-display text-brand-forest uppercase">
            YOUR BAG<br />IS EMPTY
          </p>
          <p className="text-body-sm text-brand-muted">
            Add something good to it.
          </p>
          <Link
            href="/collections/all"
            onClick={closeCart}
            className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-olive"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-white">
          {/* Line items */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative h-20 w-20 shrink-0 rounded-sm overflow-hidden bg-brand-cream">
                  <Image src={item.image} alt={item.imageAlt} fill className="object-cover" sizes="80px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold leading-snug text-brand-forest">{item.name}</p>
                  {item.variantTitle && item.variantTitle !== 'Default Title' && (
                    <p className="text-body-xs mt-0.5 text-brand-muted">{item.variantTitle}</p>
                  )}
                  {/* Rose Gold price — premium pricing highlight */}
                  <p className="text-body-sm font-semibold mt-1 text-brand-rose">
                    {formatPrice(item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQty(item.productId, item.variantId || undefined, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="p-1 rounded-sm border border-brand-border text-brand-olive hover:text-brand-teal hover:border-brand-teal transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-body-sm w-6 text-center tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.variantId || undefined, item.quantity + 1)}
                      aria-label="Increase quantity"
                      className="p-1 rounded-sm border border-brand-border text-brand-olive hover:text-brand-teal hover:border-brand-teal transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId || undefined)}
                      aria-label="Remove item"
                      className="ml-auto p-1 text-brand-muted hover:text-brand-rose transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + CTA */}
          <div className="px-6 py-5 space-y-4 border-t border-brand-border bg-brand-cream">
            <div className="flex justify-between items-center">
              <span className="text-label text-brand-muted">Subtotal</span>
              <span className="text-body-md font-semibold text-brand-forest">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-body-xs text-brand-muted">
              Shipping &amp; taxes calculated at checkout
            </p>
            {/* Primary CTA — Rose Gold (premium conversion action) */}
            <Button variant="primary" size="lg" fullWidth onClick={() => { closeCart(); router.push('/checkout') }}>
              Proceed to Checkout
            </Button>
            <Link
              href="/cart"
              onClick={closeCart}
              className="flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest border border-brand-forest text-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white"
            >
              View Full Cart
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  )
}
