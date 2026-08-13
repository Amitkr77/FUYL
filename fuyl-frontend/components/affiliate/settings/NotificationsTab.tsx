'use client'

import { useState, useEffect } from 'react'
import { useAffiliate }        from '@/lib/hooks/useAffiliate'
import { apiFetch, getErrorMessage } from '@/lib/api/client'
import { Bell, Coins, CreditCard, Activity, Shield } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifCategory = 'affiliate_commission' | 'affiliate_payment' | 'affiliate_activity' | 'security'

type NotificationPrefs = Record<NotifCategory, boolean>

const DEFAULT_PREFS: NotificationPrefs = {
  affiliate_commission: true,
  affiliate_payment:    true,
  affiliate_activity:   true,
  security:             true,
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROWS: { key: NotifCategory; label: string; desc: string; icon: React.ElementType }[] = [
  {
    key:   'affiliate_commission',
    label: 'Commissions',
    desc:  'Get notified when a commission is earned, approved, or status changes.',
    icon:  Coins,
  },
  {
    key:   'affiliate_payment',
    label: 'Payments',
    desc:  'Alerts for payout processing, success, or failure.',
    icon:  CreditCard,
  },
  {
    key:   'affiliate_activity',
    label: 'Activity',
    desc:  'Referral clicks, new orders, and link activity updates.',
    icon:  Activity,
  },
  {
    key:   'security',
    label: 'Security',
    desc:  'Login alerts, OTP requests, and account change notifications.',
    icon:  Shield,
  },
]

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-brand-teal' : 'bg-brand-border'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsTab() {
  const { token } = useAffiliate()

  const [prefs,   setPrefs]   = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<NotifCategory | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    apiFetch<NotificationPrefs>('/notifications/preferences', { token })
      .then((data) => setPrefs({ ...DEFAULT_PREFS, ...data }))
      .catch(() => { /* use defaults silently */ })
      .finally(() => setLoading(false))
  }, [token])

  const toggle = async (key: NotifCategory) => {
    if (!token || saving) return
    const next = !prefs[key]
    setPrefs((p) => ({ ...p, [key]: next }))
    setSaving(key)
    setError('')
    try {
      await apiFetch('/notifications/preferences', {
        method: 'PATCH',
        token,
        body:   { [key]: next },
      })
    } catch (err) {
      // Revert on failure
      setPrefs((p) => ({ ...p, [key]: !next }))
      setError(getErrorMessage(err, 'Could not update notification preference.'))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell size={15} className="text-brand-forest" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
          Notification Preferences
        </p>
      </div>

      {error && (
        <p className="text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}

      <div className="bg-white border border-brand-border rounded-xl divide-y divide-brand-border/50">
        {ROWS.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={13} className="text-brand-muted shrink-0" />
                <p className="text-body-xs font-semibold text-brand-forest">{label}</p>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">{desc}</p>
            </div>
            {loading ? (
              <div className="h-6 w-11 rounded-full bg-brand-cream animate-pulse" />
            ) : (
              <Toggle
                checked={prefs[key]}
                onChange={() => void toggle(key)}
                disabled={saving !== null}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-brand-muted">
        Notifications are sent to your registered email address. In-app push notifications coming soon.
      </p>
    </div>
  )
}
