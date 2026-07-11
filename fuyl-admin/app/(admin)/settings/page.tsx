'use client'

import { useState, useTransition } from 'react'
import { Save, Eye, EyeOff, Copy, CheckCircle2, Zap, AlertCircle } from 'lucide-react'
import { changePasswordAction } from './actions'

type SettingsTab = 'general' | 'security' | 'notifications' | 'integrations'

const TABS: { label: string; value: SettingsTab }[] = [
  { label: 'General', value: 'general' },
  { label: 'Security', value: 'security' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Integrations', value: 'integrations' },
]

function GeneralTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Store Information</h3>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Name</label>
            <input
              type="text"
              defaultValue="FUYL Nutrition"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Support Email</label>
            <input
              type="email"
              defaultValue="support@fuyl.in"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent">
              <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#12291F] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold tracking-widest text-lg">F</span>
              </div>
              <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Upload new logo
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* No site-settings model exists on the backend yet — these fields
          aren't wired to anything, unlike Security above. */}
      <div className="flex justify-end">
        <button
          disabled
          title="Not available yet — no backend model for site settings"
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-200 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })

  const handleUpdatePassword = () => {
    setError('')
    if (form.next !== form.confirm) {
      setError('New password and confirmation do not match.')
      return
    }
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    startTransition(async () => {
      // On success this redirects to /login — changing a password revokes
      // every session for this account, including the one making this call.
      const result = await changePasswordAction(form.current, form.next)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Change Password</h3>
        <div className="space-y-4 max-w-xl">
          {[
            { label: 'Current Password', key: 'current' as const, show: showCurrent, setShow: setShowCurrent },
            { label: 'New Password', key: 'next' as const, show: showNew, setShow: setShowNew },
            { label: 'Confirm New Password', key: 'confirm' as const, show: showConfirm, setShow: setShowConfirm },
          ].map(({ label, key, show, setShow }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleUpdatePassword}
            disabled={isPending || !form.current || !form.next}
            className="px-6 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Two-Factor Authentication</h3>
            <p className="text-sm text-slate-500 mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#558476] focus:ring-offset-2 ${
              twoFAEnabled ? 'bg-[#558476]' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                twoFAEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {twoFAEnabled && (
          <div className="mt-4 p-3 bg-[#558476]/10 rounded-lg text-sm text-[#558476]">
            2FA will be configured on next login. You will receive setup instructions via email.
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newOrder: true,
    orderShipped: true,
    lowStock: true,
    newCustomer: false,
    weeklyReport: true,
    securityAlerts: true,
  })

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const notifs = [
    { key: 'newOrder' as const, label: 'New Order Received', desc: 'Get notified when a new order is placed' },
    { key: 'orderShipped' as const, label: 'Order Shipped', desc: 'Notify when an order is dispatched' },
    { key: 'lowStock' as const, label: 'Low Stock Alert', desc: 'Alert when product stock falls below 20 units' },
    { key: 'newCustomer' as const, label: 'New Customer Registration', desc: 'Notify when a new customer signs up' },
    { key: 'weeklyReport' as const, label: 'Weekly Summary Report', desc: 'Receive weekly business performance summary' },
    { key: 'securityAlerts' as const, label: 'Security Alerts', desc: 'Get alerts for suspicious login attempts' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-5">Email Notifications</h3>
      <div className="space-y-4">
        {notifs.map((notif) => (
          <div key={notif.key} className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-900">{notif.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{notif.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[notif.key]}
              onChange={() => togglePref(notif.key)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#558476] focus:ring-[#558476] cursor-pointer flex-shrink-0"
            />
          </div>
        ))}
      </div>
      {/* No admin-notification-preferences model exists on the backend yet
          (the notification module's preferences are per-customer, a
          different concept) — not wired. */}
      <div className="mt-4 flex justify-end">
        <button
          disabled
          title="Not available yet — no backend model for admin notification preferences"
          className="px-6 py-2.5 bg-slate-200 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed"
        >
          Save Preferences
        </button>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      {/* This tab was previously showing a fabricated API key and a
          hardcoded "Connected" status for Razorpay — neither reflected
          anything real (there's no per-admin API-key system, and actual
          gateway-configuration status isn't exposed by any endpoint).
          Replaced with an honest placeholder rather than invented data. */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Integrations</h3>
        </div>
        <p className="text-sm text-slate-500">
          Not available yet. Payment gateway credentials are configured via backend environment
          variables, not through this dashboard, and there's no external API-key system to manage here.
        </p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const tabContent = {
    general: <GeneralTab />,
    security: <SecurityTab />,
    notifications: <NotificationsTab />,
    integrations: <IntegrationsTab />,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your store configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tabContent[activeTab]}
    </div>
  )
}
