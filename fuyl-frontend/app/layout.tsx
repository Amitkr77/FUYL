import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { generateSEO, orgSchema } from '@/lib/utils/seo'
import { getProducts } from '@/lib/api/products'
import type { NavItem } from '@/lib/constants/nav'
import '@/styles/globals.css'

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
    const products = await getProducts({ limit: 2 })
    // Not force-uppercased here — desktop's MegaMenu already applies
    // `uppercase` via CSS, but the mobile nav renders labels as-is.
    return products.map((p) => ({ label: p.name, href: `/products/${p.slug}` }))
  } catch {
    return []
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shopItems = await getShopNavItems()

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <AnnouncementBar />
        <Header shopItems={shopItems} />
        <main id="MainContent" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  )
}
