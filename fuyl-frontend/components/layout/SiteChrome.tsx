'use client'

import { usePathname } from 'next/navigation'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import type { NavItem } from '@/lib/constants/nav'

export function SiteChrome({ children, shopItems }: { children: React.ReactNode; shopItems: NavItem[] }) {
  const pathname = usePathname()
  const isAffiliatePortal = pathname.startsWith('/affiliate')
  if (isAffiliatePortal) return <main id="MainContent" tabIndex={-1}>{children}</main>
  return <><AnnouncementBar /><Header shopItems={shopItems} /><main id="MainContent" tabIndex={-1}>{children}</main><Footer /><CartDrawer /></>
}
