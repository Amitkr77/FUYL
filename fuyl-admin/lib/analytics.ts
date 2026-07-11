import { adminApiFetch, AdminApiError } from './api'

// ─── Backend raw shapes ──────────────────────────────────────────────────
interface BackendTimeseriesPoint { date: string; count: number; value: number }
interface BackendSummary {
  revenueTotal: number
  eventsByType: { _id: string; count: number }[]
}
interface BackendOrderItem { name: string; quantity: number; totalPrice: number }
interface BackendOrder { items: BackendOrderItem[] }

export interface ChartPoint { date: string; revenue: number; orders: number }
export interface AnalyticsSummary { revenue: number; avgOrderValue: number; orderCount: number }
export interface TopProduct { name: string; unitsSold: number; revenue: number }

function formatChartDate(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD' (backend's $dateToString format)
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })
}

// order.placed events carry value = order.grandTotal (verified in
// order.service.ts's eventBus.publish call) — one endpoint covers both the
// revenue chart and the orders-volume chart.
export async function getRevenueChartData(days = 7): Promise<ChartPoint[]> {
  const series = await adminApiFetch<BackendTimeseriesPoint[]>(`/admin/analytics/timeseries/order.placed?days=${days}`)
  return series.map((p) => ({ date: formatChartDate(p.date), revenue: p.value, orders: p.count }))
}

export async function getAnalyticsSummary(days = 7): Promise<AnalyticsSummary> {
  const summary = await adminApiFetch<BackendSummary>(`/admin/analytics/summary?days=${days}`)
  const orderCount = summary.eventsByType.find((e) => e._id === 'order.placed')?.count ?? 0
  return {
    revenue: summary.revenueTotal,
    orderCount,
    avgOrderValue: orderCount > 0 ? Math.round(summary.revenueTotal / orderCount) : 0,
  }
}

// No analytics endpoint aggregates by product — this is computed from real
// order data (the same /admin/orders endpoint Task 4 wired), not fabricated.
export async function getTopProducts(limit = 3): Promise<TopProduct[]> {
  const orders = await adminApiFetch<BackendOrder[]>('/admin/orders?limit=50')
  const byProduct = new Map<string, TopProduct>()
  for (const order of orders) {
    for (const item of order.items) {
      const existing = byProduct.get(item.name) ?? { name: item.name, unitsSold: 0, revenue: 0 }
      existing.unitsSold += item.quantity
      existing.revenue += item.totalPrice
      byProduct.set(item.name, existing)
    }
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export { AdminApiError }
