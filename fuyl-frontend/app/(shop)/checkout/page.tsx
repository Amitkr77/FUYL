'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper'
import { CouponInput, type AppliedCoupon } from '@/components/checkout/CouponInput'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { useCart } from '@/lib/hooks/useCart'
import { previewCheckout, placeOrder, type CheckoutAddressInput, type CheckoutPaymentMethod, type CheckoutPreview } from '@/lib/api/checkout'
import { getAddresses, type Address } from '@/lib/api/customer'
import { checkEmailExists, checkoutIdentify } from '@/lib/api/account'
import { createPayment, verifyPayment } from '@/lib/api/payment'
import { openRazorpayCheckout } from '@/lib/utils/razorpay'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getErrorMessage } from '@/lib/api/client'
import type { User } from '@/types/user'

type Step = 'address' | 'review' | 'paying' | 'error'

const STEP_LABELS = ['Details', 'Review', 'Payment']

const EMPTY_ADDRESS: CheckoutAddressInput = {
  fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'IN', type: 'home',
}

// Saved addresses (lib/api/customer.ts's Address) have no name field of their
// own — checkout's shippingAddress requires one, so it comes from the
// account's own first/last name. Saved addresses also don't require a
// phone (account/addresses lets you skip it) but checkout does, so fall
// back to the account's phone when the address itself doesn't have one.
function toCheckoutAddress(a: Address, user: User | null): CheckoutAddressInput {
  const label = a.label.trim().toLowerCase()
  const type: CheckoutAddressInput['type'] = label === 'home' ? 'home' : label === 'work' || label === 'office' ? 'office' : 'other'
  return {
    fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    phone:    a.phone || user?.phone || '',
    line1:    a.line1,
    line2:    a.line2,
    city:     a.city,
    state:    a.state,
    pincode:  a.postalCode,
    country:  a.country || 'IN',
    type,
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { token, user } = useAuthStore()
  // Zustand's persist middleware rehydrates the auth store from localStorage
  // asynchronously right after the first client render, so `token` reads as
  // null for a brief moment even for an already-logged-in shopper — without
  // this guard, that split second showed the guest "Contact" (email/
  // password) section to logged-in users before it flipped to the real form.
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => { setAuthReady(true) }, [])
  // BUG FIXED (found live — reported as "subtotal shows ₹0 until Review
  // Order"): this page used to read `subtotal`/`itemCount` straight off
  // useCartStore(), which are defined as getters on the store's initial
  // state object. Zustand's set() shallow-merges by spreading the current
  // state — spreading an object with a getter copies its *current computed
  // value* as a plain property, not the accessor. So the very first set()
  // call anywhere in the store's life (e.g. ensureGuestId's set({guestId}),
  // which fires before any items ever load) permanently freezes subtotal/
  // itemCount at whatever they were at that instant — 0. useCart() recomputes
  // both fresh from store.items on every render instead, which is why
  // CartDrawer (which already used useCart()) never showed this bug.
  const { items, subtotal } = useCart()

  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState<CheckoutAddressInput>(EMPTY_ADDRESS)
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('razorpay')
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  // Guest checkout — resolves to a real account inline, without ever
  // sending the shopper to a separate login/register page (see
  // lib/api/account.ts's checkoutIdentify). Only relevant when !token.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const handleEmailBlur = async () => {
    if (token || !email || !email.includes('@')) return
    setCheckingEmail(true)
    try {
      const exists = await checkEmailExists(email)
      setNeedsPassword(exists)
    } catch {
      // Non-fatal — worst case the password prompt only appears after
      // Continue is clicked instead of proactively on blur.
    } finally {
      setCheckingEmail(false)
    }
  }

  // Set once placeOrder() succeeds — lets a payment-step retry re-attempt
  // payment for the same order instead of placing a second one.
  const [placedOrder, setPlacedOrder] = useState<{ orderId: string; orderNumber: string } | null>(null)
  // When checkoutIdentify() resolves a returning customer mid-checkout,
  // `token` changes and would otherwise re-trigger the saved-address
  // auto-select below — silently discarding the address they just typed and
  // bouncing them back a step. Set right before setSession() so that effect
  // can tell "just authenticated via checkout" apart from "a real logged-in
  // user loaded this page normally".
  const skipAutoSelectRef = useRef(false)
  // Plain ref (not state) so the empty-cart guard below sees it synchronously
  // the instant an order is placed, before syncCart's own re-render can race it.
  const orderPlacedRef = useRef(false)
  // Focus moves to the new step's content on advance, for keyboard/screen-
  // reader users — a real step transition, not just a visual one.
  const stepContentRef = useRef<HTMLDivElement>(null)

  // Saved addresses — 'new' means the manual-entry form is showing (either
  // because the account has no saved addresses, or the shopper chose to add
  // one). A real id means that saved address is selected and filling `address`.
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')
  const [addressesLoading, setAddressesLoading] = useState(true)

  const selectSavedAddress = (a: Address) => {
    setSelectedAddressId(a.id)
    setAddress(toCheckoutAddress(a, user))
    setStep('address')
  }

  // Load saved addresses once and default to the account's default address
  // (or its first saved one) so a returning shopper isn't retyping it —
  // falls back to the blank manual-entry form on any failure or if there's
  // simply nothing saved yet.
  useEffect(() => {
    // A guest has no saved addresses to fetch — resolve immediately so the
    // manual-entry form shows right away instead of loading forever.
    if (!token) { setAddressesLoading(false); return }
    let cancelled = false
    getAddresses(token)
      .then((addrs) => {
        if (cancelled) return
        setSavedAddresses(addrs)
        if (skipAutoSelectRef.current) { skipAutoSelectRef.current = false; return }
        const preferred = addrs.find((a) => a.isDefault) ?? addrs[0]
        if (preferred) selectSavedAddress(preferred)
      })
      .catch(() => { /* no saved addresses available — manual entry still works */ })
      .finally(() => { if (!cancelled) setAddressesLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Nothing to check out — send back to cart, unless we just successfully
  // ordered (which empties the cart and would otherwise bounce this screen away
  // right as we're navigating to the success page).
  useEffect(() => {
    if (!items.length && !orderPlacedRef.current) router.replace('/cart')
  }, [items.length, router])

  // Focus the new step's content on every transition — makes the multi-step
  // flow legible to keyboard/screen-reader users, not just visually obvious.
  useEffect(() => {
    stepContentRef.current?.focus()
  }, [step])

  // Reactive pricing — recomputes automatically whenever the address becomes
  // complete, the payment method changes, or a coupon is applied/removed, so
  // by the time the shopper reaches Review the total is already settled
  // instead of being computed on click. Requires a resolved identity (the
  // backend's preview endpoint is authenticated) — for a not-yet-identified
  // guest, the summary below shows an honest client-computed estimate until
  // Continue resolves one; silently creating an account in the background
  // just because a debounce timer fired would be the wrong tradeoff.
  useEffect(() => {
    if (!token || !addressComplete(address, token, email)) return
    let cancelled = false
    setPreviewLoading(true)
    const t = setTimeout(async () => {
      try {
        const result = await previewCheckout(token, {
          shippingAddress: address,
          paymentMethod,
          couponCode: appliedCoupon?.code,
        })
        if (!cancelled) setPreview(result)
      } catch {
        // Keep the last good preview showing — a transient failure here
        // isn't worth interrupting typing over; the authoritative check
        // happens again at Place Order.
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, address, paymentMethod, appliedCoupon?.code])

  const set = (k: keyof CheckoutAddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }))

  const isAddressComplete = addressComplete(address, token, email)

  const handleContinueToReview = async () => {
    setError('')
    if (!token) {
      setIdentifying(true)
      try {
        const guestId = useCartStore.getState().guestId ?? undefined
        const result = await checkoutIdentify({
          email,
          password: needsPassword ? password : undefined,
          fullName: address.fullName,
          phone: address.phone,
          guestId,
        })
        if (result.status === 'needs_password') {
          setNeedsPassword(true)
          setError('This email already has an account — enter your password to continue.')
          return
        }
        skipAutoSelectRef.current = true
        useAuthStore.getState().setSession(result.accessToken, result.user)
        await useCartStore.getState().syncCart()
      } catch (err) {
        setError(getErrorMessage(err, 'Could not verify your details. Please check them and try again.'))
        return
      } finally {
        setIdentifying(false)
      }
    }
    setStep('review')
  }

  // Attempts payment for an already-placed order. Safe to call again on
  // retry — never creates a new order.
  const attemptPayment = async (order: { orderId: string; orderNumber: string }) => {
    try {
      const payment = await createPayment(token!, order.orderId, paymentMethod)

      if (payment.method === 'cod') {
        await useCartStore.getState().syncCart()
        router.push(`/checkout/success?orderId=${order.orderId}`)
        return
      }

      setStep('paying')
      openRazorpayCheckout({
        key:      payment.keyId,
        amount:   payment.amount,
        currency: payment.currency,
        orderId:  payment.orderId,
        name:     'FUYL',
        description: `Order ${order.orderNumber}`,
        prefill:  { name: address.fullName, email: user?.email, contact: address.phone },
        onSuccess: async (response) => {
          try {
            await verifyPayment(token!, {
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            await useCartStore.getState().syncCart()
            router.push(`/checkout/success?orderId=${order.orderId}`)
          } catch (err) {
            setError(
              (getErrorMessage(err, 'Payment verification failed.')) +
              ` Your order ${order.orderNumber} is saved — contact support if you were charged.`
            )
            setStep('error')
          }
        },
        onDismiss: () => {
          setError(`Payment was not completed. Order ${order.orderNumber} is saved — you can retry payment below.`)
          setStep('error')
        },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start payment for this order.'))
      setStep('error')
    }
  }

  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setError('')
    setConfirming(true)
    try {
      const order = await placeOrder(token!, { shippingAddress: address, paymentMethod, couponCode: appliedCoupon?.code })
      orderPlacedRef.current = true
      setPlacedOrder(order)
      await attemptPayment(order)
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong placing your order.'))
      setStep('error')
    } finally {
      setConfirming(false)
    }
  }

  const handleRetry = () => {
    setError('')
    if (placedOrder) {
      attemptPayment(placedOrder)
    } else {
      handleConfirm()
    }
  }

  const stepIndex = step === 'address' ? 0 : step === 'review' ? 1 : 2
  const displayDiscount = preview?.discountTotal ?? appliedCoupon?.discountAmount ?? 0
  const displayTotal = preview?.grandTotal ?? Math.max(0, subtotal - displayDiscount)

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1 className="text-display-xl font-display mb-6">CHECKOUT</h1>

      <CheckoutStepper
        steps={STEP_LABELS}
        currentIndex={stepIndex}
        onStepClick={(i) => { if (i === 0) setStep('address') }}
      />

      {/* Order summary — stays visible across every step, not just one */}
      <div className="space-y-3 mb-8 p-5 rounded-sm border" style={{ borderColor: 'var(--color-brand-border)' }}>
        <h2 className="text-display-md font-display">Order Summary</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-body-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
          <CouponInput
            items={items}
            token={token ?? undefined}
            applied={appliedCoupon}
            onApply={setAppliedCoupon}
            onRemove={() => setAppliedCoupon(null)}
          />
        </div>

        <div className="pt-3 space-y-1.5 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
          <div className="flex justify-between text-body-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {displayDiscount > 0 && (
            <div className="flex justify-between text-body-sm" style={{ color: 'var(--color-brand-teal)' }}>
              <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span>
              <span>-{formatPrice(displayDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-body-sm">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span>Tax</span>
            <span>
              {preview ? (
                formatPrice(preview.taxTotal)
              ) : previewLoading ? (
                <Spinner size={14} />
              ) : (
                <span style={{ color: 'var(--color-brand-muted)' }}>Calculated at review</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-body-sm font-semibold pt-2 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
            <span>Total</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-body-xs p-3 rounded-sm mb-4" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {step === 'address' && (
        <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none">
          {authReady && !token && (
            <div className="space-y-4 mb-8">
              <h2 className="text-display-md font-display">Contact</h2>
              <Field
                label="Email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setNeedsPassword(false); setPassword('') }}
                onBlur={handleEmailBlur}
                type="email"
                loading={checkingEmail}
              />
              {needsPassword && (
                <>
                  <Field label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                  <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                    Looks like you already have an account with this email — enter your password to continue.
                  </p>
                </>
              )}
              {!needsPassword && email && (
                <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                  We&apos;ll set up your account automatically — no separate sign-up needed.
                </p>
              )}
            </div>
          )}

          <div className="space-y-4 mb-8">
            <h2 className="text-display-md font-display">Shipping Address</h2>

            {addressesLoading && (
              <div className="space-y-3" aria-busy="true" aria-label="Loading saved addresses">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-sm border-brand-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                    <Skeleton className="h-3 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            )}

            {!addressesLoading && savedAddresses.length > 0 && selectedAddressId !== 'new' && (
              <div className="space-y-3 animate-fade-in">
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-start gap-3 p-4 border rounded-sm cursor-pointer text-body-sm bg-white border-brand-border has-checked:border-brand-teal transition-colors"
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      className="mt-1 accent-brand-teal"
                      checked={selectedAddressId === a.id}
                      onChange={() => selectSavedAddress(a)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-brand-forest">
                        {a.label}
                        {a.isDefault && <Badge variant="muted">Default</Badge>}
                      </div>
                      <p className="text-brand-muted mt-0.5">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                      </p>
                      {(a.phone || user?.phone) && (
                        <p className="text-brand-muted">{a.phone || user?.phone}</p>
                      )}
                    </div>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => { setSelectedAddressId('new'); setAddress(EMPTY_ADDRESS) }}
                  className="text-body-sm font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                >
                  + Add a new address
                </button>
              </div>
            )}

            {!addressesLoading && (savedAddresses.length === 0 || selectedAddressId === 'new') && (
              <>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => selectSavedAddress(savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0])}
                    className="text-body-sm font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                  >
                    ← Use a saved address
                  </button>
                )}
                <Field label="Full Name" value={address.fullName} onChange={set('fullName')} />
                <Field label="Phone" value={address.phone} onChange={set('phone')} type="tel" />
                <Field label="Address Line 1" value={address.line1} onChange={set('line1')} />
                <Field label="Address Line 2 (optional)" value={address.line2 ?? ''} onChange={set('line2')} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" value={address.city} onChange={set('city')} />
                  <Field label="State" value={address.state} onChange={set('state')} />
                </div>
                <Field label="Pincode" value={address.pincode} onChange={set('pincode')} />
              </>
            )}
          </div>

          <div className="space-y-3 mb-8">
            <h2 className="text-display-md font-display">Payment Method</h2>
            {(['razorpay', 'cod'] as CheckoutPaymentMethod[]).map((m) => (
              <label
                key={m}
                className="flex items-center gap-3 p-3 border rounded-sm cursor-pointer text-body-sm"
                style={{ borderColor: paymentMethod === m ? 'var(--color-brand-berry)' : 'var(--color-brand-border)' }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                />
                {m === 'razorpay' ? 'Card / UPI / Netbanking (Razorpay)' : 'Cash on Delivery'}
              </label>
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={identifying}
            disabled={!isAddressComplete || (needsPassword && !password)}
            onClick={handleContinueToReview}
          >
            Continue to Review
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none space-y-4">
          <div className="p-4 border rounded-sm space-y-1.5" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-semibold text-brand-forest">Shipping to</h3>
              <button type="button" onClick={() => setStep('address')} className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors">
                Edit
              </button>
            </div>
            <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>{address.fullName} · {address.phone}</p>
            <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>
              {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pincode}
            </p>
          </div>

          <div className="p-4 border rounded-sm space-y-1.5" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-semibold text-brand-forest">Payment Method</h3>
              <button type="button" onClick={() => setStep('address')} className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors">
                Edit
              </button>
            </div>
            <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>
              {paymentMethod === 'razorpay' ? 'Card / UPI / Netbanking (Razorpay)' : 'Cash on Delivery'}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={confirming}
            disabled={confirming || previewLoading || !preview}
            onClick={handleConfirm}
          >
            Place Order — {formatPrice(displayTotal)}
          </Button>
        </div>
      )}

      {step === 'paying' && (
        <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none">
          <Button variant="primary" size="lg" fullWidth loading disabled>
            Waiting for payment…
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none">
          <Button variant="primary" size="lg" fullWidth onClick={handleRetry}>
            {placedOrder ? 'Retry Payment' : 'Try Again'}
          </Button>
        </div>
      )}
    </div>
  )
}

function addressComplete(address: CheckoutAddressInput, token: string | null, email: string): boolean {
  return Boolean(
    address.fullName && address.phone && address.line1 && address.city && address.state && address.pincode &&
    (token || email)
  )
}

function Field({ label, value, onChange, onBlur, type = 'text', loading }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  type?: string
  loading?: boolean
}) {
  return (
    <div>
      <label className="block text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors"
          style={{ borderColor: 'var(--color-brand-border)', paddingRight: loading !== undefined ? '2.25rem' : undefined }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-brand-berry)'}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--color-brand-border)'; onBlur?.() }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted">
            <Spinner size={16} />
          </span>
        )}
      </div>
    </div>
  )
}
