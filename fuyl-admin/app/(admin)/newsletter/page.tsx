import { AlertCircle, Mail, CheckCircle2, Clock, Ban } from 'lucide-react'
import { getNewsletterStats, listSubscribers } from '@/lib/newsletter'
import { NewsletterTable } from '@/components/newsletter/NewsletterTable'
import { getErrorMessage } from '@/lib/api'

export default async function NewsletterPage() {
  let stats: Awaited<ReturnType<typeof getNewsletterStats>> | null = null
  let subscribers: Awaited<ReturnType<typeof listSubscribers>> = []
  let error = ''
  try {
    ;[stats, subscribers] = await Promise.all([getNewsletterStats(), listSubscribers()])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load newsletter subscribers.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Newsletter</h2>
        <p className="text-sm text-slate-500 mt-0.5">Email subscribers and their consent status</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Mail} label="Total" value={String(stats.total)} />
          <StatCard icon={CheckCircle2} label="Active" value={String(stats.active)} />
          <StatCard icon={Clock} label="Pending" value={String(stats.pending)} accent={stats.pending > 0} />
          <StatCard icon={Ban} label="Unsubscribed" value={String(stats.unsubscribed)} />
        </div>
      )}

      <NewsletterTable subscribers={subscribers} />
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
