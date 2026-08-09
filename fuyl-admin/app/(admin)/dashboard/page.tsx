import {
  ArrowRight, Clock, Plus, FileText, BarChart2,
  Settings, LayoutGrid, AlertCircle, ShoppingCart,
  ChevronRight, Package,
} from 'lucide-react'
import Link from 'next/link'
import RevenueChart from '@/components/dashboard/RevenueChart'
import { formatCurrency, formatDate } from '@/lib/utils'
import { adminApiFetch, getErrorMessage } from '@/lib/api'
import { listAdminOrders, type OrderStatus } from '@/lib/orders'
import {
  getRevenueChartData,
  getAnalyticsSummary,
  getOrdersByStatus,
  type ChartPoint,
  type OrdersByStatusRow,
} from '@/lib/analytics'

// ── Status presentation ───────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pending:    'bg-amber-400',
  confirmed:  'bg-blue-500',
  packed:     'bg-blue-400',
  dispatched: 'bg-sky-500',
  shipped:    'bg-sky-400',
  in_transit: 'bg-teal-500',
  delivered:  'bg-emerald-500',
  completed:  'bg-emerald-600',
  cancelled:  'bg-rose-400',
  returned:   'bg-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'Dispatched', shipped: 'Shipped', in_transit: 'In Transit',
  delivered: 'Delivered', completed: 'Completed',
  cancelled: 'Cancelled', returned: 'Returned',
}

const STATUS_TEXT: Record<string, string> = {
  pending:    'text-amber-700 bg-amber-50',
  confirmed:  'text-blue-700 bg-blue-50',
  packed:     'text-blue-700 bg-blue-50',
  dispatched: 'text-sky-700 bg-sky-50',
  shipped:    'text-sky-700 bg-sky-50',
  in_transit: 'text-teal-700 bg-teal-50',
  delivered:  'text-emerald-700 bg-emerald-50',
  completed:  'text-emerald-700 bg-emerald-50',
  cancelled:  'text-rose-600 bg-rose-50',
  returned:   'text-slate-600 bg-slate-100',
}

// ── Order status groups ───────────────────────────────────────────────────────

type StatusGroup = { label: string; bar: string; dot: string; statuses: OrderStatus[] }

const STATUS_GROUPS: StatusGroup[] = [
  { label: 'Pending',   bar: 'bg-amber-400',   dot: 'bg-amber-400',   statuses: ['pending'] },
  { label: 'Active',    bar: 'bg-blue-500',    dot: 'bg-blue-500',    statuses: ['confirmed', 'packed', 'dispatched', 'shipped', 'in_transit'] },
  { label: 'Delivered', bar: 'bg-emerald-500', dot: 'bg-emerald-500', statuses: ['delivered', 'completed'] },
  { label: 'Cancelled', bar: 'bg-rose-400',    dot: 'bg-rose-400',    statuses: ['cancelled', 'returned'] },
]

function groupOrderStatus(rows: OrdersByStatusRow[]) {
  return STATUS_GROUPS.map((g) => ({
    ...g,
    count: rows
      .filter((r) => g.statuses.includes(r.status as OrderStatus))
      .reduce((s, r) => s + r.count, 0),
  }))
}

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Add Product', href: '/products',  Icon: Plus,        color: 'text-emerald-600', bg: 'bg-emerald-50'  },
  { label: 'Orders',      href: '/orders',    Icon: ShoppingCart,color: 'text-blue-600',    bg: 'bg-blue-50'     },
  { label: 'Content',     href: '/content',   Icon: LayoutGrid,  color: 'text-violet-600',  bg: 'bg-violet-50'   },
  { label: 'Blog',        href: '/blog',      Icon: FileText,    color: 'text-amber-600',   bg: 'bg-amber-50'    },
  { label: 'Analytics',   href: '/analytics', Icon: BarChart2,   color: 'text-rose-600',    bg: 'bg-rose-50'     },
  { label: 'Settings',    href: '/settings',  Icon: Settings,    color: 'text-slate-500',   bg: 'bg-slate-100'   },
]

// ── Hero metric borders (2-col mobile / 4-col desktop) ────────────────────────
// Each string is appended to the metric cell's className.
const METRIC_CELL_BORDERS = [
  'border-b border-r border-white/[0.07]',                                          // top-left
  'border-b border-white/[0.07] lg:border-r lg:border-white/[0.07]',               // top-right → add right on desktop
  'border-r border-white/[0.07] lg:border-r lg:border-white/[0.07]',               // bot-left  → keep right on desktop
  '',                                                                               // bot-right → no borders
]

// ── Data types ────────────────────────────────────────────────────────────────

interface AdminOverview {
  users:   { total: number }
  orders:  { total: number }
  revenue: { last30d: number }
  catalog: { productsTotal: number }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const now     = new Date()
  const hour    = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today   = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // ── Fetches (all non-fatal) ──────────────────────────────────────────────

  let overview: AdminOverview | null = null
  let overviewError = ''
  try { overview = await adminApiFetch<AdminOverview>('/admin/overview') }
  catch (err) { overviewError = getErrorMessage(err, 'Could not load stats.') }

  let summary = { revenue: 0, avgOrderValue: 0, orderCount: 0 }
  try { summary = await getAnalyticsSummary({ preset: '30d' }) }
  catch { /* non-fatal */ }

  let allOrders: Awaited<ReturnType<typeof listAdminOrders>> = []
  try { allOrders = await listAdminOrders() }
  catch { /* non-fatal */ }

  const recentOrders = allOrders.slice(0, 5)
  const pendingCount = allOrders.filter((o) => o.status === 'pending').length

