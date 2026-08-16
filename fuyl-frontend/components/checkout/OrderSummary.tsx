'use client'

import { useState } from 'react'
import { ChevronDown, ShoppingBag, ShieldCheck, Truck, RotateCcw } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { CouponInput, type AppliedCoupon } from '@/components/checkout/CouponInput'
import { formatPrice } from '@/lib/utils/formatPrice'
import type { CartItem } from '@/types/cart'
import type { CheckoutPreview } from '@/lib/api/checkout'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  token?: string
  appliedCoupon: AppliedCoupon | null
  onApplyCoupon: (coupon: AppliedCoupon) => void
  onRemoveCoupon: () => void
  preview: CheckoutPreview | null
  previewLoading: boolean
  displayDiscount: number
  displayTotal: number
  walletRedemption?: number
  /** Auto-expand the mobile accordion — used on the Review step so items are visible before placing the order */
  defaultExpanded?: boolean
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Secure checkout' },
  { icon: Truck, label: 'Fast dispatch' },
  { icon: RotateCcw, label: '30-day guarantee' },
]

// Renders once in the DOM and adapts via CSS alone: a collapsible accordion
// on mobile (so the form is visible immediately instead of buried under a
// full cart dump), and an always-open sticky sidebar on desktop where there's
// room to show everything at once. The parent positions this with a grid
// `order` class — see app/(shop)/checkout/page.tsx.
export function OrderSummary({
  items, subtotal, token, appliedCoupon, onApplyCoupon, onRemoveCoupon,
  preview, previewLoading, displayDiscount, displayTotal, walletRedemption = 0, defaultExpanded = false,
}: OrderSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="rounded-2xl border border-brand-border bg-white overflow-hidden">
      {/* Mobile — collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="lg:hidden w-full flex items-center justify-between gap-3 p-4"
      >
        <span className="flex items-center gap-2 text-body-sm font-semibold text-brand-forest">
          <ShoppingBag size={16} className="text-brand-teal" />
          {expanded ? 'Hide' : 'Show'} order summary
          <span className="text-brand-muted font-normal">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-body-sm font-semibold text-brand-forest">{formatPrice(displayTotal)}</span>
          <ChevronDown size={16} className={`text-brand-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Desktop — static header */}
      <div className="hidden lg:flex items-center gap-2 p-5 pb-0">
        <ShoppingBag size={18} className="text-brand-teal" />
        <h2 className="text-display-sm font-display text-brand-forest">Order Summary</h2>
      </div>

      {/* Content — collapsible on mobile, always visible on desktop */}
      <div className={`${expanded ? 'block' : 'hidden'} lg:block border-t border-brand-border lg:border-t-0 p-4 lg:p-5 space-y-4`}>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-brand-sage">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-forest text-[10px] font-semibold text-white">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-brand-forest truncate">{item.name}</p>
                {item.variantTitle && <p className="text-body-xs text-brand-muted">{item.variantTitle}</p>}
              </div>
              <p className="text-body-sm font-semibold text-brand-forest shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Coupon — hidden on mobile (shown in the main form instead, above the payment picker) */}
        <div className="pt-1 hidden lg:block">
          <CouponInput items={items} token={token} applied={appliedCoupon} onApply={onApplyCoupon} onRemove={onRemoveCoupon} />
        </div>

        <div className="pt-3 space-y-1.5 border-t border-brand-border">
          <div className="flex justify-between text-body-sm">
            <span className="text-brand-muted">Subtotal</span>
            <span className="text-brand-forest">{formatPrice(subtotal)}</span>
          </div>
          {displayDiscount > 0 && (
            <div className="flex justify-between text-body-sm text-brand-teal">
              <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span>
              <span>-{formatPrice(displayDiscount)}</span>
            </div>
          )}
          {walletRedemption > 0 && (
            <div className="flex justify-between text-body-sm text-emerald-600">
              <span>Wallet Applied</span>
              <span>-{formatPrice(walletRedemption)}</span>
            </div>
          )}
          <div className="flex justify-between text-body-sm">
            <span className="text-brand-muted">Shipping</span>
            <span className="text-brand-forest">
              {preview ? (
                preview.shippingTotal > 0 ? formatPrice(preview.shippingTotal) : 'Free'
              ) : previewLoading ? (
                <Spinner size={14} />
              ) : (
                <span className="text-brand-muted">Calculated at review</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-brand-muted">Tax</span>
            <span className="text-brand-forest">
              {preview ? (
                formatPrice(preview.taxTotal)
              ) : previewLoading ? (
                <Spinner size={14} />
              ) : (
                <span className="text-brand-muted">Calculated at review</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-body-md font-semibold pt-2 border-t border-brand-border text-brand-forest">
            <span>Total</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
          {preview?.cashback.eligible && preview.cashback.totalCashback > 0 && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-xs text-emerald-800">
              You will earn <strong>{formatPrice(preview.cashback.totalCashback)}</strong> cashback after this order.
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-brand-border">
          {TRUST_BADGES.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-body-xs text-brand-muted">
              <Icon size={13} className="text-brand-teal shrink-0" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
