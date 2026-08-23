'use client'

import { CreditCard, Smartphone, Landmark, Banknote, Check } from 'lucide-react'
import type { CheckoutPaymentMethod } from '@/lib/api/checkout'

const METHODS: {
  value: CheckoutPaymentMethod
  label: string
  description: string
  icons: React.ComponentType<{ size?: number; className?: string }>[]
}[] = [
  {
    value: 'cashfree',
    label: 'Card / UPI / Netbanking',
    description: 'Pay securely — instant confirmation',
    icons: [CreditCard, Smartphone, Landmark],
  },
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives',
    icons: [Banknote],
  },
]

interface PaymentMethodPickerProps {
  value: CheckoutPaymentMethod
  onChange: (method: CheckoutPaymentMethod) => void
  /** When provided, only show methods whose value is in this set */
  enabledMethods?: Set<CheckoutPaymentMethod>
}

export function PaymentMethodPicker({ value, onChange, enabledMethods }: PaymentMethodPickerProps) {
  const visible = enabledMethods
    ? METHODS.filter((m) => enabledMethods.has(m.value))
    : METHODS
  return (
    <div className="space-y-3">
      {visible.map((m) => {
        const active = value === m.value
        return (
          <label
            key={m.value}
            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
              active ? 'border-brand-teal bg-brand-sage/20' : 'border-brand-border hover:border-brand-muted'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="sr-only"
              checked={active}
              onChange={() => onChange(m.value)}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              {m.icons.map((Icon, i) => (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-sm ${
                    active ? 'bg-white text-brand-teal' : 'bg-brand-cream text-brand-muted'
                  }`}
                >
                  <Icon size={16} />
                </span>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-semibold text-brand-forest">{m.label}</p>
              <p className="text-body-xs text-brand-muted">{m.description}</p>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active ? 'border-brand-teal bg-brand-teal' : 'border-brand-border'
              }`}
            >
              {active && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
          </label>
        )
      })}
    </div>
  )
}
