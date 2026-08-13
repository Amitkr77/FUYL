'use client'

import { useState } from 'react'
import { Settings }         from 'lucide-react'
import { TabBar }           from '@/components/affiliate/shared/TabBar'
import { ProfileTab }       from '@/components/affiliate/settings/ProfileTab'
import { PaymentTaxTab }    from '@/components/affiliate/settings/PaymentTaxTab'
import { NotificationsTab } from '@/components/affiliate/settings/NotificationsTab'
import { SecurityTab }      from '@/components/affiliate/settings/SecurityTab'

// ─── Tab definitions ──────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'payment' | 'notifications' | 'security'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'profile',       label: 'Profile'       },
  { key: 'payment',       label: 'Payment & Tax'  },
  { key: 'notifications', label: 'Notifications'  },
  { key: 'security',      label: 'Security'       },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-brand-forest" />
        <h1 className="text-display-md font-display text-brand-forest">SETTINGS</h1>
      </div>

      {/* Tab bar */}
      <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
        <TabBar
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          size="md"
        />

        <div className="p-5 sm:p-6">
          {activeTab === 'profile'       && <ProfileTab />}
          {activeTab === 'payment'       && <PaymentTaxTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security'      && <SecurityTab />}
        </div>
      </div>
    </div>
  )
}
