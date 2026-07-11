import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { generateSEO, orgSchema } from '@/lib/utils/seo'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <Header />
        <main id="MainContent" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  )
}
