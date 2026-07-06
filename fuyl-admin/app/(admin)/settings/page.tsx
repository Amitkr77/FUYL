'use client'

import { useState } from 'react'
import { Save, Eye, EyeOff, Copy, CheckCircle2, Zap } from 'lucide-react'

type SettingsTab = 'general' | 'security' | 'notifications' | 'integrations'

const TABS: { label: string; value: SettingsTab }[] = [
  { label: 'General', value: 'general' },
  { label: 'Security', value: 'security' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Integrations', value: 'integrations' },
]

function GeneralTab() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

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
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
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

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Change Password</h3>
        <div className="space-y-4 max-w-xl">
          {[
            { label: 'Current Password', show: showCurrent, setShow: setShowCurrent },
            { label: 'New Password', show: showNew, setShow: setShowNew },
            { label: 'Confirm New Password', show: showConfirm, setShow: setShowConfirm },
          ].map(({ label, show, setShow }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
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
          <button className="px-6 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors">
            Update Password
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
      <div className="mt-4 flex justify-end">
        <button className="px-6 py-2.5 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors">
          Save Preferences
        </button>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  const [copied, setCopied] = useState(false)
  const apiKey = 'fya_live_sk_7j2k4m9p1r3s6v8x...'

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">API Key</h3>
        <p className="text-sm text-slate-500 mb-4">Use this key to integrate FUYL Admin with external services</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700 truncate">
            {apiKey}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Keep this key secret. Regenerate if compromised.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#96BF48]/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#96BF48]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Shopify</h3>
              <p className="text-xs text-slate-400">E-commerce platform integration</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not connected
          </span>
        </div>
        <button className="mt-4 px-4 py-2 bg-[#96BF48] hover:bg-[#7aa33a] text-white text-sm font-medium rounded-lg transition-colors">
          Connect Shopify
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">R</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Razorpay</h3>
              <p className="text-xs text-slate-400">Payment gateway</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>
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
