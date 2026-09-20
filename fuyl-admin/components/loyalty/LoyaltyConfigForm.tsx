'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { LoyaltyConfig, EligibleBase } from '@/lib/loyalty'
import { saveLoyaltyConfigAction } from '@/app/(admin)/loyalty/actions'
import { Input, Select, Checkbox, Toggle, FormSection } from '@/components/ui/form'

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

  const earnPreview = `Spend \u20B9${fields.earnSpend} \u2192 earn ${fields.earnPoints} pts`
  const redeemPreview = `${fields.redeemPoints} pts \u2192 \u20B9${fields.redeemValue}`

  return (
    <div className="space-y-6">
      {/* Programme status */}
      <FormSection title="Programme status" description="Enable or disable loyalty points sitewide.">
        <Toggle
          checked={fields.isActive}
          onChange={(v) => setFields((f) => ({ ...f, isActive: v }))}
          label={fields.isActive ? 'Active' : 'Inactive'}
        />
      </FormSection>

      {/* Earn rules */}
      <FormSection title="Earn rules" description={`How customers earn points on delivered orders. Preview: ${earnPreview}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Spend per unit (\u20B9)"
            helperText="Customer spends this \u20B9 amount to earn one unit of points"
            type="number"
            value={fields.earnSpend}
            onChange={numField('earnSpend')}
            min={1}
            step={1}
          />
          <Input
            label="Points per unit"
            helperText="Points awarded per unit of spend"
            type="number"
            value={fields.earnPoints}
            onChange={numField('earnPoints')}
            min={1}
            step={1}
          />
        </div>

        <Select
          label="Earning base"
          value={fields.eligibleBase}
          onChange={(e) => setFields((f) => ({ ...f, eligibleBase: e.target.value as EligibleBase }))}
          options={ELIGIBLE_BASE_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} \u2014 ${o.desc}` }))}
          className="sm:max-w-md"
        />

        <div className="flex flex-wrap gap-5">
          <Checkbox label="Include shipping in base" checked={fields.includeShipping} onChange={boolField('includeShipping')} />
          <Checkbox label="Include tax in base" checked={fields.includeTax} onChange={boolField('includeTax')} />
          <Checkbox label="Include wallet-paid amount" checked={fields.includeWalletPaid} onChange={boolField('includeWalletPaid')} />
        </div>
      </FormSection>

      {/* Redemption rules */}
      <FormSection title="Redemption rules" description={`How customers spend points at checkout. Preview: ${redeemPreview}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Points per block"
            helperText="Minimum points chunk that converts to \u20B9 value"
            type="number"
            value={fields.redeemPoints}
            onChange={numField('redeemPoints')}
            min={1}
            step={1}
          />
          <Input
            label="\u20B9 value per block"
            helperText="Rupee value of one redemption block"
            type="number"
            value={fields.redeemValue}
            onChange={numField('redeemValue')}
            min={0.01}
            step={0.01}
          />
          <Input
            label="Minimum points to redeem"
            helperText="0 = no minimum required"
            type="number"
            value={fields.minRedeemPoints}
            onChange={numField('minRedeemPoints')}
            min={0}
            step={1}
          />
          <Input
            label="Max points per order"
            helperText="0 = unlimited"
            type="number"
            value={fields.maxRedeemPointsPerOrder}
            onChange={numField('maxRedeemPointsPerOrder')}
            min={0}
            step={1}
          />
          <Input
            label="Max % of order total"
            helperText="0 = no cap (e.g. 50 limits redemption to 50% of order value)"
            type="number"
            value={fields.maxRedeemPercent}
            onChange={numField('maxRedeemPercent')}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <Checkbox
          label="Allow partial redemption (redeem less than full balance)"
          checked={fields.allowPartialRedemption}
          onChange={boolField('allowPartialRedemption')}
        />
      </FormSection>

      {/* Lifecycle */}
      <FormSection title="Lifecycle">
        <Input
          label="Point expiry (days)"
          helperText="Days until earned points expire \u2014 0 means points never expire"
          type="number"
          value={fields.pointExpiryDays}
          onChange={numField('pointExpiryDays')}
          min={0}
          step={1}
        />

        <div className="flex flex-wrap gap-5">
          <Checkbox label="Reverse earned points when order is cancelled" checked={fields.reverseOnCancel} onChange={boolField('reverseOnCancel')} />
          <Checkbox label="Reverse earned points when order is refunded" checked={fields.reverseOnRefund} onChange={boolField('reverseOnRefund')} />
        </div>
      </FormSection>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saved && <CheckCircle2 className="w-4 h-4" />}
          {saved ? 'Saved!' : isPending ? 'Saving...' : config ? 'Update config' : 'Create config'}
        </button>
        {!config && (
          <p className="text-xs text-slate-500">No configuration exists yet — this will create the first one.</p>
        )}
      </div>
    </div>
  )
}
