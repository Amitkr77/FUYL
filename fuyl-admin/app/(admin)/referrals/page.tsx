import { AlertCircle, Users, Share2, Gift, TrendingUp } from 'lucide-react'
import { getReferralStats, listReferrals } from '@/lib/referrals'
import { ReferralsTable } from '@/components/referrals/ReferralsTable'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'

export default async function ReferralsPage() {
  let stats: Awaited<ReturnType<typeof getReferralStats>> | null = null
  let referrals: Awaited<ReturnType<typeof listReferrals>> = []
  let error = ''
  try {
    ;[stats, referrals] = await Promise.all([getReferralStats(), listReferrals()])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load referral data.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Referrals</h2>
        <p className="text-sm text-slate-500 mt-0.5">Track referral performance and rewards</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Share2} label="Shared" value={String(stats.shared)} />
          <StatCard icon={Users} label="In Progress" value={String(stats.inProgress)} />
          <StatCard icon={TrendingUp} label="Conversion" value={`${stats.conversionRate.toFixed(1)}%`} />
          <StatCard icon={Gift} label="Rewards Paid" value={formatCurrency(stats.totalRewardsPaid)} />
        </div>
      )}

      <ReferralsTable referrals={referrals} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}
