'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Users, Truck,
  Building2, Receipt, RotateCcw, UserCog, LogOut, Trophy,
  ArrowLeftRight, GitMerge, FlaskConical, MapPin, TrendingUp, ChevronRight,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sales',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Orders', href: '/orders', icon: ShoppingBag },
      { label: 'POS', href: '/pos', icon: ShoppingCart },
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Deliverers', href: '/deliverers', icon: Truck },
      { label: 'Wholesalers', href: '/wholesalers', icon: Building2 },
      { label: 'Expenses', href: '/expenses', icon: Receipt },
      { label: 'Returns', href: '/returns', icon: RotateCcw },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', href: '/inventory', icon: TrendingUp },
      { label: 'Purchases', href: '/purchases', icon: Package },
      { label: 'Transfers', href: '/transfers', icon: ArrowLeftRight },
      { label: 'Conversions', href: '/conversions', icon: GitMerge },
      { label: 'Recipes', href: '/recipes', icon: FlaskConical },
      { label: 'Locations', href: '/locations', icon: MapPin },
    ],
  },
  {
    label: 'Admin',
    adminOnly: true,
    items: [
      { label: 'Users', href: '/users', icon: UserCog, adminOnly: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, setUser } = useAuthStore()

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="flex h-screen w-[var(--sidebar-width)] flex-col" style={{ background: 'oklch(0.178 0.011 260)', borderRight: '1px solid oklch(1 0 0 / 0.06)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px]" style={{ borderBottom: '1px solid oklch(1 0 0 / 0.06)' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, oklch(0.77 0.163 70), oklch(0.65 0.18 50))', boxShadow: '0 2px 8px oklch(0.77 0.163 70 / 0.3)' }}>
          <Trophy className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none" style={{ color: 'var(--text-primary)' }}>Pablo Admin</p>
          <p className="mt-0.5 text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>World Cup 2026</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin space-y-4">
        {NAV_SECTIONS.map((section) => {
          if ('adminOnly' in section && section.adminOnly && user?.role !== 'admin') return null
          const visibleItems = section.items.filter((item) =>
            !('adminOnly' in item && item.adminOnly) || user?.role === 'admin'
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {section.label}
              </p>
              {visibleItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn('group mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all')}
                    style={active
                      ? { background: 'oklch(0.77 0.163 70 / 0.13)', color: 'oklch(0.84 0.150 80)' }
                      : { color: 'var(--text-secondary)' }
                    }
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'oklch(1 0 0 / 0.04)' }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
                  >
                    <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {active && <ChevronRight className="h-3 w-3 opacity-50" />}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid oklch(1 0 0 / 0.06)' }}>
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2" style={{ background: 'oklch(1 0 0 / 0.03)' }}>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'oklch(0.77 0.163 70 / 0.15)', color: 'var(--amber)' }}>
            {(user?.username ?? 'U')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{user?.username ?? 'User'}</p>
            <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.63 0.225 27 / 0.10)'; e.currentTarget.style.color = 'oklch(0.75 0.18 27)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
