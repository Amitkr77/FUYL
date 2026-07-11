'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Mail, MessageCircle, Share2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import {
  getReferralDashboard, generateReferralCode, shareReferral,
  type ReferralDashboard,
} from '@/lib/api/referrals'

const STATUS_LABEL: Record<string, string> = {
  shared: 'Shared', applied: 'Signed up', pending: 'Pending first order',
  eligible: 'Pending first order', rewarded: 'Reward earned', completed: 'Reward earned', rejected: 'Not eligible',
}

export function ReferAndEarnClient() {
  const { token, user } = useAuthStore()
  const [dash, setDash] = useState<ReferralDashboard | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  const load = () => {
    if (!token) { setLoading(false); return }
    setLoading(true)
    getReferralDashboard(token)
      .then(setDash)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your referral dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const handleGenerate = async () => {
    if (!token) return
    setError('')
    try {
      await generateReferralCode(token)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a referral code')
    }
  }

  const handleCopy = () => {
    if (!dash?.shareLink) return
    navigator.clipboard.writeText(dash.shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async (channel: 'whatsapp' | 'email') => {
    if (!token) return
    try {
      const result = await shareReferral(token, channel)
      setShareMsg('')
      if (channel === 'whatsapp' && result.link) {
        window.open(`https://wa.me/?text=${encodeURIComponent(result.message ?? result.link)}`, '_blank')
      } else if (channel === 'email' && result.link) {
        window.location.href = `mailto:?subject=${encodeURIComponent(result.subject ?? 'Try FUYL')}&body=${encodeURIComponent(result.body ?? result.link)}`
      }
    } catch (err) {
      setShareMsg(err instanceof Error ? err.message : 'Could not open share')
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Page header */}
      <div className="bg-white border-b border-brand-border">
        <div className="container-brand py-8">
          <span className="inline-block rounded-full px-3 py-1 bg-brand-teal/10 text-brand-teal text-label mb-3">
            Ambassador Programme
          </span>
          <h1 className="text-display-xl font-display text-brand-forest">REFER &amp; EARN</h1>
          <p className="text-brand-muted text-body-sm mt-2 max-w-xl">
            Share FUYL with friends and family and earn wallet credit on every order placed through your link.
          </p>
        </div>
      </div>

      <div className="container-brand section-py max-w-2xl">
        {!token && (
          <div className="text-center py-10">
            <p className="text-body-md mb-6" style={{ color: 'var(--color-brand-muted)' }}>
              Sign in to get your personal referral link.
            </p>
            <Link href="/account?redirect=/pages/refer-and-earn" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors">
              Sign In
            </Link>
          </div>
        )}

        {token && isLoading && (
          <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading your referral dashboard…</p>
        )}

        {token && !isLoading && error && (
          <p className="text-body-sm p-3 rounded-sm mb-6" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
        )}

        {token && !isLoading && dash && !dash.code && (
          <div className="text-center py-10">
            <p className="text-body-md mb-6" style={{ color: 'var(--color-brand-muted)' }}>
              You don&apos;t have a referral link yet, {user?.firstName}.
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors"
            >
              Get My Referral Link
            </button>
          </div>
        )}

        {token && !isLoading && dash && dash.code && (
          <>
            {/* Share link card */}
            <div className="border rounded-sm p-6 mb-8" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-2" style={{ color: 'var(--color-brand-muted)' }}>Your referral link</p>
              <div className="flex items-center gap-2 mb-4">
                <code className="flex-1 text-body-sm px-3 py-2.5 rounded-sm bg-brand-cream truncate">{dash.shareLink}</code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 h-10 w-10 flex items-center justify-center border rounded-sm transition-colors"
                  style={{ borderColor: 'var(--color-brand-border)' }}
                  aria-label="Copy referral link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 h-10 px-4 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button onClick={() => handleShare('email')} className="flex items-center gap-2 h-10 px-4 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <Mail size={15} /> Email
                </button>
                <button onClick={handleCopy} className="flex items-center gap-2 h-10 px-4 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <Share2 size={15} /> Copy Link
                </button>
              </div>
              {shareMsg && <p className="text-body-xs mt-3" style={{ color: '#B91C1C' }}>{shareMsg}</p>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="border rounded-sm p-4 text-center" style={{ borderColor: 'var(--color-brand-border)' }}>
                <p className="text-display-md font-display">{dash.stats.totalReferrals}</p>
                <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>Friends referred</p>
              </div>
              <div className="border rounded-sm p-4 text-center" style={{ borderColor: 'var(--color-brand-border)' }}>
                <p className="text-display-md font-display">{dash.stats.totalRewarded}</p>
                <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>Rewards earned</p>
              </div>
              <div className="border rounded-sm p-4 text-center" style={{ borderColor: 'var(--color-brand-border)' }}>
                <p className="text-display-md font-display">{formatPrice(dash.stats.totalEarned)}</p>
                <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>Total earned</p>
              </div>
            </div>

            {/* Recent referrals */}
            <h2 className="text-label mb-4" style={{ color: 'var(--color-brand-muted)' }}>Recent Activity</h2>
            {dash.recent.length === 0 ? (
              <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>
                No referrals yet — share your link to get started.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {dash.recent.map((r) => (
                  <div key={r._id} className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-brand-border)' }}>
                    <p className="text-body-sm">{new Date(r.sharedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <span className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-muted)' }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
