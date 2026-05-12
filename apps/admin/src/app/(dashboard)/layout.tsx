'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu, Trophy } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, _hydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!_hydrated) return
    if (!user) {
      api.auth.me().then(setUser).catch(() => router.replace('/login'))
    }
  }, [user, setUser, router, _hydrated])

  // Close drawer when route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!_hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-deep)' }}>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ background: 'oklch(0.178 0.011 260)', borderBottom: '1px solid oklch(1 0 0 / 0.06)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 transition-colors active:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'linear-gradient(135deg, oklch(0.77 0.163 70), oklch(0.65 0.18 50))' }}>
              <Trophy className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Pablo Admin</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--surface-main)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
