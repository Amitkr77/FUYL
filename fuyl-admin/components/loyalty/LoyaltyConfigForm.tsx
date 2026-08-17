'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { LoyaltyConfig, EligibleBase } from '@/lib/loyalty'
import { saveLoyaltyConfigAction } from '@/app/(admin)/loyalty/actions'

const ELIGIBLE_BASE_OPTIONS: { value: EligibleBase; label: string; desc: string }[] = [
  { value: 'original_subtotal',          label: 'Original subtotal',             desc: 'Before any discounts' },
  { value: 'discounted_subtotal',        label: 'Discounted subtotal',           desc: 'After coupons / price-book discounts' },
  { value: 'order_total',                label: 'Order total',                   desc: 'Incl. tax and shipping' },
  { value: 'order_total_excl_shipping',  label: 'Order total (excl. shipping)',  desc: 'Grand total minus shipping charge' },
  { value: 'amount_paid',                label: 'Amount paid',                   desc: 'After wallet and loyalty deductions' },
]

export function LoyaltyConfigForm({ config }: { config: LoyaltyConfig | null }) {
  const [fields, setFields] = useState({
    earnSpend:               config?.earnSpend               ?? 100,
    earnPoints:              config?.earnPoints              ?? 10,
    redeemPoints:            config?.redeemPoints            ?? 100,
    redeemValue:             config?.redeemValue             ?? 10,
    minRedeemPoints:         config?.minRedeemPoints         ?? 500,
    maxRedeemPointsPerOrder: config?.maxRedeemPointsPerOrder ?? 0,
    maxRedeemPercent:        config?.maxRedeemPercent        ?? 0,
    allowPartialRedemption:  config?.allowPartialRedemption  ?? true,
    eligibleBase:            (config?.eligibleBase           ?? 'discounted_subtotal') as EligibleBase,
    includeShipping:         config?.includeShipping         ?? false,
    includeTax:              config?.includeTax              ?? false,
    includeWalletPaid:       config?.includeWalletPaid       ?? false,
    pointExpiryDays:         config?.pointExpiryDays         ?? 365,
    reverseOnCancel:         config?.reverseOnCancel         ?? true,
    reverseOnRefund:         config?.reverseOnRefund         ?? true,
    isActive:                config?.isActive                ?? true,
  })

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const numField = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
  }

  const boolField = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.checked }))
  }

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const result = await saveLoyaltyConfigAction(config?.id ?? null, fields)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const earnPreview = `Spend ₹${fields.earnSpend} → earn ${fields.earnPoints} pts`
  const redeemPreview = `${fields.redeemPoints} pts → ₹${fields.redeemValue}`

  return (
    <div className="space-y-6">
      {/* Programme status */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Programme status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enable or disable loyalty points sitewide.</p>
          </div>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setFields((f) => ({ ...f, isActive: !f.isActive }))}
          >
            <div className={`relative w-10 h-6 rounded-full transition-colors ${fields.isActive ? 'bg-[#558476]' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${fields.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">{fields.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      {/* Earn rules */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Earn rules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            How customers earn points on delivered orders.
            Preview: <span className="font-medium text-slate-700">{earnPreview}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Spend per unit (₹)"
            hint="Customer spends this ₹ amount to earn one unit of points"
            value={fields.earnSpend}
            onChange={numField('earnSpend')}
            min={1}
            step={1}
          />
          <NumberField
            label="Points per unit"
            hint="Points awarded per unit of spend"
            value={fields.earnPoints}
            onChange={numField('earnPoints')}
            min={1}
            step={1}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Earning base</label>
          <select
            value={fields.eligibleBase}
            onChange={(e) => setFields((f) => ({ ...f, eligibleBase: e.target.value as EligibleBase }))}
            className="w-full sm:max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
          >
            {ELIGIBLE_BASE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-5">
          <CheckField label="Include shipping in base" checked={fields.includeShipping} onChange={boolField('includeShipping')} />
          <CheckField label="Include tax in base" checked={fields.includeTax} onChange={boolField('includeTax')} />
          <CheckField label="Include wallet-paid amount" checked={fields.includeWalletPaid} onChange={boolField('includeWalletPaid')} />
        </div>
      </div>

      {/* Redemption rules */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Redemption rules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            How customers spend points at checkout.
            Preview: <span className="font-medium text-slate-700">{redeemPreview}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Points per block"
            hint="Minimum points chunk that converts to ₹ value"
            value={fields.redeemPoints}
            onChange={numField('redeemPoints')}
            min={1}
            step={1}
          />
          <NumberField
            label="₹ value per block"
            hint="Rupee value of one redemption block"
            value={fields.redeemValue}
            onChange={numField('redeemValue')}
            min={0.01}
            step={0.01}
          />
          <NumberField
            label="Minimum points to redeem"
            hint="0 = no minimum required"
            value={fields.minRedeemPoints}
            onChange={numField('minRedeemPoints')}
            min={0}
            step={1}
          />
          <NumberField
            label="Max points per order"
            hint="0 = unlimited"
            value={fields.maxRedeemPointsPerOrder}
            onChange={numField('maxRedeemPointsPerOrder')}
            min={0}
            step={1}
          />
          <NumberField
            label="Max % of order total"
            hint="0 = no cap (e.g. 50 limits redemption to 50% of order value)"
            value={fields.maxRedeemPercent}
            onChange={numField('maxRedeemPercent')}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <CheckField
          label="Allow partial redemption (redeem less than full balance)"
          checked={fields.allowPartialRedemption}
          onChange={boolField('allowPartialRedemption')}
        />
      </div>

      {/* Lifecycle */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Lifecycle</h3>

        <NumberField
          label="Point expiry (days)"
          hint="Days until earned points expire — 0 means points never expire"
          value={fields.pointExpiryDays}
          onChange={numField('pointExpiryDays')}
          min={0}
          step={1}
        />

        <div className="flex flex-wrap gap-5">
          <CheckField label="Reverse earned points when order is cancelled" checked={fields.reverseOnCancel} onChange={boolField('reverseOnCancel')} />
          <CheckField label="Reverse earned points when order is refunded" checked={fields.reverseOnRefund} onChange={boolField('reverseOnRefund')} />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#12291F] hover:bg-[#1a3d2e] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saved && <CheckCircle2 className="w-4 h-4" />}
          {saved ? 'Saved!' : isPending ? 'Saving…' : config ? 'Update config' : 'Create config'}
        </button>
        {!config && (
          <p className="text-xs text-slate-500">No configuration exists yet — this will create the first one.</p>
        )}
      </div>
    </div>
  )
}

function NumberField({
  label, hint, value, onChange, min, max, step,
}: {
  label: string
  hint?: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
      />
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function CheckField({
  label, checked, onChange,
}: {
  label: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 accent-[#558476]"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}
