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
          { label: 'Default Commission', value: `${program.defaultRate}%` },
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
