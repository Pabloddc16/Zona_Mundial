'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/auth-store'
import { api, storeRT, storeAT } from '@/lib/api'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Users, Truck,
  Building2, Receipt, RotateCcw, UserCog, LogOut, Trophy,
  ArrowLeftRight, GitMerge, FlaskConical, MapPin, TrendingUp, ChevronRight, Landmark, BookOpen,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sales',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
      { label: 'POS', href: '/admin/pos', icon: ShoppingCart },
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Deliverers', href: '/admin/deliverers', icon: Truck },
      { label: 'Wholesalers', href: '/admin/wholesalers', icon: Building2 },
      { label: 'Expenses', href: '/admin/expenses', icon: Receipt },
      { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
      { label: 'Accounts', href: '/admin/cuentas', icon: Landmark },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', href: '/admin/inventory', icon: TrendingUp },
      { label: 'Stars stock', href: '/admin/stars-inventory', icon: TrendingUp },
      { label: 'Purchases', href: '/admin/purchases', icon: Package },
      { label: 'Transfers', href: '/admin/transfers', icon: ArrowLeftRight },
      { label: 'Conversions', href: '/admin/conversions', icon: GitMerge },
      { label: 'Recipes', href: '/admin/recipes', icon: FlaskConical },
      { label: 'Locations', href: '/admin/locations', icon: MapPin },
    ],
  },
  {
    label: 'Admin',
    adminOnly: true,
    items: [
      { label: 'Users', href: '/admin/users', icon: UserCog, adminOnly: true },
      { label: 'Guide', href: '/admin/ayuda', icon: BookOpen, adminOnly: true },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { user, setUser } = useAuthStore()

  async function logout() {
    await api.auth.logout().catch(() => {})
    storeRT(null)
    storeAT(null)
    setUser(null)
  }

  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] shrink-0" style={{ borderBottom: '1px solid oklch(1 0 0 / 0.06)' }}>
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
                    onClick={onCloseMobile}
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
      <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid oklch(1 0 0 / 0.06)' }}>
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
    </>
  )

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside
        className="hidden md:flex h-screen w-[var(--sidebar-width)] flex-col shrink-0"
        style={{ background: 'oklch(0.178 0.011 260)', borderRight: '1px solid oklch(1 0 0 / 0.06)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile: backdrop + slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
        </div>
      )}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'oklch(0.178 0.011 260)', borderRight: '1px solid oklch(1 0 0 / 0.06)' }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
