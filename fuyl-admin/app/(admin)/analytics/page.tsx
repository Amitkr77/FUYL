'use client'

import { IndianRupee, ShoppingBag, TrendingUp, Calendar } from 'lucide-react'
import AnalyticsRevenueChart from '@/components/analytics/RevenueChart'
import OrdersChart from '@/components/analytics/OrdersChart'
import { MOCK_PRODUCTS } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

const TOP_PRODUCTS = [
  { name: 'FUYL COMPLETE+', unitsSold: 89, revenue: 133411 },
  { name: 'FUYL COMPLETE+ (30 sachets)', unitsSold: 56, revenue: 151144 },
  { name: 'FUYL STARTER PACK', unitsSold: 44, revenue: 43956 },
]

const TRAFFIC_SOURCES = [
  { source: 'Direct', percentage: 40, color: 'bg-[#558476]' },
  { source: 'Instagram', percentage: 30, color: 'bg-[#B76E79]' },
  { source: 'Google', percentage: 20, color: 'bg-blue-500' },
  { source: 'Referral', percentage: 10, color: 'bg-amber-500' },
]

export default function AnalyticsPage() {
  const totalRevenue = 182400
  const avgOrderValue = Math.round(totalRevenue / 121)

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
          Last 7 days
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#558476]/10 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[#558476]" />
            </div>
            <p className="text-sm text-slate-500">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">+18.2% vs prev week</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500">Avg Order Value</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(avgOrderValue)}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">+4.3% vs prev week</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-sm text-slate-500">Conversion Rate</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">3.8%</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">+0.6% vs prev week</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsRevenueChart />
        <OrdersChart />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Top Products</h3>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((product, i) => (
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

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Showing top {TOP_PRODUCTS.length} of {MOCK_PRODUCTS.length} products</p>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {TRAFFIC_SOURCES.map((source) => (
              <div key={source.source}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-700">{source.source}</span>
                  <span className="text-sm font-semibold text-slate-900">{source.percentage}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${source.color}`}
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-3">
              {TRAFFIC_SOURCES.map((source) => (
                <div key={source.source} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${source.color}`} />
                  <span className="text-xs text-slate-500">{source.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
