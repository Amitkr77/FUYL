'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import type { CreateDiscountInput, Discount, DiscountValueType } from '@/lib/discounts'
import { createDiscountAction, updateDiscountAction } from '@/app/(admin)/discounts-cashback/actions'
import { Input, Textarea, Select, Checkbox, FormSection } from '@/components/ui/form'

type DiscountKind = 'product' | 'order' | 'free_shipping' | 'buy_x_get_y'
type Target = { id: string; name: string }

export function DiscountForm({ products = [], initial }: { products?: Target[]; initial?: Discount }) {
  const first = initial?.coupons[0]
  const initialKind: DiscountKind = first?.discountType === 'free_shipping' ? 'free_shipping' : first?.discountType === 'buy_x_get_y' ? 'buy_x_get_y' : first?.scope === 'product' ? 'product' : 'order'
  const initialMethod = first && !['free_shipping', 'buy_x_get_y'].includes(first.discountType) ? first.discountType as Exclude<DiscountValueType, 'free_shipping' | 'buy_x_get_y'> : 'percent'
  const localDate = (value?: string) => value ? new Date(value).toISOString().slice(0, 16) : ''
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [kind, setKind] = useState<DiscountKind>(initialKind)
  const [method, setMethod] = useState<Exclude<DiscountValueType, 'free_shipping' | 'buy_x_get_y'>>(initialMethod)
  const [value, setValue] = useState(first?.discountType === 'free_shipping' ? '' : String(first?.discountValue ?? ''))
  const [targetIds, setTargetIds] = useState<string[]>(first?.targetIds ?? [])
  const [buyQuantity, setBuyQuantity] = useState(String(first?.buyQuantity ?? 1))
  const [getQuantity, setGetQuantity] = useState(String(first?.getQuantity ?? 1))
  const [buyTargetIds, setBuyTargetIds] = useState<string[]>(first?.buyTargetIds ?? [])
  const [getTargetIds, setGetTargetIds] = useState<string[]>(first?.getTargetIds ?? [])
  const [codes, setCodes] = useState(initial?.coupons.map((coupon) => coupon.code) ?? [''])
  const [maxPerUser, setMaxPerUser] = useState(String(first?.maxRedemptionsPerUser ?? 1))
  const [maxGlobal, setMaxGlobal] = useState(first?.maxRedemptionsGlobal ? String(first.maxRedemptionsGlobal) : '')
  const [minSubtotal, setMinSubtotal] = useState(first?.minOrderSubtotal ? String(first.minOrderSubtotal) : '')
  const [maxDiscount, setMaxDiscount] = useState(first?.maxDiscountAmount ? String(first.maxDiscountAmount) : '')
  const [firstOrderOnly, setFirstOrderOnly] = useState(first?.isFirstOrderOnly ?? false)
  const [startsAt, setStartsAt] = useState(() => localDate(initial?.startsAt) || new Date().toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState(() => localDate(initial?.endsAt))
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const discountType: DiscountValueType = kind === 'free_shipping' ? 'free_shipping' : kind === 'buy_x_get_y' ? 'buy_x_get_y' : method
  const needsValue = kind !== 'free_shipping'

  function submit() {
    setError('')
    const normalizedCodes = codes.map((code) => code.trim().toUpperCase())
    if (!name.trim()) return setError('Discount title is required.')
    if (normalizedCodes.some((code) => !code)) return setError('Enter every coupon code or remove empty rows.')
    if (new Set(normalizedCodes).size !== normalizedCodes.length) return setError('Coupon codes must be unique.')
    if (needsValue && (!value || Number(value) <= 0)) return setError('Enter a discount value greater than zero.')
    if (kind === 'product' && !targetIds.length) return setError('Select at least one eligible product.')
    if (kind === 'buy_x_get_y' && (!buyTargetIds.length || !getTargetIds.length)) return setError('Select qualifying and reward products.')
    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) return setError('Enter a valid start date and time.')
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) return setError('Enter a valid end date and time.')
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) return setError('End date must be after the start date.')

    const startIso = new Date(startsAt).toISOString()
    const endIso = endsAt ? new Date(endsAt).toISOString() : initial ? null : undefined
    startTransition(async () => {
      const payload: CreateDiscountInput = {
        name: name.trim(), description: description.trim() || undefined, type: 'coupon' as const, status: initial?.status ?? 'active' as const, startsAt: startIso, endsAt: endIso,
        coupons: normalizedCodes.map((code) => ({
          code,
          discountType,
          discountValue: kind === 'free_shipping' ? 0 : Number(value),
          scope: kind === 'product' ? 'product' : 'cart',
          targetIds: kind === 'product' ? targetIds : undefined,
          buyQuantity: kind === 'buy_x_get_y' ? Number(buyQuantity) : undefined,
          getQuantity: kind === 'buy_x_get_y' ? Number(getQuantity) : undefined,
          buyTargetIds: kind === 'buy_x_get_y' ? buyTargetIds : undefined,
          getTargetIds: kind === 'buy_x_get_y' ? getTargetIds : undefined,
          startsAt: startIso, endsAt: endIso,
          maxRedemptionsPerUser: Number(maxPerUser) || 1,
          maxRedemptionsGlobal: maxGlobal ? Number(maxGlobal) : undefined,
          minOrderSubtotal: minSubtotal ? Number(minSubtotal) : undefined,
          maxDiscountAmount: maxDiscount ? Number(maxDiscount) : undefined,
          isFirstOrderOnly: firstOrderOnly,
        })),
      }
      const result = initial ? await updateDiscountAction(initial.id, payload) : await createDiscountAction(payload)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return <div className="max-w-3xl space-y-5">
    <FormSection title="General information">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Discount title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Sale" />
        <Select label="Discount type" value={kind} onChange={(e) => setKind(e.target.value as DiscountKind)} options={[{ value: 'product', label: 'Amount off products' }, { value: 'order', label: 'Amount off order' }, { value: 'free_shipping', label: 'Free shipping' }, { value: 'buy_x_get_y', label: 'Buy X Get Y' }]} />
      </div>
      <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
    </FormSection>

    <FormSection title="Discount rule" description="This rule is shared by every coupon code below.">
      {(kind === 'product' || kind === 'order') && <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Discount method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} options={[{ value: 'percent', label: 'Percentage' }, { value: 'flat', label: 'Fixed amount' }, { value: 'per_unit', label: 'Fixed amount per unit' }]} />
        <ValueField method={method} value={value} setValue={setValue} />
      </div>}
      {kind === 'product' && <ProductSelect label="Eligible products" products={products} value={targetIds} onChange={setTargetIds} />}
      {kind === 'free_shipping' && <Info>Complete eligible shipping charges will be removed. No value is required.</Info>}
      {kind === 'buy_x_get_y' && <>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input type="number" label="Customer buys" min={1} value={buyQuantity} onChange={(e) => setBuyQuantity(e.target.value)} />
          <Input type="number" label="Customer gets" min={1} value={getQuantity} onChange={(e) => setGetQuantity(e.target.value)} />
          <Input type="number" label="Reward discount %" min={1} max={100} value={value} onChange={(e) => setValue(e.target.value)} placeholder="100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProductSelect label="Qualifying products" products={products} value={buyTargetIds} onChange={setBuyTargetIds} />
          <ProductSelect label="Reward products" products={products} value={getTargetIds} onChange={setGetTargetIds} />
        </div>
        <Info>Use 100% for a free reward. Customers must add both qualifying and reward items to the cart.</Info>
      </>}
    </FormSection>

    <FormSection title="Coupon codes" description="All codes use the same discount rule.">
      <div className="space-y-3">{codes.map((code, index) => <div key={index} className="flex gap-2"><Input value={code} onChange={(e) => setCodes((items) => items.map((item, i) => i === index ? e.target.value.toUpperCase() : item))} placeholder="SAVE20" className="flex-1" />{codes.length > 1 && <button type="button" onClick={() => setCodes((items) => items.filter((_, i) => i !== index))} className="rounded-lg border px-3 text-red-500" aria-label="Remove code"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>
      <button type="button" onClick={() => setCodes((items) => [...items, ''])} className="inline-flex items-center gap-1 text-sm font-medium text-[#558476]"><Plus className="h-4 w-4" />Add another code</button>
    </FormSection>

    <FormSection title="Requirements and limits">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" label="Minimum order amount" prefix="₹" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} placeholder="No minimum" />
        <Input type="number" label="Maximum uses per customer" min={1} value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)} />
        <Input type="number" label="Total usage limit" min={1} value={maxGlobal} onChange={(e) => setMaxGlobal(e.target.value)} placeholder="Unlimited" />
        {(method === 'percent' || kind === 'buy_x_get_y') && kind !== 'free_shipping' && <Input type="number" label="Maximum discount" prefix="₹" min={0} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No cap" />}
      </div>
      <Checkbox label="First order only" checked={firstOrderOnly} onChange={(e) => setFirstOrderOnly(e.target.checked)} />
    </FormSection>

    <FormSection title="Active dates">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="datetime-local" label="Starts" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <div>
          <Input type="datetime-local" label="Ends (optional)" min={startsAt || undefined} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-slate-400">Leave blank to keep the discount active without an end date.</span>
        </div>
      </div>
    </FormSection>

    {error && <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}
    <button onClick={submit} disabled={pending} className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50">{pending ? 'Saving…' : initial ? 'Save discount' : 'Create discount'}</button>
  </div>
}

function ValueField({ method, value, setValue }: { method: string; value: string; setValue: (value: string) => void }) { return <Input type="number" label={method === 'percent' ? 'Percentage' : 'Amount ₹'} min={0} max={method === 'percent' ? 100 : undefined} value={value} onChange={(e) => setValue(e.target.value)} /> }
function ProductSelect({ label, products, value, onChange }: { label: string; products: Target[]; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select multiple value={value} onChange={(e) => onChange(Array.from(e.target.selectedOptions, (option) => option.value))} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent">
        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-400">Hold Ctrl/Cmd to select multiple.</span>
    </div>
  )
}
function Info({ children }: { children: React.ReactNode }) { return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{children}</p> }
