import { AlertCircle } from 'lucide-react'
import { OrdersTable, ExportButton } from '@/components/orders/OrdersTable'
import { listAdminOrders } from '@/lib/orders'
import { getErrorMessage } from '@/lib/api'

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof listAdminOrders>> = []
  let error = ''
  try {
    orders = await listAdminOrders()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load orders.')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <ExportButton />
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
