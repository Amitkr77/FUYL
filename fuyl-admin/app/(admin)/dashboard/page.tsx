import { IndianRupee, ShoppingCart, Users, Package, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import StatsCard from '@/components/ui/StatsCard'
import Badge from '@/components/ui/Badge'
import RevenueChart from '@/components/dashboard/RevenueChart'
import { formatCurrency, formatDate } from '@/lib/utils'
import { adminApiFetch, AdminApiError } from '@/lib/api'
import { listAdminOrders, type OrderStatus } from '@/lib/orders'
import { getRevenueChartData, type ChartPoint } from '@/lib/analytics'

const statusVariant = (status: OrderStatus) => {
  switch (status) {
    case 'completed': return 'success'
    case 'delivered': return 'success'
    case 'shipped': return 'info'
    case 'confirmed': return 'info'
    case 'packed': return 'warning'
    case 'pending': return 'default'
    case 'cancelled': return 'danger'
    case 'returned': return 'danger'
    default: return 'default'
  }
}

interface AdminOverview {
  users: { total: number }
  orders: { total: number }
  revenue: { last30d: number }
  catalog: { productsTotal: number }
}

export default async function DashboardPage() {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  let overview: AdminOverview | null = null
  let overviewError = ''
  try {
    overview = await adminApiFetch<AdminOverview>('/admin/overview')
  } catch (err) {
    overviewError = err instanceof AdminApiError ? err.message : 'Could not load dashboard stats.'
  }

  let recentOrders: Awaited<ReturnType<typeof listAdminOrders>> = []
  try {
    recentOrders = (await listAdminOrders()).slice(0, 5)
  } catch {
    // Non-fatal — the rest of the dashboard still renders.
  }

  let chartData: ChartPoint[] = []
  try {
    chartData = await getRevenueChartData(7)
  } catch {
    // Non-fatal — chart just renders empty.
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
      </div>

      {/* Stats Grid */}
      {overviewError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {overviewError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          icon={IndianRupee}
          label="Revenue (30d)"
          value={overview ? formatCurrency(overview.revenue.last30d) : '—'}
          iconColor="text-[#558476]"
          iconBg="bg-[#558476]/10"
        />
        <StatsCard
          icon={ShoppingCart}
          label="Total Orders"
          value={overview ? overview.orders.total.toLocaleString('en-IN') : '—'}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatsCard
          icon={Users}
          label="Total Customers"
          value={overview ? overview.users.total.toLocaleString('en-IN') : '—'}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatsCard
          icon={Package}
          label="Products"
          value={overview ? overview.catalog.productsTotal.toString() : '—'}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart data={chartData} />

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders - spans 2/3 */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Orders</h3>
              <p className="text-sm text-slate-500 mt-0.5">Latest 5 orders</p>
            </div>
            <Link
              href="/orders"
              className="flex items-center gap-1 text-sm text-[#558476] hover:text-[#457366] font-medium transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Total</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900">{order.customerName}</p>
                      <p className="text-xs text-slate-400">{order.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{formatDate(order.date)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Product', href: '/products', color: 'bg-[#558476]/10 text-[#558476] hover:bg-[#558476]/20' },
              { label: 'View All Orders', href: '/orders', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { label: 'Manage Content', href: '/content', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
              { label: 'Write Blog Post', href: '/blog', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              { label: 'View Analytics', href: '/analytics', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
              { label: 'Settings', href: '/settings', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${action.color}`}
              >
                {action.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
