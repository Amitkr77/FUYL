'use client'

import { AffiliateSidebar }   from '@/components/affiliate/layout/AffiliateSidebar'
import { AffiliateBottomBar } from '@/components/affiliate/layout/AffiliateBottomBar'
import { AffiliateHeader }    from '@/components/affiliate/layout/AffiliateHeader'
import { AffiliateAuthGuard } from '@/components/affiliate/shared/AffiliateAuthGuard'
import { ImpersonationBanner } from '@/components/affiliate/layout/ImpersonationBanner'

export default function AffiliateDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AffiliateAuthGuard>
      <ImpersonationBanner />
      <div className="flex min-h-screen bg-brand-cream">
        {/* Desktop sidebar */}
        <AffiliateSidebar />

        {/* Main content column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile top bar */}
          <AffiliateHeader />

          {/* Page content — extra bottom padding on mobile to clear the fixed bottom bar */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <AffiliateBottomBar />
    </AffiliateAuthGuard>
  )
}
