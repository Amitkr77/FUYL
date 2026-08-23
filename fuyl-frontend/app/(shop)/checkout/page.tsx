'use client'

import { useEffect, useRef, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper'
import { OrderSummary } from '@/components/checkout/OrderSummary'
import { PaymentMethodPicker } from '@/components/checkout/PaymentMethodPicker'
import { CouponInput, type AppliedCoupon } from '@/components/checkout/CouponInput'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { useCart } from '@/lib/hooks/useCart'
import { previewCheckout, placeOrder, getPaymentConfig, type CheckoutAddressInput, type CheckoutPaymentMethod, type CheckoutPreview, type PaymentConfig } from '@/lib/api/checkout'
import { getWalletBalance } from '@/lib/api/wallet'
import { getLoyaltyBalance, type LoyaltyBalance } from '@/lib/api/loyalty'
import { getAddresses, type Address } from '@/lib/api/customer'
import { checkEmailExists, checkoutIdentify } from '@/lib/api/account'
import { createPayment, verifyPayment } from '@/lib/api/payment'
import { getCashfree } from '@/lib/utils/cashfree'
import { lookupPincode } from '@/lib/utils/pincode'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getErrorMessage } from '@/lib/api/client'
import type { User } from '@/types/user'

type Step = 'address' | 'review' | 'paying' | 'error'
type AddressField = 'fullName' | 'phone' | 'line1' | 'city' | 'state' | 'pincode'

const STEP_LABELS = ['Details', 'Review', 'Payment']

const EMPTY_ADDRESS: CheckoutAddressInput = {
  fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'IN', type: 'home',
}

// Declaration order doubles as the on-screen field order (pincode sits
// before city/state so its autofill can populate them) — used by
// handleContinueToReview to focus the first invalid field top-to-bottom.
const FIELD_LABELS: Record<AddressField, string> = {
  fullName: 'Full name', phone: 'Phone number', line1: 'Address',
  pincode: 'Pincode', city: 'City', state: 'State',
}

