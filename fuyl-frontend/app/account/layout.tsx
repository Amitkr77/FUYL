'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { AccountSidebar } from '@/components/account/AccountSidebar'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore()
  const pathname = usePathname()

  // Logged out: each page renders its own centered sign-in prompt / auth form —
  // no sidebar shell to wrap it in.
  if (!token || !user) {
    return <>{children}</>
  }

  return (
    <div className="container-brand section-py">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        <AccountSidebar user={user} pathname={pathname} onSignOut={logout} />
        <div className="min-w-0 w-full flex-1 pb-20 lg:pb-0">{children}</div>
      </div>
    </div>
  )
}
