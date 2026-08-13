'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { IndianRupee, ShoppingBag, TrendingUp, ShoppingCart, RefreshCw, AlertCircle, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardData } from '@/app/(admin)/analytics/actions'
import type { DateRange } from '@/lib/analytics'
import RevenueChart           from './RevenueChart'
import OrdersByStatusChart    from './OrdersByStatusChart'
import DeviceChart            from './DeviceChart'
import FunnelChart            from './FunnelChart'
import ActivityHeatmap        from './ActivityHeatmap'
import TopProductsChart       from './TopProductsChart'
import RepeatVsNewChart       from './RepeatVsNewChart'
import UserActivityTable      from './UserActivityTable'

// ─── Date-range preset pills ──────────────────────────────────────────────────
const PRESETS: { label: string; value: DateRange['preset'] }[] = [
  { label: 'Today',   value: 'today' },
  { label: '7 Days',  value: '7d'    },
  { label: '30 Days', value: '30d'   },
  { label: '3 Months',value: '90d'   },
  { label: '1 Year',  value: '365d'  },
]

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${accent} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  initial: DashboardData
  fetchData: (range: DateRange) => Promise<DashboardData>
}

export default function AnalyticsDashboard({ initial, fetchData }: Props) {
  const [data, setData]               = useState<DashboardData>(initial)
  const [range, setRange]             = useState<DateRange>({ preset: '30d' })
  const [customFrom, setCustomFrom]   = useState('')
  const [customTo, setCustomTo]       = useState('')
  const [showCustom, setShowCustom]   = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const load = useCallback((r: DateRange) => {
    startTransition(async () => {
      const next = await fetchData(r)
      setData(next)
      setLastRefreshed(new Date())
    })
  }, [fetchData])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(() => load(range), 60_000)
    return () => clearInterval(id)
  }, [range, load])

  const selectPreset = (preset: DateRange['preset']) => {
    setShowCustom(false)
    const r: DateRange = { preset }
    setRange(r)
    load(r)
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    const r: DateRange = { from: customFrom, to: customTo }
    setRange(r)
    setShowCustom(false)
    load(r)
  }

  const exportCSV = () => {
    const rows: string[][] = []

    rows.push(['=== Summary ==='])
    rows.push(['Metric', 'Value'])
    rows.push(['Total Revenue (₹)', String(data.summary.revenue)])
    rows.push(['Total Orders', String(data.summary.orderCount)])
    rows.push(['Avg Order Value (₹)', String(data.summary.avgOrderValue)])
    rows.push(['Abandoned Carts', String(data.cartAbandonment)])
    rows.push([])

    if (data.chartData.length) {
      rows.push(['=== Revenue Over Time ==='])
      rows.push(['Date', 'Revenue (₹)', 'Orders'])
      data.chartData.forEach((p) => rows.push([p.date, String(p.revenue), String(p.orders)]))
      rows.push([])
    }

    if (data.topProducts.length) {
      rows.push(['=== Top Products ==='])
      rows.push(['Product', 'Units Sold', 'Revenue (₹)'])
      data.topProducts.forEach((p) => rows.push([p.name, String(p.unitsSold), String(p.revenue)]))
      rows.push([])
    }

    if (data.ordersByStatus.length) {
      rows.push(['=== Orders by Status ==='])
      rows.push(['Status', 'Count'])
      data.ordersByStatus.forEach((o) => rows.push([o.status, String(o.count)]))
    }

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { summary, chartData, topProducts, funnel, heatmap, devices,
          userActivity, customerSegments, ordersByStatus,
          cartAbandonment, error } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Refreshed {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · auto-updates every 60s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => load(range)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => selectPreset(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              range.preset === p.value && !showCustom
                ? 'bg-[#558476] border-[#558476] text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-[#558476]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            showCustom || range.from
              ? 'bg-[#558476] border-[#558476] text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-[#558476]'
          }`}
        >
          Custom Range
        </button>
        {isPending && <span className="text-xs text-slate-400 animate-pulse">Loading…</span>}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#558476]" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#558476]" />
          <button type="button" onClick={applyCustom}
            className="px-4 py-2 bg-[#558476] text-white text-sm rounded-lg hover:bg-[#457366] transition-colors">
            Apply
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={IndianRupee} label="Total Revenue"     value={formatCurrency(summary.revenue)}       accent="bg-[#558476]/10 text-[#558476]" />
        <KpiCard icon={ShoppingBag} label="Total Orders"      value={summary.orderCount.toLocaleString()}   accent="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp}  label="Avg Order Value"   value={formatCurrency(summary.avgOrderValue)} accent="bg-amber-50 text-amber-600" />
        <KpiCard icon={ShoppingCart} label="Abandoned Carts"  value={cartAbandonment.toLocaleString()}      accent="bg-red-50 text-red-500" />
      </div>

      {/* Row: Revenue + Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart        data={chartData} />
        <OrdersByStatusChart data={ordersByStatus} />
      </div>

      {/* Funnel (full width) */}
      <FunnelChart data={funnel} />

      {/* Row: Device + Repeat vs New */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeviceChart    data={devices} />
        <RepeatVsNewChart data={customerSegments} />
      </div>

      {/* Activity Heatmap (full width) */}
      <ActivityHeatmap data={heatmap} />

      {/* Top Products */}
      <TopProductsChart data={topProducts} />

      {/* User Activity Table (full width) */}
      <UserActivityTable data={userActivity} />
    </div>
  )
}
