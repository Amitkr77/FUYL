'use client'

import { usePathname } from 'next/navigation'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import type { NavItem } from '@/lib/constants/nav'
import type { NavigationPage, AnnouncementBarCMS } from '@/lib/api/content'

interface SiteChromeProps {
  children: React.ReactNode
  shopItems: NavItem[]
  contentNavigation: NavigationPage[]
  announcementBar?: AnnouncementBarCMS | null
}

export function SiteChrome({ children, shopItems, contentNavigation, announcementBar }: SiteChromeProps) {
  const pathname = usePathname()
  const isAffiliatePortal = pathname.startsWith('/affiliate')
  if (isAffiliatePortal) return <main id="MainContent" tabIndex={-1}>{children}</main>
  const headerPages = contentNavigation.filter((page) => page.placement === 'header' || page.placement === 'both')
  const footerPages = contentNavigation.filter((page) => page.placement === 'footer' || page.placement === 'both')
  return <><AnnouncementBar cms={announcementBar} /><Header shopItems={shopItems} contentPages={headerPages} /><main id="MainContent" tabIndex={-1}>{children}</main><Footer contentPages={footerPages} /><CartDrawer /></>
}
