import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import { BottomNav } from '@/components/layout/bottom-nav'

export const metadata: Metadata = {
  title: 'Pablo App — Mundial 2026',
  description: 'Tu álbum Panini digital. Completa tu colección, encuentra las que te faltan.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#006341',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <main className="min-h-screen pb-tab">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
