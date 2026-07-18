import { AlertCircle, Clock, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { getShippingStats, listShipments } from '@/lib/shipping'
import { ShipmentsTable } from '@/components/shipping/ShipmentsTable'
import { getErrorMessage } from '@/lib/api'

export default async function ShippingPage() {
  let stats: Awaited<ReturnType<typeof getShippingStats>> | null = null
  let shipments: Awaited<ReturnType<typeof listShipments>> = []
  let error = ''
  try {
    ;[stats, shipments] = await Promise.all([getShippingStats(), listShipments()])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load shipments.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Shipping</h2>
        <p className="text-sm text-slate-500 mt-0.5">Track shipments from booking to delivery</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Clock} label="Pending" value={String(stats.pending)} />
          <StatCard icon={Truck} label="In Transit" value={String(stats.inTransit)} />
          <StatCard icon={CheckCircle2} label="Delivered" value={String(stats.delivered)} />
          <StatCard icon={XCircle} label="Failed" value={String(stats.failed)} accent={stats.failed > 0} />
        </div>
      )}

      <ShipmentsTable shipments={shipments} />
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
    <div className={`bg-white border rounded-xl shadow-sm p-4 ${accent ? 'border-red-200' : 'border-slate-200'}`}>
      <div className={`flex items-center gap-2 ${accent ? 'text-red-500' : 'text-slate-400'}`}>
        <Icon className="w-4 h-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
