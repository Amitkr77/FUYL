'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, TrendingUp, MousePointerClick, ShoppingBag, Coins } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { getAffiliateDashboard, createAffiliateLink, type AffiliateDashboard, type CommissionStatus } from '@/lib/api/affiliate'
import { getErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'

const STATUS_STYLE: Record<CommissionStatus, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-100',
  approved:  'bg-blue-50 text-blue-700 border-blue-100',
  payable:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  paid:      'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
  reversed:  'bg-red-50 text-red-600 border-red-100',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title="Copy link"
      className="p-1.5 rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/40 transition-colors"
    >
      {copied ? <Check size={14} className="text-brand-teal" /> : <Copy size={14} />}
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-brand-border rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

export default function AffiliateDashboardPage() {
  const { token, user } = useAuthStore()
  const [data, setData] = useState<AffiliateDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New link form
  const [newDest, setNewDest] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (!token) return
    getAffiliateDashboard(token)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, 'Could not load affiliate data.')))
      .finally(() => setLoading(false))
  }, [token])

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newDest.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const link = await createAffiliateLink(token, { destination: newDest.trim(), label: newLabel.trim() || undefined })
      setData((d) => d ? { ...d, links: [...d.links, link] } : d)
      setNewDest('')
      setNewLabel('')
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Could not create link.'))
    } finally {
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-body-md text-brand-muted mb-4">Sign in to access your affiliate dashboard.</p>
        <Link href="/account" className="text-brand-teal font-semibold hover:text-brand-forest transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-display-lg font-display text-brand-forest">AFFILIATE</h1>
        <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
        {error.toLowerCase().includes('not found') && (
          <div className="bg-brand-cream border border-brand-border rounded-2xl p-6">
            <p className="text-body-md text-brand-forest mb-4">
              You don't have an affiliate account yet.
            </p>
            <Link
              href="/affiliate/apply"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-forest text-white text-body-sm font-semibold rounded-xl hover:bg-brand-forest/90 transition-colors"
            >
              Apply to become an affiliate
              <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (!data) return null

  const { affiliate, links, commissions, stats } = data

  const statCards = [
    { label: 'Total Clicks',   value: stats.totalClicks.toLocaleString('en-IN'),      icon: MousePointerClick },
    { label: 'Orders Referred',value: stats.totalOrders.toLocaleString('en-IN'),      icon: ShoppingBag },
    { label: 'Revenue',        value: formatPrice(stats.totalRevenue),                icon: TrendingUp },
    { label: 'Commission',     value: formatPrice(stats.totalCommissionEarned),        icon: Coins },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-lg font-display text-brand-forest">AFFILIATE</h1>
        <p className="text-body-sm text-brand-muted mt-0.5">
          Welcome back, {affiliate.name} ·{' '}
          <span className="capitalize font-medium" style={{ color: affiliate.status === 'approved' ? '#10B981' : '#F59E0B' }}>
            {affiliate.status}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-brand-muted mb-2">
              <Icon size={13} />
              <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-display-sm font-display text-brand-forest">{value}</p>
          </div>
        ))}
      </div>

      {/* Tracking links */}
      <section className="space-y-3">
        <h2 className="text-label font-semibold text-brand-forest uppercase tracking-wide">Tracking Links</h2>

        {links.length > 0 && (
          <div className="bg-white border border-brand-border rounded-xl divide-y divide-brand-border/50">
            {links.map((link) => (
              <div key={link._id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  {link.label && (
                    <p className="text-body-xs font-semibold text-brand-forest mb-0.5">{link.label}</p>
                  )}
                  <p className="text-body-xs text-brand-muted font-mono truncate">{link.trackingUrl}</p>
                </div>
                <CopyButton text={link.trackingUrl} />
                <a
                  href={link.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/40 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Create link form */}
        <form onSubmit={handleCreateLink} className="bg-brand-cream border border-brand-border rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">New tracking link</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Destination path  e.g. /products/daily-greens"
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              className="flex-1 h-9 px-3 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-32 h-9 px-3 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
            />
            <Button type="submit" variant="primary" size="sm" loading={creating} disabled={!newDest.trim()}>
              Create
            </Button>
          </div>
          {createError && (
            <p className="text-body-xs text-red-600">{createError}</p>
          )}
        </form>
      </section>

      {/* Commissions */}
      <section className="space-y-3">
        <h2 className="text-label font-semibold text-brand-forest uppercase tracking-wide">Commissions</h2>

        {commissions.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-xl p-8 text-center text-brand-muted text-body-sm">
            No commissions yet — share your link to start earning!
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-brand-border rounded-xl">
            <table className="w-full text-body-xs">
              <thead>
                <tr className="border-b border-brand-border/60 bg-brand-cream/60">
                  <th className="text-left px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Order</th>
                  <th className="text-right px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Base</th>
                  <th className="text-right px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Rate</th>
                  <th className="text-right px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Commission</th>
                  <th className="text-left px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Status</th>
                  <th className="text-left px-4 py-3 text-label uppercase tracking-wide text-brand-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {commissions.map((c) => (
                  <tr key={c._id} className="hover:bg-brand-cream/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-brand-muted">
                      {c.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-muted">
                      {formatPrice(c.baseAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-muted">
                      {c.snapshotRate}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-forest">
                      {formatPrice(c.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${STATUS_STYLE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-muted">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
