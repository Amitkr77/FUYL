import type { Metadata } from 'next'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { generateSEO, orgSchema } from '@/lib/utils/seo'
import '@/styles/globals.css'

export const metadata: Metadata = {
  ...generateSEO(),
  metadataBase: new URL('https://fuyl.in'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — loaded in production via CDN link */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
