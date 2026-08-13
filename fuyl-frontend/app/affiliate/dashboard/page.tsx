'use client'

import { useEffect, useState } from 'react'
import { MousePointerClick, ShoppingBag, TrendingUp, Coins } from 'lucide-react'
import { useAffiliate }           from '@/lib/hooks/useAffiliate'
import { getAffiliateDashboard, getAffiliateProgram, type AffiliateDashboard, type AffiliateProgram } from '@/lib/api/affiliate'
import { getErrorMessage }        from '@/lib/api/client'
import { StatsCard }              from '@/components/affiliate/dashboard/StatsCard'
import { CommissionProgramTabs }  from '@/components/affiliate/dashboard/CommissionProgramTabs'
import { AffiliateLinkPanel }     from '@/components/affiliate/dashboard/AffiliateLinkPanel'
import { PerformanceSection }     from '@/components/affiliate/dashboard/PerformanceSection'
import { Skeleton }               from '@/components/ui/Skeleton'
import { formatPrice }            from '@/lib/utils/formatPrice'

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export default function DashboardPage() {
  const { token, affiliate } = useAffiliate()

  const [dashboard, setDashboard]       = useState<AffiliateDashboard | null>(null)
  const [program,   setProgram]         = useState<AffiliateProgram | null>(null)
  const [loading,   setLoading]         = useState(true)
  const [loadingPrg, setLoadingPrg]     = useState(true)
  const [error,     setError]           = useState('')

  useEffect(() => {
    if (!token) return

    // Fetch dashboard + program in parallel
    getAffiliateDashboard(token)
      .then(setDashboard)
      .catch((err) => setError(getErrorMessage(err, 'Could not load dashboard.')))
      .finally(() => setLoading(false))

    getAffiliateProgram(token)
      .then(setProgram)
      .catch(() => setProgram(null))
      .finally(() => setLoadingPrg(false))
  }, [token])

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
        {error}
      </p>
    )
  }

  if (!dashboard) return null

  const { stats, links, commissions } = dashboard

  const statCards = [
    { label: 'Total Clicks',    value: stats.totalClicks.toLocaleString('en-IN'),  icon: MousePointerClick },
    { label: 'Orders Referred', value: stats.totalOrders.toLocaleString('en-IN'),  icon: ShoppingBag },
    { label: 'Revenue',         value: formatPrice(stats.totalRevenue),             icon: TrendingUp },
    { label: 'Commission',      value: formatPrice(stats.totalCommissionEarned),    icon: Coins, accent: true },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-display-md font-display text-brand-forest">DASHBOARD</h1>
        <p className="text-body-sm text-brand-muted mt-0.5">
          Welcome back, {affiliate?.name ?? '—'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, accent }) => (
          <StatsCard key={label} label={label} value={value} icon={icon} accent={accent} />
        ))}
      </div>

      {/* Section 1 — Commission & Program Details */}
      <CommissionProgramTabs
        commissions={commissions}
        program={program}
        loadingProgram={loadingPrg}
      />

      {/* Section 2 — Affiliate Link */}
      <AffiliateLinkPanel links={links} />

      {/* Section 3 — Performance charts */}
      <PerformanceSection />
    </div>
  )
}
