'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/lib/auth-store'
import { api } from '@/lib/api'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Users, Truck,
  Building2, Receipt, RotateCcw, UserCog, LogOut, Sticker,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/orders', icon: ShoppingBag },
  { label: 'POS', href: '/pos', icon: ShoppingCart },
  { label: 'Productos', href: '/products', icon: Package },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Repartidores', href: '/deliverers', icon: Truck },
  { label: 'Mayoristas', href: '/wholesalers', icon: Building2 },
  { label: 'Egresos', href: '/expenses', icon: Receipt },
  { label: 'Devoluciones', href: '/returns', icon: RotateCcw },
  { label: 'Usuarios', href: '/users', icon: UserCog, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, setUser } = useAuthStore()

  async function logout() {
    await api.auth.logout().catch(() => {})
    setUser(null)
  }

  return (
    <aside className="flex h-screen w-[var(--sidebar-width)] flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
        <Sticker className="h-6 w-6 text-brand-600" />
        <span className="font-bold text-gray-900">Pablo Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {NAV.filter((n) => !n.adminOnly || user?.role === 'admin').map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="mb-2 truncate px-2 text-xs text-gray-500">
          {user?.username ?? 'Usuario'} · {user?.role}
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
