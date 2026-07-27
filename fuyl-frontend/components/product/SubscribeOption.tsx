'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Repeat, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { createSubscription } from '@/lib/api/subscriptions'
import { authorizeSubscription } from '@/lib/utils/cashfree'
import { getErrorMessage } from '@/lib/api/client'
import type { SubscriptionPlan } from '@/lib/api/subscriptionPlans'

interface SubscribeOptionProps {
  productId: string
  variantId?: string
  plans: SubscriptionPlan[]
}

function intervalLabel(p: SubscriptionPlan): string {
  const every = p.intervalCount > 1 ? `${p.intervalCount} ` : ''
  const unit = p.interval.replace(/ly$/, '') // monthly -> month, weekly -> week
  return `every ${every}${unit}${p.intervalCount > 1 ? 's' : ''}`
}

export function SubscribeOption({ productId, variantId, plans }: SubscribeOptionProps) {
  const { token, user } = useAuthStore()
  const [selected, setSelected] = useState(plans[0]?.id ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'authorizing' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  if (plans.length === 0) return null

  const handleSubscribe = async () => {
    if (!token || !selected) return
    setStatus('loading')
    setError('')
    try {
      const res = await createSubscription(token, { planId: selected, productId, variantId })
      setStatus('authorizing')
      // Opens Cashfree's mandate-authorization step (modal or hosted redirect).
      await authorizeSubscription(res.mode, {
        subscriptionSessionId: res.subscriptionSessionId,
        authLink: res.authLink,
      })
      setStatus('done')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start the subscription. Please try again.'))
      setStatus('error')
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-brand-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <Repeat size={16} className="text-brand-teal" />
        <h3 className="text-body-md font-semibold text-brand-forest">Subscribe &amp; Save</h3>
      </div>
      <p className="text-body-xs text-brand-muted mb-4">
        Never run out — get it delivered on a schedule and save on every order. Skip, pause, or cancel anytime.
      </p>

      {status === 'done' ? (
        <div className="flex items-start gap-2 rounded-xl bg-brand-sage/40 p-4">
          <Check size={16} className="text-brand-forest shrink-0 mt-0.5" />
          <p className="text-body-sm text-brand-forest">
            Almost there — confirm the payment mandate to activate your subscription. Track it under{' '}
            <Link href="/account/subscriptions" className="underline">your subscriptions</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {plans.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  selected === p.id ? 'border-brand-teal bg-brand-sage/20' : 'border-brand-border'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sub-plan"
                    checked={selected === p.id}
                    onChange={() => setSelected(p.id)}
                  />
                  <span>
                    <span className="block text-body-sm font-medium text-brand-forest">
                      {p.name}{' '}
                      <span className="text-body-xs text-brand-muted font-normal">· {intervalLabel(p)}</span>
                    </span>
                    {p.freeShipping && (
                      <span className="text-body-xs text-brand-teal">Free shipping</span>
                    )}
                  </span>
                </span>
                {p.discountPercent > 0 && (
                  <span className="text-body-sm font-semibold text-brand-teal shrink-0">
                    Save {p.discountPercent}%
                  </span>
                )}
              </label>
            ))}
          </div>

          {!user ? (
            <p className="mt-4 text-body-sm text-brand-muted">
              <Link href="/account" className="text-brand-teal underline">Sign in</Link> to subscribe.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={status === 'loading' || status === 'authorizing' || !selected}
              className="mt-4 w-full h-12 rounded-sm bg-brand-forest text-white text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-brand-olive disabled:opacity-60"
            >
              {status === 'loading'
                ? 'Setting up…'
                : status === 'authorizing'
                  ? 'Awaiting authorization…'
                  : 'Subscribe'}
            </button>
          )}

          {status === 'error' && error && (
            <p className="mt-3 text-body-xs text-red-600">{error}</p>
          )}
        </>
      )}
    </div>
  )
}