function validateAddressField(key: AddressField, address: CheckoutAddressInput): string {
  switch (key) {
    case 'fullName':
      return address.fullName.trim() ? '' : 'Full name is required'
    case 'phone': {
      const digits = address.phone.replace(/\D/g, '')
      if (!digits) return 'Phone number is required'
      if (digits.length !== 10) return 'Enter a valid 10-digit phone number'
      return ''
    }
    case 'line1':
      return address.line1.trim() ? '' : 'Address is required'
    case 'city':
      return address.city.trim() ? '' : 'City is required'
    case 'state':
      return address.state.trim() ? '' : 'State is required'
    case 'pincode':
      if (!address.pincode.trim()) return 'Pincode is required'
      if (!/^\d{6}$/.test(address.pincode.trim())) return 'Enter a valid 6-digit pincode'
      return ''
  }
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
  useEffect(() => { startTransition(() => setAuthReady(true)) }, [])
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AddressField, string>>>({})
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('cashfree')
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ onlinePaymentEnabled: true, codEnabled: true })
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewRetry, setPreviewRetry] = useState(0)
  const [error, setError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [useWallet, setUseWallet] = useState(false)
  const [loyaltyBalance, setLoyaltyBalance] = useState<LoyaltyBalance | null>(null)
  const [useLoyalty, setUseLoyalty] = useState(false)

  // Guest checkout — resolves to a real account inline, without ever
  // sending the shopper to a separate login/register page (see
  // lib/api/account.ts's checkoutIdentify). Only relevant when !token.
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [identifying, setIdentifying] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const handleEmailBlur = async () => {
    setEmailError(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid email address' : '')
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

  // Pincode → city/state autofill (India Post lookup). Debounced so it only
  // fires once the shopper stops typing a plausible 6-digit code, and never
  // overwrites fields the shopper is actively editing mid-keystroke.
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'loading' | 'notfound'>('idle')
  useEffect(() => {
    if (!/^\d{6}$/.test(address.pincode)) { startTransition(() => setPincodeStatus('idle')); return }
    let cancelled = false
    startTransition(() => setPincodeStatus('loading'))
    const t = setTimeout(async () => {
      const result = await lookupPincode(address.pincode)
      if (cancelled) return
      if (result) {
        setAddress((a) => ({ ...a, city: result.city, state: result.state }))
        setFieldErrors((e) => ({ ...e, city: undefined, state: undefined }))
        setPincodeStatus('idle')
      } else {
        setPincodeStatus('notfound')
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [address.pincode])

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
    setFieldErrors({})
    setStep('address')
  }

  // Load saved addresses once and default to the account's default address
  // (or its first saved one) so a returning shopper isn't retyping it —
  // falls back to the blank manual-entry form on any failure or if there's
  // simply nothing saved yet.
  useEffect(() => {
    // A guest has no saved addresses to fetch — resolve immediately so the
    // manual-entry form shows right away instead of loading forever.
    if (!token) { startTransition(() => setAddressesLoading(false)); return }
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

  // Fetch payment method config once on mount
  useEffect(() => {
    getPaymentConfig().then((cfg) => {
      startTransition(() => {
        setPaymentConfig(cfg)
        // If current selection is no longer allowed, switch to the other method
        if (!cfg.onlinePaymentEnabled && !cfg.codEnabled) return
        setPaymentMethod((m) => {
          if (m === 'cashfree' && !cfg.onlinePaymentEnabled) return 'cod'
          if (m === 'cod' && !cfg.codEnabled) return 'cashfree'
          return m
        })
      })
    }).catch(() => {})
  }, [])

  // Fetch wallet balance once after auth resolves — reset when user logs out.
  useEffect(() => {
    if (!token) { startTransition(() => { setWalletBalance(null); setUseWallet(false) }); return }
    getWalletBalance(token)
      .then((w) => { if (!w.isFrozen && w.balance > 0) startTransition(() => setWalletBalance(w.balance)) })
      .catch(() => {})
  }, [token])

  // Fetch loyalty balance once after auth resolves — reset on logout.
  useEffect(() => {
    if (!token) { startTransition(() => { setLoyaltyBalance(null); setUseLoyalty(false) }); return }
    getLoyaltyBalance(token)
      .then((lb) => { if (lb.canRedeem && lb.balance > 0) startTransition(() => setLoyaltyBalance(lb)) })
      .catch(() => {})
  }, [token])

  // Nothing to check out — send back to cart, unless we just successfully
  // ordered (which empties the cart and would otherwise bounce this screen away
  // right as we're navigating to the success page).
  useEffect(() => {
    if (!items.length && !orderPlacedRef.current) router.replace('/cart')
  }, [items.length, router])

  // On every step transition: scroll to top so the new step's heading is
  // immediately visible (especially important on mobile where the form column
  // is below the order summary), then shift keyboard focus to the new section.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    if (!token || !addressComplete(address, token, email)) {
      startTransition(() => { setPreview(null); setPreviewLoading(false); setPreviewError('') })
      return
    }
    let cancelled = false
    startTransition(() => { setPreview(null); setPreviewLoading(true); setPreviewError('') })
    const walletAmount = useWallet ? (walletBalance ?? 0) : 0
    const loyaltyPoints = useLoyalty ? (loyaltyBalance?.balance ?? 0) : 0
    const t = setTimeout(async () => {
      try {
        const result = await previewCheckout(token, {
          shippingAddress: address,
          paymentMethod,
          couponCode: appliedCoupon?.code,
          walletRedemptionAmount: walletAmount > 0 ? walletAmount : undefined,
          loyaltyPointsToRedeem: loyaltyPoints > 0 ? loyaltyPoints : undefined,
        })
        if (!cancelled) setPreview(result)
      } catch (err) {
        if (!cancelled) setPreviewError(getErrorMessage(err, 'Could not calculate your final total. Please try again.'))
        // Keep the last good preview showing — a transient failure here
        // isn't worth interrupting typing over; the authoritative check
        // happens again at Place Order.
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, address, paymentMethod, appliedCoupon?.code, previewRetry, useWallet, walletBalance, useLoyalty, loyaltyBalance])

  const set = (k: keyof CheckoutAddressInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((a) => ({ ...a, [k]: e.target.value }))
    if (k in FIELD_LABELS) setFieldErrors((errs) => ({ ...errs, [k]: undefined }))
  }
  const setDigitsOnly = (k: 'phone' | 'pincode', maxLen: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLen)
    setAddress((a) => ({ ...a, [k]: digits }))
    setFieldErrors((errs) => ({ ...errs, [k]: undefined }))
  }
  const blurField = (k: AddressField) => () =>
    setFieldErrors((errs) => ({ ...errs, [k]: validateAddressField(k, address) }))

  const focusFirstError = (keys: string[]) => {
    const first = keys.find(Boolean)
    if (first) document.getElementById(`field-${first}`)?.focus()
  }

  const handleContinueToReview = async () => {
    setError('')

    // Validate everything up front and surface exactly what's wrong, rather
    // than leaving the shopper to guess why a Continue button won't respond.
    const addrErrors: Partial<Record<AddressField, string>> = {}
    ;(Object.keys(FIELD_LABELS) as AddressField[]).forEach((k) => {
      const msg = validateAddressField(k, address)
      if (msg) addrErrors[k] = msg
    })
    setFieldErrors(addrErrors)

    let guestEmailError = ''
    let guestPasswordError = ''
    if (!token) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) guestEmailError = 'Enter a valid email address'
      if (needsPassword && !password) guestPasswordError = 'Enter your password'
    }
    setEmailError(guestEmailError)
    setPasswordError(guestPasswordError)

    const invalidKeys = [
      guestEmailError && 'email',
      guestPasswordError && 'password',
      ...Object.keys(addrErrors),
    ].filter(Boolean) as string[]
    if (invalidKeys.length > 0) {
      // A saved address can still be missing a field (e.g. no phone on file).
      // The manual form — and its "field-*" ids — only renders once we're in
      // "new"/edit mode, so switch into it first or focusFirstError has
      // nothing in the DOM to focus and the click silently does nothing.
      if (selectedAddressId !== 'new') {
        setSelectedAddressId('new')
        setTimeout(() => focusFirstError(invalidKeys), 0)
      } else {
        focusFirstError(invalidKeys)
      }
      return
    }

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
      if (!token) {
        setError('Your session expired. Please sign in again before paying for this order.')
        setStep('error')
        return
      }
      const orderFullyCovered = preview !== null && preview.remainingToPay === 0
      const walletCoversAll = useWallet && orderFullyCovered
      // When loyalty alone (no wallet) covers the full order, no gateway is needed.
      // Use 'cod' so the backend marks it complete without attempting a charge.
      const loyaltyCoversAll = useLoyalty && !useWallet && orderFullyCovered
      const method = walletCoversAll ? 'wallet' : loyaltyCoversAll ? 'loyalty' : paymentMethod
      const payment = await createPayment(token, order.orderId, method)

      if (payment.method === 'cod' || payment.method === 'wallet' || payment.method === 'loyalty') {
        await useCartStore.getState().syncCart()
        router.push(`/checkout/success?orderId=${order.orderId}`)
        return
      }

      // Cashfree — open the SDK checkout (modal, stays on-page). It resolves
      // when the modal closes for any reason (paid, failed, dismissed), so we
      // ALWAYS confirm server-side afterward rather than trusting the client
      // result. The webhook is the ultimate backstop if this never runs.
      setStep('paying')
      const cashfree = await getCashfree(payment.mode)
      await cashfree.checkout({
        paymentSessionId: payment.paymentSessionId,
        redirectTarget:   '_modal',
      })

      try {
        await verifyPayment(token, { cfOrderId: payment.cfOrderId })
        await useCartStore.getState().syncCart()
        router.push(`/checkout/success?orderId=${order.orderId}`)
      } catch {
        setError(
          `Payment was not completed. Order ${order.orderNumber} is saved — you can retry payment below. ` +
          `If you were charged, it will be confirmed automatically or you can contact support.`
        )
        setStep('error')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start payment for this order.'))
      setStep('error')
    }
  }

  const [confirming, setConfirming] = useState(false)
  const confirmingRef = useRef(false)

  const handleConfirm = async () => {
    if (confirmingRef.current || !preview || previewLoading) return
    if (!token) {
      setError('Your session expired. Please sign in again before placing the order.')
      setStep('error')
      return
    }
    confirmingRef.current = true
    setError('')
    setConfirming(true)
    try {
      const walletAmount = useWallet ? (walletBalance ?? 0) : 0
      const loyaltyPoints = useLoyalty ? (loyaltyBalance?.balance ?? 0) : 0
      const orderFullyCovered = preview.remainingToPay === 0
      const walletCoversAll = useWallet && orderFullyCovered
      const loyaltyCoversAll = useLoyalty && !useWallet && orderFullyCovered
      const method = walletCoversAll ? 'wallet' : loyaltyCoversAll ? 'loyalty' : paymentMethod
      const order = await placeOrder(token, {
        shippingAddress: address,
        paymentMethod: method,
        couponCode: appliedCoupon?.code,
        walletRedemptionAmount: walletAmount > 0 ? walletAmount : undefined,
        loyaltyPointsToRedeem: loyaltyPoints > 0 ? loyaltyPoints : undefined,
      })
      orderPlacedRef.current = true
      setPlacedOrder(order)
      await attemptPayment(order)
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong placing your order.'))
      setStep('error')
    } finally {
      confirmingRef.current = false
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
  const displayTotal = preview?.remainingToPay ?? preview?.grandTotal ?? Math.max(0, subtotal - displayDiscount)
  const showManualForm = !addressesLoading && (savedAddresses.length === 0 || selectedAddressId === 'new')

  return (
    <div className="container-brand section-py">
      <h1 className="text-display-xl font-display mb-6">CHECKOUT</h1>

      <CheckoutStepper
        steps={STEP_LABELS}
        currentIndex={stepIndex}
        onStepClick={(i) => { if (i === 0) setStep('address') }}
      />

      {/* Mobile: order summary (collapsed accordion) shows first.
          Desktop: form on the left, summary as a sticky right sidebar. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 items-start pb-28 lg:pb-0">
        <div className="order-2 lg:order-1 min-w-0">
          {error && (
            <p className="text-body-xs p-3 rounded-lg mb-4 bg-red-50 text-red-700">{error}</p>
          )}

          {step === 'address' && (
            <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none">
              {authReady && !token && (
                <div className="space-y-4 mb-8">
                  <h2 className="text-display-md font-display">Contact</h2>
                  <Field
                    id="email"
                    label="Email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); setNeedsPassword(false); setPassword('') }}
                    onBlur={handleEmailBlur}
                    type="email"
                    loading={checkingEmail}
                    error={emailError}
                    autoFocus
                  />
                  {needsPassword && (
                    <>
                      <Field
                        id="password"
                        label="Password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
                        type="password"
                        error={passwordError}
                        autoFocus
                      />
                      <p className="text-body-xs text-brand-muted">
                        Looks like you already have an account with this email — enter your password to continue.
                      </p>
                    </>
                  )}
                  {!needsPassword && email && !emailError && (
                    <p className="text-body-xs text-brand-muted">
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
                        className="flex items-start gap-3 p-4 border rounded-sm cursor-pointer text-body-sm bg-white border-brand-border has-checked:border-brand-teal has-checked:bg-brand-sage/20 transition-colors"
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
                      onClick={() => { setSelectedAddressId('new'); setAddress(EMPTY_ADDRESS); setFieldErrors({}) }}
                      className="text-body-sm font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                    >
                      + Add a new address
                    </button>
                  </div>
                )}

                {showManualForm && (
                  <>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => selectSavedAddress(savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0])}
                        className="text-body-sm font-semibold text-brand-teal hover:text-brand-forest transition-colors"
                      >
                        Use a saved address instead
                      </button>
                    )}
                    {/* Address type — Home / Work / Other */}
                    <div className="flex gap-2">
                      {(['home', 'office', 'other'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAddress((a) => ({ ...a, type: t }))}
                          className={`px-3 py-1.5 text-body-xs font-semibold rounded-full border transition-colors capitalize ${
                            address.type === t
                              ? 'bg-brand-forest text-white border-brand-forest'
                              : 'border-brand-border text-brand-muted hover:border-brand-forest hover:text-brand-forest'
                          }`}
                        >
                          {t === 'office' ? 'Work' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <Field
                      id="fullName"
                      label="Full Name"
                      value={address.fullName}
                      onChange={set('fullName')}
                      onBlur={blurField('fullName')}
                      error={fieldErrors.fullName}
                      autoFocus={Boolean(token)}
                    />
                    <Field
                      id="phone"
                      label="Phone"
                      value={address.phone}
                      onChange={setDigitsOnly('phone', 10)}
                      onBlur={blurField('phone')}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      error={fieldErrors.phone}
                    />
                    <Field
                      id="line1"
                      label="Address Line 1"
                      value={address.line1}
                      onChange={set('line1')}
                      onBlur={blurField('line1')}
                      error={fieldErrors.line1}
                    />
                    <Field
                      label="Address Line 2 (optional)"
                      value={address.line2 ?? ''}
                      onChange={set('line2')}
                    />
                    <Field
                      id="pincode"
                      label="Pincode"
                      value={address.pincode}
                      onChange={setDigitsOnly('pincode', 6)}
                      onBlur={blurField('pincode')}
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      loading={pincodeStatus === 'loading'}
                      error={fieldErrors.pincode}
                      hint={pincodeStatus === 'notfound' ? "Couldn't find this pincode — enter city/state manually below." : undefined}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Field id="city" label="City" value={address.city} onChange={set('city')} onBlur={blurField('city')} error={fieldErrors.city} />
                      <Field id="state" label="State" value={address.state} onChange={set('state')} onBlur={blurField('state')} error={fieldErrors.state} />
                    </div>
                  </>
                )}
              </div>

              {/* Coupon — shown inline on mobile since the order summary is collapsed.
                  Desktop users see it in the always-visible sidebar instead. */}
              <div className="mb-8 lg:hidden">
                <CouponInput
                  items={items}
                  token={token ?? undefined}
                  applied={appliedCoupon}
                  onApply={setAppliedCoupon}
                  onRemove={() => setAppliedCoupon(null)}
                />
              </div>

              <div className="space-y-3 mb-8">
                <h2 className="text-display-md font-display">Payment Method</h2>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  enabledMethods={new Set([
                    ...(paymentConfig.onlinePaymentEnabled ? ['cashfree' as const] : []),
                    ...(paymentConfig.codEnabled ? ['cod' as const] : []),
                  ])}
                />
              </div>

              {token && walletBalance !== null && walletBalance > 0 && (
                <div className="space-y-3 mb-8">
                  <h2 className="text-display-md font-display">Wallet</h2>
                  <label className="flex items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer transition-colors border-brand-border has-checked:border-brand-teal has-checked:bg-brand-sage/20">
                    <div>
                      <p className="text-body-sm font-semibold text-brand-forest">Use wallet balance</p>
                      <p className="text-body-xs text-brand-muted">{formatPrice(walletBalance)} available</p>
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                    />
                    <div
                      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors pointer-events-none ${useWallet ? 'bg-brand-teal' : 'bg-brand-border'}`}
                      aria-hidden="true"
                    >
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${useWallet ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                  {useWallet && preview && (
                    <p className="text-body-xs text-brand-muted px-1">
                      {formatPrice(preview.walletRedemption)} will be deducted from your wallet.
                      {preview.remainingToPay > 0
                        ? ` Pay ${formatPrice(preview.remainingToPay)} via ${paymentMethod === 'cashfree' ? 'card / UPI' : 'cash on delivery'}.`
                        : ' Your wallet covers this order fully — no additional payment needed.'}
                    </p>
                  )}
                </div>
              )}

              {token && loyaltyBalance !== null && loyaltyBalance.canRedeem && (
                <div className="space-y-3 mb-8">
                  <h2 className="text-display-md font-display">Loyalty Points</h2>
                  <label className="flex items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer transition-colors border-brand-border has-checked:border-brand-teal has-checked:bg-brand-sage/20">
                    <div>
                      <p className="text-body-sm font-semibold text-brand-forest">Redeem loyalty points</p>
                      <p className="text-body-xs text-brand-muted">
                        {loyaltyBalance.balance} pts · worth {formatPrice(loyaltyBalance.redeemableValue)}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={useLoyalty}
                      onChange={(e) => setUseLoyalty(e.target.checked)}
                    />
                    <div
                      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors pointer-events-none ${useLoyalty ? 'bg-brand-teal' : 'bg-brand-border'}`}
                      aria-hidden="true"
                    >
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${useLoyalty ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                  {useLoyalty && preview && preview.loyaltyPointsToRedeem > 0 && (
                    <p className="text-body-xs text-brand-muted px-1">
                      {preview.loyaltyPointsToRedeem} pts ({formatPrice(preview.loyaltyRedemption)}) will be applied to this order.
                      {preview.remainingToPay > 0
                        ? ` Pay ${formatPrice(preview.remainingToPay)} via ${paymentMethod === 'cashfree' ? 'card / UPI' : 'cash on delivery'}.`
                        : ' Your points cover this order fully — no additional payment needed.'}
                    </p>
                  )}
                </div>
              )}

              <StickyActionBar>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={identifying}
                  disabled={identifying}
                  onClick={handleContinueToReview}
                >
                  Continue to Review
                </Button>
              </StickyActionBar>
            </div>
          )}

          {step === 'review' && (
            <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none space-y-4">
              {/* Items — visible in this column on mobile where the sidebar is collapsed */}
              <div className="lg:hidden p-4 border rounded-sm border-brand-border space-y-3">
                <h3 className="text-body-sm font-semibold text-brand-forest">
                  Your Items ({items.reduce((s, i) => s + i.quantity, 0)})
                </h3>
                <div className="space-y-3 max-h-52 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 shrink-0 rounded-sm overflow-hidden bg-brand-sage">
                        {item.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        )}
                        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-brand-forest text-[9px] font-bold text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-xs font-medium text-brand-forest truncate">{item.name}</p>
                        {item.variantTitle && <p className="text-body-xs text-brand-muted">{item.variantTitle}</p>}
                      </div>
                      <p className="text-body-xs font-semibold text-brand-forest shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border rounded-sm space-y-1.5 border-brand-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-body-sm font-semibold text-brand-forest">Shipping to</h3>
                  <button type="button" onClick={() => setStep('address')} className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors">
                    Edit
                  </button>
                </div>
                <p className="text-body-sm text-brand-muted">{address.fullName} · {address.phone}</p>
                <p className="text-body-sm text-brand-muted">
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pincode}
                </p>
              </div>

              <div className="p-4 border rounded-sm space-y-1.5 border-brand-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-body-sm font-semibold text-brand-forest">Payment Method</h3>
                  <button type="button" onClick={() => setStep('address')} className="text-body-xs font-semibold text-brand-teal hover:text-brand-forest transition-colors">
                    Edit
                  </button>
                </div>
                <p className="text-body-sm text-brand-muted">
                  {paymentMethod === 'cashfree' ? 'Card / UPI / Netbanking / Wallet' : 'Cash on Delivery'}
                </p>
              </div>

              <StickyActionBar>
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
                {previewLoading && !confirming && (
                  <p className="text-body-xs text-brand-muted text-center mt-1.5 flex items-center justify-center gap-1">
                    <Spinner size={12} /> Calculating exact total…
                  </p>
                )}
                {previewError && !confirming && (
                  <div className="text-center mt-2" role="alert">
                    <p className="text-body-xs text-red-600">{previewError}</p>
                    <button type="button" onClick={() => setPreviewRetry((value) => value + 1)} className="mt-1 text-body-xs font-semibold text-brand-teal hover:text-brand-forest">Retry calculation</button>
                  </div>
                )}
              </StickyActionBar>
            </div>
          )}

          {step === 'paying' && (
            <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none">
              <div className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-sage/60 flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-brand-teal" />
                </div>
                <div>
                  <p className="text-body-md font-semibold text-brand-forest mb-1">Processing payment…</p>
                  {placedOrder && (
                    <p className="text-body-xs text-brand-muted">Order {placedOrder.orderNumber}</p>
                  )}
                </div>
                <p className="text-body-xs text-brand-muted max-w-xs">
                  Please don&apos;t close or refresh this page. We&apos;re confirming your payment.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div ref={stepContentRef} tabIndex={-1} className="animate-fade-in outline-none space-y-4">
              {placedOrder && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-body-xs font-semibold text-amber-800 mb-0.5">
                    Order {placedOrder.orderNumber} has been saved
                  </p>
                  <p className="text-body-xs text-amber-700">
                    Your order is secure. You can retry payment below — if you were charged,
                    it will be confirmed automatically within a few minutes.
                  </p>
                </div>
              )}
              <StickyActionBar>
                <Button variant="primary" size="lg" fullWidth onClick={handleRetry}>
                  {placedOrder ? 'Retry Payment' : 'Try Again'}
                </Button>
                {placedOrder && (
                  <p className="text-body-xs text-brand-muted text-center mt-1.5">
                    Need help? Contact support with order ID:{' '}
                    <span className="font-semibold text-brand-forest">{placedOrder.orderNumber}</span>
                  </p>
                )}
              </StickyActionBar>
            </div>
          )}
        </div>

        {/* Order summary — sticky sidebar on desktop, collapsible on mobile.
            Auto-expand on the Review step so shoppers can verify items before placing. */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <OrderSummary
            items={items}
            // Once the server preview exists it is the locked source of truth.
            // The live cart is converted/cleared during payment processing and
            // must not make the visible order subtotal jump to ₹0.
            subtotal={preview?.subtotal ?? subtotal}
            token={token ?? undefined}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={setAppliedCoupon}
            onRemoveCoupon={() => setAppliedCoupon(null)}
            preview={preview}
            previewLoading={previewLoading}
            displayDiscount={displayDiscount}
            displayTotal={displayTotal}
            walletRedemption={preview?.walletRedemption ?? 0}
            loyaltyRedemption={preview?.loyaltyRedemption ?? 0}
            defaultExpanded={step === 'review'}
          />
        </div>
      </div>
    </div>
  )
}

function addressComplete(address: CheckoutAddressInput, token: string | null, email: string): boolean {
  return Boolean(
    address.fullName && address.phone && address.line1 && address.city && address.state && address.pincode &&
    (token || email)
  )
}

// Pins its children (the step's primary action button) to the bottom of the
// viewport on mobile, so the CTA is always reachable without scrolling —
// reverts to a normal inline position once there's room on larger screens.
function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm border-t border-brand-border p-4 lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:p-0">
      {children}
    </div>
  )
}

function Field({ id, label, value, onChange, onBlur, type = 'text', inputMode, maxLength, loading, error, hint, autoFocus }: {
  id?: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
  loading?: boolean
  error?: string
  hint?: string
  autoFocus?: boolean
}) {
  const fieldId = id ? `field-${id}` : undefined
  return (
    <div>
      <label htmlFor={fieldId} className="block text-label mb-1.5 text-brand-muted">{label}</label>
      <div className="relative">
        <input
          id={fieldId}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          className={`w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors focus:border-brand-berry ${
            error ? 'border-red-400' : 'border-brand-border'
          }`}
          style={{ paddingRight: loading !== undefined ? '2.25rem' : undefined }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted">
            <Spinner size={16} />
          </span>
        )}
      </div>
      {error ? (
        <p className="text-body-xs mt-1 text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-body-xs mt-1 text-brand-muted">{hint}</p>
      ) : null}
    </div>
  )
}
