'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, _hydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!_hydrated) return
    if (!user) {
      api.auth.me().then(setUser).catch(() => router.replace('/login'))
    }
  }, [user, setUser, router, _hydrated])

  if (!_hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-deep)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: 'var(--surface-main)' }}>
        {children}
      </main>
    </div>
  )
}