  let chartData: ChartPoint[] = []
  try { chartData = await getRevenueChartData({ preset: '7d' }) }
  catch { /* non-fatal */ }

  let statusRows: OrdersByStatusRow[] = []
  try { statusRows = await getOrdersByStatus({ preset: '30d' }) }
  catch { /* non-fatal */ }

  const statusGroups = groupOrderStatus(statusRows)
  const statusTotal  = statusGroups.reduce((s, g) => s + g.count, 0)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {overviewError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {overviewError}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════════╗ */}
      {/* ║  HERO  —  dark command-center strip                              ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════════╝ */}
      <div className="relative bg-[#12291F] rounded-2xl overflow-hidden">
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Soft right-edge glow */}
        <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-[#558476]/20 blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-5">
            <div>
              <p className="text-[#7aab95] text-xs font-medium tabular-nums">{today}</p>
              <h2 className="text-white text-xl sm:text-2xl font-bold mt-0.5 tracking-tight">
                {greeting}
              </h2>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {pendingCount > 0 && (
                <Link
                  href="/orders?status=pending"
                  className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold hover:text-amber-300 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {pendingCount} pending
                </Link>
              )}
              <Link
                href="/analytics"
                className="hidden sm:flex items-center gap-1 text-[#7aab95] text-xs font-medium hover:text-white transition-colors"
              >
                Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="flex items-center gap-1.5 text-white/25 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/[0.07]">
            {[
              {
                label:    'Revenue · 30d',
                value:    overview ? formatCurrency(overview.revenue.last30d) : '—',
                sub:      summary.orderCount > 0 ? `${summary.orderCount} orders this period` : null,
                subClass: 'text-white/30',
              },
              {
                label:    'Total Orders',
                value:    overview ? overview.orders.total.toLocaleString('en-IN') : '—',
                sub:      pendingCount > 0 ? `${pendingCount} need attention` : 'All fulfilled',
                subClass: pendingCount > 0 ? 'text-amber-400' : 'text-white/30',
              },
              {
                label:    'Customers',
                value:    overview ? overview.users.total.toLocaleString('en-IN') : '—',
                sub:      'Registered accounts',
                subClass: 'text-white/30',
              },
              {
                label:    'Avg Order Value',
                value:    summary.avgOrderValue > 0 ? formatCurrency(summary.avgOrderValue) : '—',
                sub:      'Last 30 days',
                subClass: 'text-white/30',
              },
            ].map((m, i) => (
              <div
                key={m.label}
                className={`px-6 sm:px-8 py-5 sm:py-6 lg:border-b-0 ${METRIC_CELL_BORDERS[i]}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2.5">
                  {m.label}
                </p>
                <p className="text-[26px] sm:text-[28px] font-bold text-white leading-none tabular-nums">
                  {m.value}
                </p>
                {m.sub && (
                  <p className={`text-xs mt-2 ${m.subClass}`}>{m.sub}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart + Order status ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Revenue chart */}
        <div className="xl:col-span-2">
          <RevenueChart data={chartData} />
        </div>

        {/* Order status breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Order Status</h3>
              <p className="text-sm text-slate-400 mt-0.5">30-day breakdown</p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-medium text-[#558476] hover:text-[#457366] transition-colors"
            >
              View all
            </Link>
          </div>

          {statusTotal === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No orders in this period</p>
            </div>
          ) : (
            <>
              {/* Stacked horizontal bar */}
              <div className="h-2.5 rounded-full overflow-hidden flex gap-px mb-5">
                {statusGroups
                  .filter((g) => g.count > 0)
                  .map((g) => (
                    <div
                      key={g.label}
                      className={`h-full first:rounded-l-full last:rounded-r-full ${g.bar}`}
                      style={{ width: `${(g.count / statusTotal) * 100}%` }}
                      title={`${g.label}: ${g.count}`}
                    />
                  ))}
              </div>

              {/* Legend rows */}
              <div className="space-y-3 flex-1">
                {statusGroups.map((g) => {
                  const pct = statusTotal > 0
                    ? Math.round((g.count / statusTotal) * 100)
                    : 0
                  return (
                    <div key={g.label} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${g.dot}`} />
                      <span className="text-sm text-slate-600 flex-1">{g.label}</span>
                      <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums w-10 text-right">
                        {g.count.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total orders</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {statusTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent orders + Quick actions ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent orders — row-list (no boring <table>) */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Orders</h3>
              <p className="text-sm text-slate-400 mt-0.5">Latest 5 placed</p>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#558476] hover:text-[#457366] transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center px-6">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No orders yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Orders will appear here as customers place them
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentOrders.map((order) => {
                const dot   = STATUS_DOT[order.status]  ?? 'bg-slate-400'
                const label = STATUS_LABEL[order.status] ?? order.status
                const pill  = STATUS_TEXT[order.status]  ?? 'text-slate-600 bg-slate-100'
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="group flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

                    {/* Order + customer */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#558476] group-hover:text-[#457366] transition-colors">
                          {order.orderNumber}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${pill}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {order.customerName}
                        {order.phone ? ` · ${order.phone}` : ''}
                      </p>
                    </div>

                    {/* Amount + date */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                        {formatDate(order.date)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions — 2×3 icon card grid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Quick Actions</h3>
          <p className="text-sm text-slate-400 mb-4">Jump to common tasks</p>

          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {QUICK_ACTIONS.map(({ label, href, Icon, color, bg }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col items-center justify-center gap-2.5 py-5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/80 hover:-translate-y-0.5 transition-all text-center overflow-hidden"
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${bg}`}
                  style={{ opacity: 0 }}
                  aria-hidden
                />
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="relative text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
