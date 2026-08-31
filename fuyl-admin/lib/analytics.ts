import { adminApiFetch, AdminApiError } from './api'

// ─── Shared date-range query param builder ───────────────────────────────────
function qs(params: Record<string, string | number | undefined>): string {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return p ? `?${p}` : ''
}

export interface DateRange {
  preset?: 'today' | '7d' | '30d' | '90d' | '365d'
  from?: string   // ISO date
  to?:   string   // ISO date
}

function rangeParams(range: DateRange): Record<string, string | number | undefined> {
  if (range.from && range.to) return { from: range.from, to: range.to }
  const presetDays: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 }
  return { days: presetDays[range.preset ?? '30d'] ?? 30 }
}

// ─── Raw shapes ──────────────────────────────────────────────────────────────
interface BackendTimeseriesPoint  { date: string; count: number; value: number }
interface BackendRevenuePoint     { date: string; revenue: number; orders: number }
interface BackendSummary          { revenueTotal: number; eventsByType: { _id: string; count: number }[] }
interface BackendOrderItem        { name: string; quantity: number; totalPrice: number }
interface BackendOrder            { items: BackendOrderItem[] }

// ─── Public types ────────────────────────────────────────────────────────────
export interface ChartPoint   { date: string; revenue: number; orders: number }
export interface AnalyticsSummary { revenue: number; avgOrderValue: number; orderCount: number }
export interface TopProduct   { name: string; unitsSold: number; revenue: number }

export interface FunnelStep {
  step:  string
  event: string
  count: number
}

export interface HeatmapCell {
  hour: number   // 0-23
  day:  number   // 1=Sun, 7=Sat
  count: number
}

export interface DeviceBreakdown {
  devices: { name: string; value: number }[]
  oses:    { name: string; value: number }[]
}

export interface UserActivityRow {
  sessionId:   string
  userId:      string | null
  pages:       string[]
  deviceType:  string
  os:          string
  lat:         number | null
  lng:         number | null
  city:        string | null
  lastSeen:    string
  startedAt:   string
  totalTimeMs: number
  eventCount:  number
  outcome:     'purchased' | 'abandoned' | 'browsed'
}

export interface GeoPoint {
  lat:   number
  lng:   number
  count: number
  city:  string | null
}

export interface CustomerSegments  { newCustomers: number; repeatCustomers: number }
export interface OrdersByStatusRow { status: string; count: number }

// ─── Revenue / sales ─────────────────────────────────────────────────────────
function formatChartDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })
}

export async function getRevenueChartData(range: DateRange = { preset: '30d' }, granularity: 'day' | 'week' | 'month' = 'day'): Promise<ChartPoint[]> {
  const series = await adminApiFetch<BackendRevenuePoint[]>(
    `/admin/analytics/revenue${qs({ ...rangeParams(range), granularity })}`
  )
  return series.map((p) => ({ date: formatChartDate(p.date), revenue: p.revenue, orders: p.orders }))
}

export async function getAnalyticsSummary(range: DateRange = { preset: '30d' }): Promise<AnalyticsSummary> {
  const summary = await adminApiFetch<BackendSummary>(
    `/admin/analytics/summary${qs(rangeParams(range))}`
  )
  const orderCount = summary.eventsByType.find((e) => e._id === 'order.placed')?.count ?? 0
  return {
    revenue: summary.revenueTotal,
    orderCount,
    avgOrderValue: orderCount > 0 ? Math.round(summary.revenueTotal / orderCount) : 0,
  }
}

export async function getCartAbandonmentCount(): Promise<number> {
  const { count } = await adminApiFetch<{ count: number }>('/admin/analytics/cart-abandonment')
  return count
}

export async function getTopProducts(limit = 10, range: DateRange = { preset: '30d' }): Promise<TopProduct[]> {
  return adminApiFetch<TopProduct[]>(
    `/admin/analytics/top-products${qs({ ...rangeParams(range), limit })}`
  )
}

// ─── Funnel ───────────────────────────────────────────────────────────────────
export async function getFunnel(range: DateRange = { preset: '30d' }): Promise<FunnelStep[]> {
  return adminApiFetch<FunnelStep[]>(
    `/admin/analytics/funnel${qs(rangeParams(range))}`
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
export async function getActivityHeatmap(range: DateRange = { preset: '30d' }): Promise<HeatmapCell[]> {
  return adminApiFetch<HeatmapCell[]>(
    `/admin/analytics/heatmap${qs(rangeParams(range))}`
  )
}

// ─── Devices / OS ─────────────────────────────────────────────────────────────
export async function getDeviceBreakdown(range: DateRange = { preset: '30d' }): Promise<DeviceBreakdown> {
  return adminApiFetch<DeviceBreakdown>(
    `/admin/analytics/devices${qs(rangeParams(range))}`
  )
}

// ─── User activity feed ───────────────────────────────────────────────────────
export async function getUserActivity(limit = 50, range: DateRange = { preset: '30d' }): Promise<UserActivityRow[]> {
  return adminApiFetch<UserActivityRow[]>(
    `/admin/analytics/user-activity${qs({ ...rangeParams(range), limit })}`
  )
}

// ─── Geography ────────────────────────────────────────────────────────────────
export async function getGeography(range: DateRange = { preset: '30d' }): Promise<GeoPoint[]> {
  return adminApiFetch<GeoPoint[]>(
    `/admin/analytics/geography${qs(rangeParams(range))}`
  )
}

// ─── Customer segments ────────────────────────────────────────────────────────
export async function getCustomerSegments(range: DateRange = { preset: '30d' }): Promise<CustomerSegments> {
  return adminApiFetch<CustomerSegments>(
    `/admin/analytics/customer-segments${qs(rangeParams(range))}`
  )
}

// ─── Orders by status ─────────────────────────────────────────────────────────
export async function getOrdersByStatus(range: DateRange = { preset: '30d' }): Promise<OrdersByStatusRow[]> {
  return adminApiFetch<OrdersByStatusRow[]>(
    `/admin/analytics/orders-by-status${qs(rangeParams(range))}`
  )
}

export { AdminApiError }
