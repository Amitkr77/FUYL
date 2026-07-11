'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import { useCart } from '@/lib/hooks/useCart'

export function CartSummary() {
  const router = useRouter()
  const { subtotal } = useCart()
  const shipping = subtotal >= 499 ? 0 : 79
  const total    = subtotal + shipping

  return (
    <div className="p-6 rounded-sm border border-brand-border bg-white space-y-4 sticky top-24">
      <h2 className="text-display-md font-display text-brand-forest">ORDER SUMMARY</h2>
      <div className="space-y-2.5 text-body-sm">
        <div className="flex justify-between">
          <span className="text-brand-muted">Subtotal</span>
          <span className="text-brand-forest font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-muted">Shipping</span>
          {/* Teal "Free" — positive interactive indicator */}
          <span>{shipping === 0
            ? <span className="text-brand-teal font-semibold">Free</span>
            : formatPrice(shipping)}
          </span>
        </div>
        {shipping > 0 && (
          <p className="text-body-xs p-2.5 rounded-sm text-center bg-brand-cream text-brand-muted">
            Add {formatPrice(499 - subtotal)} more for free shipping
          </p>
        )}
        <div className="flex justify-between font-semibold pt-2 border-t border-brand-border text-body-md text-brand-forest">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
      {/* Rose Gold primary CTA — key conversion action */}
      <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/checkout')}>
        Proceed to Checkout
      </Button>
      <p className="text-body-xs text-center text-brand-muted">
        Taxes calculated at checkout · Secure payment via Razorpay
      </p>
    </div>
  )
}
