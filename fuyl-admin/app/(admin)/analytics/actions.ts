'use server'

import {
  getAnalyticsSummary, getRevenueChartData, getTopProducts,
  getFunnel, getActivityHeatmap, getDeviceBreakdown,
  getUserActivity, getCustomerSegments,
  getOrdersByStatus, getCartAbandonmentCount,
  type DateRange, type AnalyticsSummary, type ChartPoint,
  type TopProduct, type FunnelStep, type HeatmapCell,
  type DeviceBreakdown, type UserActivityRow,
  type CustomerSegments, type OrdersByStatusRow,
} from '@/lib/analytics'
import { getErrorMessage } from '@/lib/api'

export interface DashboardData {
  summary:          AnalyticsSummary
  chartData:        ChartPoint[]
  topProducts:      TopProduct[]
  funnel:           FunnelStep[]
  heatmap:          HeatmapCell[]
  devices:          DeviceBreakdown
  userActivity:     UserActivityRow[]
  customerSegments: CustomerSegments
  ordersByStatus:   OrdersByStatusRow[]
  cartAbandonment:  number
  error:            string
}

export async function fetchDashboardData(range: DateRange): Promise<DashboardData> {
  const empty: DashboardData = {
    summary:          { revenue: 0, avgOrderValue: 0, orderCount: 0 },
    chartData:        [],
    topProducts:      [],
    funnel:           [],
    heatmap:          [],
    devices:          { devices: [], oses: [] },
    userActivity:     [],
    customerSegments: { newCustomers: 0, repeatCustomers: 0 },
    ordersByStatus:   [],
    cartAbandonment:  0,
    error:            '',
  }

  try {
    const [
      summary, chartData, topProducts, funnel, heatmap, devices,
      userActivity, customerSegments, ordersByStatus, cartAbandonment,
    ] = await Promise.all([
      getAnalyticsSummary(range),
      getRevenueChartData(range),
      getTopProducts(8, range),
      getFunnel(range),
      getActivityHeatmap(range),
      getDeviceBreakdown(range),
      getUserActivity(50, range),
      getCustomerSegments(range),
      getOrdersByStatus(range),
      getCartAbandonmentCount(),
    ])

    return { ...empty, summary, chartData, topProducts, funnel, heatmap, devices, userActivity, customerSegments, ordersByStatus, cartAbandonment }
  } catch (err) {
    return { ...empty, error: getErrorMessage(err, 'Could not load analytics data.') }
  }
}
