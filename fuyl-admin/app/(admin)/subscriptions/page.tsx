import { AlertCircle, Repeat, PauseCircle, AlertTriangle, IndianRupee } from 'lucide-react'
import { getSubscriptionStats, listSubscriptions, AdminApiError } from '@/lib/subscriptions'
import { SubscriptionsTable } from '@/components/subscriptions/SubscriptionsTable'
import { formatCurrency } from '@/lib/utils'

export default async function SubscriptionsPage() {
  let stats: Awaited<ReturnType<typeof getSubscriptionStats>> | null = null
  let subscriptions: Awaited<ReturnType<typeof listSubscriptions>> = []
  let error = ''
  try {
    ;[stats, subscriptions] = await Promise.all([getSubscriptionStats(), listSubscriptions()])
  } catch (err) {
    error = err instanceof AdminApiError ? err.message : 'Could not load subscriptions.'
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Subscriptions</h2>
        <p className="text-sm text-slate-500 mt-0.5">Recurring orders and billing health</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Repeat} label="Active" value={String(stats.active)} />
          <StatCard icon={PauseCircle} label="Paused" value={String(stats.paused)} />
          <StatCard icon={AlertTriangle} label="Past Due" value={String(stats.pastDue)} accent={stats.pastDue > 0} />
          <StatCard icon={IndianRupee} label="MRR" value={formatCurrency(stats.mrr)} />
        </div>
      )}

      <SubscriptionsTable subscriptions={subscriptions} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={`bg-white border rounded-xl shadow-sm p-4 ${accent ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className={`flex items-center gap-2 ${accent ? 'text-amber-500' : 'text-slate-400'}`}>
        <Icon className="w-4 h-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
