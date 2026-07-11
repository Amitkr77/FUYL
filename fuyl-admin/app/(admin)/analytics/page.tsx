import { IndianRupee, ShoppingBag, Calendar, AlertCircle } from 'lucide-react'
import AnalyticsRevenueChart from '@/components/analytics/RevenueChart'
import OrdersChart from '@/components/analytics/OrdersChart'
import { formatCurrency } from '@/lib/utils'
import { getAnalyticsSummary, getRevenueChartData, getTopProducts, AdminApiError } from '@/lib/analytics'

const DAYS = 7

export default async function AnalyticsPage() {
  let summary: Awaited<ReturnType<typeof getAnalyticsSummary>> | null = null
  let chartData: Awaited<ReturnType<typeof getRevenueChartData>> = []
  let topProducts: Awaited<ReturnType<typeof getTopProducts>> = []
  let error = ''

  try {
    ;[summary, chartData, topProducts] = await Promise.all([
      getAnalyticsSummary(DAYS),
      getRevenueChartData(DAYS),
      getTopProducts(3),
    ])
  } catch (err) {
    error = err instanceof AdminApiError ? err.message : 'Could not load analytics.'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Business performance insights</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          Last {DAYS} days
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards — Conversion Rate and Traffic Sources were dropped:
          no pageview/session tracking exists anywhere in the backend, so
          there was no real data behind either (see the integration audit's
          note on analytics ingestion). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#558476]/10 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[#558476]" />
            </div>
            <p className="text-sm text-slate-500">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary ? formatCurrency(summary.revenue) : '—'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Avg Order Value</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary ? formatCurrency(summary.avgOrderValue) : '—'}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsRevenueChart data={chartData} />
        <OrdersChart data={chartData} />
      </div>

      {/* Top Products — computed from real order line items (no analytics
          endpoint aggregates by product), not from the analytics module directly */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Top Products</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-slate-400">No order data yet.</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={product.name} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-600">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.unitsSold} units sold</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 flex-shrink-0">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
