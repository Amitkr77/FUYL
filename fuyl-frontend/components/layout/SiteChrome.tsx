'use client'

import { usePathname } from 'next/navigation'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import type { NavItem } from '@/lib/constants/nav'
import type { NavigationPage } from '@/lib/api/content'

export function SiteChrome({ children, shopItems, contentNavigation }: { children: React.ReactNode; shopItems: NavItem[]; contentNavigation: NavigationPage[] }) {
  const pathname = usePathname()
  const isAffiliatePortal = pathname.startsWith('/affiliate')
  if (isAffiliatePortal) return <main id="MainContent" tabIndex={-1}>{children}</main>
  const headerPages = contentNavigation.filter((page) => page.placement === 'header' || page.placement === 'both')
  const footerPages = contentNavigation.filter((page) => page.placement === 'footer' || page.placement === 'both')
  return <><AnnouncementBar /><Header shopItems={shopItems} contentPages={headerPages} /><main id="MainContent" tabIndex={-1}>{children}</main><Footer contentPages={footerPages} /><CartDrawer /></>
}
