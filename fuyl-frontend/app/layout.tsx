import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { generateSEO, orgSchema } from '@/lib/utils/seo'
import { serializeJsonLd } from '@/lib/utils/jsonLd'
import { getProducts } from '@/lib/api/products'
import type { NavItem } from '@/lib/constants/nav'
import { PageTracker } from '@/components/analytics/PageTracker'
import { getNavigationPages, getAnnouncementBar, getPrebookingModalSettings, getPopupBanner } from '@/lib/api/content'
import '@/styles/globals.css'
import { PrebookingPopup } from '@/components/marketing/PrebookingPopup'
import { PopupBanner } from '@/components/marketing/PopupBanner'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  ...generateSEO(),
  metadataBase: new URL('https://fuyl.in'),
  icons: {
    icon: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
    shortcut: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
    apple: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
  },
}

// The Shop submenu mirrors whatever's currently on top of /collections/all
// (newest-first, same ordering that page itself uses) instead of two
// hardcoded links — falls back to Header's own static default on any
// failure, so a catalog/API hiccup never breaks the nav.
async function getShopNavItems(): Promise<NavItem[]> {
  try {
    const products = await getProducts({})
    // Not force-uppercased here — desktop's MegaMenu already applies
    // `uppercase` via CSS, but the mobile nav renders labels as-is.
    return products.map((p) => ({ label: p.name, href: `/products/${p.slug}` }))
  } catch {
    return []
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [shopItems, contentNavigation, announcementBar, prebookingModal, popupBanner] = await Promise.all([
    getShopNavItems(),
    getNavigationPages().catch(() => []),
    getAnnouncementBar(),
    getPrebookingModalSettings(),
    getPopupBanner(),
  ])

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgSchema) }}
        />
      </head>
      <body>
        {/* Skip link — first focusable element; visually hidden until focused,
            lets keyboard users jump past the header/nav to the page content. */}
        <a
          href="#MainContent"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-sm focus:bg-brand-forest focus:px-4 focus:py-2 focus:text-white focus:text-body-sm"
        >
          Skip to content
        </a>
        <SiteChrome shopItems={shopItems} contentNavigation={contentNavigation} announcementBar={announcementBar}>{children}</SiteChrome>
        <PageTracker />
        <PrebookingPopup cms={prebookingModal} />
        {popupBanner && <PopupBanner cms={popupBanner} />}
      </body>
    </html>
  )
}
