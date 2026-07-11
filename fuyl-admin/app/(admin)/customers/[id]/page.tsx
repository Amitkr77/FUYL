import Link from 'next/link'
import { ArrowLeft, ShoppingBag, IndianRupee, TrendingUp, Mail } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { getCustomer } from '@/lib/customers'
import type { OrderStatus } from '@/lib/orders'
import { formatCurrency, formatDate } from '@/lib/utils'

const statusVariant = (s: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const map: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    completed: 'success', delivered: 'success', shipped: 'info', confirmed: 'info',
    packed: 'warning', pending: 'default', cancelled: 'danger', returned: 'danger',
  }
  return map[s]
}

const AVATAR_COLORS = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Customer not found</p>
        <p className="text-slate-500 text-sm">No customer with ID &quot;{id}&quot; exists.</p>
      </div>
    )
  }

  const avgOrder = customer.orders > 0 ? Math.round(customer.totalSpent / customer.orders) : 0
  const initials = customer.name.split(' ').map((n) => n[0]).join('').toUpperCase()
  const avatarColor = AVATAR_COLORS[customer.id.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Profile</h2>
          <p className="text-sm text-slate-500">Member since {formatDate(customer.joined)}</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900">{customer.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
              <Mail className="w-4 h-4" />
              {customer.email}
            </div>
            {customer.phone && <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>}
          </div>
          <a
            href={`mailto:${customer.email}`}
            className="px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Send Email
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#558476]/10 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#558476]" />
            </div>
            <p className="text-sm text-slate-500">Total Orders</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{customer.orders}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Total Spent</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-sm text-slate-500">Avg Order Value</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(avgOrder)}</p>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Order History</h3>
          <p className="text-xs text-slate-400 mt-0.5">{customer.orderHistory.length} orders found for this customer</p>
        </div>
        {customer.orderHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No orders found for this customer</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Order #', 'Date', 'Items', 'Total', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customer.orderHistory.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(order.date)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{order.itemCount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/orders/${order.id}`} className="text-xs text-[#558476] hover:underline font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
