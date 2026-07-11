import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FUYL Admin',
  description: 'FUYL Admin Panel',
  icons: {
    icon: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
    shortcut: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
    apple: [{ url: '/FAVICON_WHITE_430x.webp', type: 'image/webp' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
