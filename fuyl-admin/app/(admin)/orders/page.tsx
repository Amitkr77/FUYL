import { AlertCircle, Banknote, Clock3, PackageCheck, ShoppingBag } from 'lucide-react'
import { OrdersTable, ExportButton } from '@/components/orders/OrdersTable'
import { listAdminOrders } from '@/lib/orders'
import { getErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof listAdminOrders>> = []
  let error = ''
  try {
    orders = await listAdminOrders()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load orders.')
  }

  const revenue = orders.filter((o) => !['cancelled', 'returned'].includes(o.status)).reduce((sum, o) => sum + o.total, 0)
  const awaitingAction = orders.filter((o) => ['pending', 'confirmed', 'packed'].includes(o.status)).length
  const fulfilled = orders.filter((o) => ['delivered', 'completed'].includes(o.status)).length
  const stats = [
    { label: 'Total orders', value: String(orders.length), Icon: ShoppingBag, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Order value', value: formatCurrency(revenue), Icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Awaiting action', value: String(awaitingAction), Icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Fulfilled', value: String(fulfilled), Icon: PackageCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">Review, fulfil, track, and export customer orders</p>
        </div>
        <ExportButton orders={orders} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-[18px] h-[18px] ${color}`} /></div>
            <div className="min-w-0"><p className="text-xl font-bold text-slate-800 leading-none truncate">{value}</p><p className="text-xs text-slate-400 mt-1">{label}</p></div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <OrdersTable orders={orders} />
    </div>
  )
}
