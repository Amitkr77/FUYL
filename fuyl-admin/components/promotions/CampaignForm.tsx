'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import type { CampaignType, DiscountType, Coupon } from '@/lib/promotions'
import { createCampaignAction } from '@/app/(admin)/promotions/actions'

type DraftCoupon = {
  code: string
  discountType: DiscountType
  discountValue: string
  scope: Coupon['scope']
  maxRedemptionsPerUser: string
}

const emptyCoupon = (): DraftCoupon => ({
  code: '', discountType: 'percent', discountValue: '', scope: 'cart', maxRedemptionsPerUser: '1',
})

export function CampaignForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<CampaignType>('coupon')
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [endsAt, setEndsAt] = useState('')
  const [coupons, setCoupons] = useState<DraftCoupon[]>([emptyCoupon()])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const updateCoupon = (i: number, patch: Partial<DraftCoupon>) => {
    setCoupons((cs) => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  const handleSubmit = () => {
    setError('')
    if (!name.trim()) { setError('Campaign name is required.'); return }
    if (type === 'coupon' && coupons.some((c) => !c.code.trim() || !c.discountValue)) {
      setError('Every coupon needs a code and discount value.')
      return
    }

    const startIso = new Date(startsAt).toISOString()
    const endIso = endsAt ? new Date(endsAt).toISOString() : undefined

    startTransition(async () => {
      const result = await createCampaignAction({
        name,
        description: description || undefined,
        type,
        startsAt: startIso,
        endsAt: endIso,
        coupons: type === 'coupon'
          ? coupons.map((c) => ({
              code: c.code.toUpperCase(),
              discountType: c.discountType,
              discountValue: Number(c.discountValue),
              scope: c.scope,
              startsAt: startIso,
              endsAt: endIso,
              maxRedemptionsPerUser: Number(c.maxRedemptionsPerUser) || 1,
            }))
          : [],
      })
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campaign Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Diwali Sale" />
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as CampaignType)} className={inputCls}>
              <option value="coupon">Coupon</option>
              <option value="automatic">Automatic</option>
              <option value="bundle">Bundle</option>
              <option value="flash_sale">Flash Sale</option>
            </select>
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts">
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Ends (optional)">
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {type === 'coupon' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Coupon Codes</h3>
            <button
              onClick={() => setCoupons((cs) => [...cs, emptyCoupon()])}
              className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add coupon
            </button>
          </div>
          {coupons.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-slate-50">
              <Field label="Code" small>
                <input
                  value={c.code}
                  onChange={(e) => updateCoupon(i, { code: e.target.value.toUpperCase() })}
                  className={`${inputCls} w-32`}
                  placeholder="SAVE20"
                />
              </Field>
              <Field label="Discount Type" small>
                <select
                  value={c.discountType}
                  onChange={(e) => updateCoupon(i, { discountType: e.target.value as DiscountType })}
                  className={inputCls}
                >
                  <option value="percent">Percent</option>
                  <option value="flat">Flat</option>
                  <option value="per_unit">Per Unit</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </Field>
              <Field label="Value" small>
                <input
                  type="number"
                  value={c.discountValue}
                  onChange={(e) => updateCoupon(i, { discountValue: e.target.value })}
                  className={`${inputCls} w-24`}
                />
              </Field>
              <Field label="Scope" small>
                <select
                  value={c.scope}
                  onChange={(e) => updateCoupon(i, { scope: e.target.value as Coupon['scope'] })}
                  className={inputCls}
                >
                  <option value="cart">Cart</option>
                  <option value="category">Category</option>
                  <option value="product">Product</option>
                  <option value="variant">Variant</option>
                  <option value="seller">Seller</option>
                </select>
              </Field>
              <Field label="Max uses/user" small>
                <input
                  type="number"
                  value={c.maxRedemptionsPerUser}
                  onChange={(e) => updateCoupon(i, { maxRedemptionsPerUser: e.target.value })}
                  className={`${inputCls} w-20`}
                />
              </Field>
              {coupons.length > 1 && (
                <button
                  onClick={() => setCoupons((cs) => cs.filter((_, idx) => idx !== i))}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="px-5 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create Campaign'}
      </button>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]'

function Field({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block font-medium text-slate-500 mb-1 ${small ? 'text-xs' : 'text-sm'}`}>{label}</label>
      {children}
    </div>
  )
}
