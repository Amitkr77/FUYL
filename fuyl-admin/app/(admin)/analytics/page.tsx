import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { fetchDashboardData } from './actions'

// Revalidate every 60 seconds so the initial server-side load stays fresh.
export const revalidate = 60

export default async function AnalyticsPage() {
  const initial = await fetchDashboardData({ preset: '30d' })

  return <AnalyticsDashboard initial={initial} fetchData={fetchDashboardData} />
}
