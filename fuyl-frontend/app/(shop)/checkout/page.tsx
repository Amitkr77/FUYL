'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { previewCheckout, placeOrder, type CheckoutAddressInput, type CheckoutPaymentMethod, type CheckoutPreview } from '@/lib/api/checkout'
import { createPayment, verifyPayment } from '@/lib/api/payment'
import { openRazorpayCheckout } from '@/lib/utils/razorpay'
import { formatPrice } from '@/lib/utils/formatPrice'
import { ApiError } from '@/lib/api/client'

type Step = 'address' | 'review' | 'paying' | 'success' | 'error'

const EMPTY_ADDRESS: CheckoutAddressInput = {
  fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'IN', type: 'home',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { token, user } = useAuthStore()
  const { items, subtotal } = useCartStore()

  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState<CheckoutAddressInput>(EMPTY_ADDRESS)
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('razorpay')
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  // Set once placeOrder() succeeds — lets a payment-step retry re-attempt
  // payment for the same order instead of placing a second one.
  const [placedOrder, setPlacedOrder] = useState<{ orderId: string; orderNumber: string } | null>(null)

  // Checkout requires auth on the backend — there's no guest checkout.
  useEffect(() => {
    if (!token) router.replace('/account?redirect=/checkout')
  }, [token, router])

  // Nothing to check out — send back to cart, unless we just successfully
  // ordered (which empties the cart and would otherwise bounce this screen away).
  useEffect(() => {
    if (!items.length && step !== 'success') router.replace('/cart')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, step])

  if (!token) return null

  const set = (k: keyof CheckoutAddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }))

  const addressComplete = Boolean(address.fullName && address.phone && address.line1 && address.city && address.state && address.pincode)

  const handleReview = async () => {
    setError('')
    try {
      const result = await previewCheckout(token, { shippingAddress: address, paymentMethod })
      setPreview(result)
      setStep('review')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not calculate your order total. Please check your address and try again.')
    }
  }

  // Attempts payment for an already-placed order. Safe to call again on
  // retry — never creates a new order.
  const attemptPayment = async (order: { orderId: string; orderNumber: string }) => {
    try {
      const payment = await createPayment(token!, order.orderId, paymentMethod)

      if (payment.method === 'cod') {
        await useCartStore.getState().syncCart()
        setOrderNumber(order.orderNumber)
        setStep('success')
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
            setOrderNumber(order.orderNumber)
            setStep('success')
          } catch (err) {
            setError(
              (err instanceof ApiError ? err.message : 'Payment verification failed.') +
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
      setError(err instanceof ApiError ? err.message : 'Could not start payment for this order.')
      setStep('error')
    }
  }

  const handleConfirm = async () => {
    setError('')
    try {
      const order = await placeOrder(token, { shippingAddress: address, paymentMethod })
      setPlacedOrder(order)
      await attemptPayment(order)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong placing your order.')
      setStep('error')
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

  if (step === 'success') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <h1 className="text-display-xl font-display mb-4">ORDER CONFIRMED</h1>
        <p className="text-body-md mb-8" style={{ color: 'var(--color-brand-muted)' }}>
          Order #{orderNumber} has been placed.
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/collections/all')}>
          Continue Shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1 className="text-display-xl font-display mb-8">CHECKOUT</h1>

      <div className="space-y-2.5 mb-8">
        <h2 className="text-display-md font-display mb-2">Order Summary</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-body-sm">
            <span>{item.name} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between text-body-sm font-semibold pt-2 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
          <span>{preview ? 'Total' : 'Subtotal'}</span>
          <span>{formatPrice(preview?.grandTotal ?? subtotal)}</span>
        </div>
        {preview && (
          <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
            Includes {formatPrice(preview.taxTotal)} tax
            {preview.discountTotal > 0 && ` · ${formatPrice(preview.discountTotal)} discount applied`}
          </p>
        )}
      </div>

      <div className="space-y-4 mb-8">
        <h2 className="text-display-md font-display">Shipping Address</h2>
        <Field label="Full Name" value={address.fullName} onChange={set('fullName')} />
        <Field label="Phone" value={address.phone} onChange={set('phone')} type="tel" />
        <Field label="Address Line 1" value={address.line1} onChange={set('line1')} />
        <Field label="Address Line 2 (optional)" value={address.line2 ?? ''} onChange={set('line2')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="City" value={address.city} onChange={set('city')} />
          <Field label="State" value={address.state} onChange={set('state')} />
        </div>
        <Field label="Pincode" value={address.pincode} onChange={set('pincode')} />
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
              onChange={() => { setPaymentMethod(m); setPreview(null); setStep('address') }}
            />
            {m === 'razorpay' ? 'Card / UPI / Netbanking (Razorpay)' : 'Cash on Delivery'}
          </label>
        ))}
      </div>

      {error && (
        <p className="text-body-xs p-3 rounded-sm mb-4" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {step === 'address' && (
        <Button variant="primary" size="lg" fullWidth disabled={!addressComplete} onClick={handleReview}>
          Review Order
        </Button>
      )}
      {step === 'review' && (
        <Button variant="primary" size="lg" fullWidth onClick={handleConfirm}>
          Confirm &amp; Pay {formatPrice(preview?.grandTotal ?? subtotal)}
        </Button>
      )}
      {step === 'paying' && (
        <Button variant="primary" size="lg" fullWidth loading disabled>
          Waiting for payment…
        </Button>
      )}
      {step === 'error' && (
        <Button variant="primary" size="lg" fullWidth onClick={handleRetry}>
          {placedOrder ? 'Retry Payment' : 'Try Again'}
        </Button>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors"
        style={{ borderColor: 'var(--color-brand-border)' }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-brand-berry)'}
        onBlur={(e)  => e.currentTarget.style.borderColor = 'var(--color-brand-border)'}
      />
    </div>
  )
}
