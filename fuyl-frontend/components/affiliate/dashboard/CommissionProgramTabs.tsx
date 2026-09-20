'use client'

import { useState } from 'react'
import { Coins, CheckCircle, BadgeCheck } from 'lucide-react'
import { TabBar } from '@/components/affiliate/shared/TabBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPrice } from '@/lib/utils/formatPrice'
import type { Commission, AffiliateProgram } from '@/lib/api/affiliate'

type Tab = 'commission' | 'program'

const TABS = [
  { key: 'commission' as Tab, label: 'Commission' },
  { key: 'program'    as Tab, label: 'Program Details' },
]

interface CommissionProgramTabsProps {
  commissions:  Commission[]
  program:      AffiliateProgram | null
  loadingProgram: boolean
}

// ─── Commission tab ───────────────────────────────────────────────────────────

function CommissionStats({ commissions }: { commissions: Commission[] }) {
  const sum = (statuses: string[]) =>
    commissions
      .filter((c) => statuses.includes(c.status))
      .reduce((acc, c) => acc + c.amount, 0)

  const stats = [
    {
      label:  'Pending',
      value:  formatPrice(sum(['pending'])),
      icon:   Coins,
      color:  'text-amber-600',
      bg:     'bg-amber-50 border-amber-100',
    },
    {
      label:  'Approved',
      value:  formatPrice(sum(['approved', 'payable'])),
      icon:   CheckCircle,
      color:  'text-blue-600',
      bg:     'bg-blue-50 border-blue-100',
    },
    {
      label:  'Paid',
      value:  formatPrice(sum(['paid'])),
      icon:   BadgeCheck,
      color:  'text-emerald-600',
      bg:     'bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`rounded-xl border p-4 flex items-start gap-3 ${bg}`}>
          <span className={`mt-0.5 shrink-0 ${color}`}>
            <Icon size={18} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
            <p className="text-display-sm font-display text-brand-forest mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Program tab ──────────────────────────────────────────────────────────────

function ProgramDetails({ program, loading }: { program: AffiliateProgram | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <p className="p-6 text-center text-brand-muted text-body-sm">
        No active program found.
      </p>
    )
  }

  const commissionValue = (rate: number) => {
    if (program.commissionType === 'flat_per_item') return `${formatPrice(rate)} per item`
    if (program.commissionType === 'flat_per_order') return `${formatPrice(rate)} per order`
    return `${rate}% of eligible sales`
  }
  const advancedRules = [
    program.advancedCommissions?.newCustomer.enabled && 'New customer',
    program.advancedCommissions?.lifetime.enabled && 'Lifetime',
    program.advancedCommissions?.specialCoupon.enabled && 'Special coupon',
  ].filter(Boolean)

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-body-sm font-semibold text-brand-forest">{program.name}</h3>
        {program.description && (
          <p className="text-body-sm text-brand-muted mt-1">{program.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Default Commission', value: commissionValue(program.defaultRate) },
          { label: 'Commission Base',    value: program.commissionBase === 'subtotal' ? 'Order Subtotal' : 'Grand Total' },
          { label: 'Attribution Window', value: `${program.attributionWindowDays} days` },
          { label: 'Min. Payout',        value: formatPrice(program.minPayoutAmount) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-brand-cream/60 border border-brand-border rounded-xl p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{label}</p>
            <p className="text-body-sm font-semibold text-brand-forest mt-1">{value}</p>
          </div>
        ))}
      </div>

      {program.tiers.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-2">Commission levels</p>
          <div className="space-y-2">
            {program.tiers.map((tier, index) => (
              <div key={`${tier.minOrderAmount}-${index}`} className="flex items-center justify-between rounded-lg border border-brand-border px-3 py-2 text-body-sm">
                <span className="text-brand-muted">
                  {program.tierBasis === 'order_count'
                    ? `From referral order #${tier.minOrderAmount}`
                    : `From ${formatPrice(tier.minOrderAmount)} eligible value`}
                </span>
                <strong className="text-brand-forest">{commissionValue(tier.rate)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-brand-cream/60 border border-brand-border p-3 text-body-sm text-brand-muted space-y-1">
        <p>Shipping: {program.excludeShipping ? 'not included in commission' : 'included in commission'}</p>
        <p>Product tax: {program.excludeProductTax ? 'not included in commission' : 'included in commission'}</p>
        {program.excludedProductCount > 0 && <p>{program.excludedProductCount} product(s) are excluded from commission.</p>}
        {program.specialProductRuleCount > 0 && <p>{program.specialProductRuleCount} product-specific commission rule(s) apply.</p>}
        {advancedRules.length > 0 && <p>Additional rules: {advancedRules.join(', ')}.</p>}
        <p>Eligible commissions are reviewed after {program.autoApproveAfterDays} day(s).</p>
      </div>
    </div>
  )
}

// ─── Combined component ───────────────────────────────────────────────────────

export function CommissionProgramTabs({ commissions, program, loadingProgram }: CommissionProgramTabsProps) {
  const [active, setActive] = useState<Tab>('commission')

  return (
    <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
      <TabBar tabs={TABS} active={active} onChange={setActive} className="px-2 pt-2" />
      {active === 'commission'
        ? <CommissionStats commissions={commissions} />
        : <ProgramDetails program={program} loading={loadingProgram} />}
    </div>
  )
}
