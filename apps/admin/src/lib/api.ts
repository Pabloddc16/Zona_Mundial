const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'
const RT_KEY = 'pablo-rt'
const AT_KEY = 'pablo-at'

export const storeRT = (t: string | null) => {
  if (typeof window === 'undefined') return
  t ? localStorage.setItem(RT_KEY, t) : localStorage.removeItem(RT_KEY)
}
export const storeAT = (t: string | null) => {
  if (typeof window === 'undefined') return
  t ? localStorage.setItem(AT_KEY, t) : localStorage.removeItem(AT_KEY)
}
const getRT = () => typeof window !== 'undefined' ? localStorage.getItem(RT_KEY) : null
const getAT = () => typeof window !== 'undefined' ? localStorage.getItem(AT_KEY) : null

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!)) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch { return 0 }
}

let _refreshing: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    const rt = getRT()
    if (!rt) return false
    const rtAtStart = rt
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Cross-tab race: another tab may have already refreshed with this RT.
          // If the RT in localStorage changed, use those new tokens instead of wiping.
          const currentRT = getRT()
          if (currentRT && currentRT !== rtAtStart) return true
          storeRT(null)
          storeAT(null)
        }
        return false
      }
      const data = await res.json() as { accessToken: string; refreshToken: string }
      storeAT(data.accessToken)
      storeRT(data.refreshToken)
      return true
    } catch {
      // Network error (API down/restarting) — keep tokens, don't wipe
      return false
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

function authHeaders(extra?: HeadersInit): Record<string, string> {
  const at = getAT()
  return {
    'Content-Type': 'application/json',
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
    ...(extra as Record<string, string> ?? {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Proactively refresh if AT expires in < 90 seconds — avoids reactive 401 cycle
  const isAuthPath = path === '/api/auth/login' || path === '/api/auth/refresh'
  if (!isAuthPath) {
    const at = getAT()
    if (at) {
      const exp = getTokenExpiry(at)
      if (exp > 0 && exp - Date.now() < 90_000) {
        await tryRefresh()
      }
    }
  }

  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...init,
    headers: authHeaders(init?.headers),
  })

  if (res.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
    const ok = await tryRefresh()
    if (ok) {
      const retry = await fetch(`${API}${path}`, {
        credentials: 'include',
        ...init,
        headers: authHeaders(init?.headers),
      })
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${retry.status}`)
      }
      return retry.json() as Promise<T>
    }
    // Only redirect to login if tokens are gone (real auth failure, not network blip)
    if (!getAT() && !getRT()) {
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) => post<{ user: AuthUser; accessToken: string; refreshToken: string }>('/api/auth/login', { email, password }),
    logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),
    me: () => get<AuthUser & { profile: unknown; deliverer: unknown }>('/api/auth/me'),
    forgotPassword: (email: string) => post<{ ok: boolean }>('/api/auth/request-reset', { email }),
    resetPassword: (token: string, new_password: string) => post<{ ok: boolean }>('/api/auth/reset', { token, new_password }),
  },

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: {
    kpis: (from?: string, to?: string) => get<DashboardData>(`/api/dashboard${from ? `?from=${from}&to=${to ?? ''}` : ''}`),
    ordersSummary: () => get<OrdersSummary>('/api/dashboard/orders-summary'),
  },

  // ─── Orders ─────────────────────────────────────────────────────────────────
  orders: {
    list: (params?: Record<string, string>) => get<Paginated<Order>>(`/api/orders?${new URLSearchParams(params).toString()}`),
    get: (n: string) => get<Order>(`/api/orders/${n}`),
    create: (body: unknown) => post<Order>('/api/orders', body),
    update: (n: string, body: unknown) => patch<Order>(`/api/orders/${n}`, body),
    delete: (n: string) => del<{ ok: boolean }>(`/api/orders/${n}`),
    paymentLink: (n: string) => post<{ url: string; qrDataUrl: string }>(`/api/orders/${n}/payment-link`, {}),
  },

  // ─── Sales (POS) ────────────────────────────────────────────────────────────
  sales: {
    list: (params?: Record<string, string>) => get<Paginated<Sale>>(`/api/sales?${new URLSearchParams(params).toString()}`),
    today: () => get<SalesToday>('/api/sales/today'),
    create: (body: unknown) => post<Sale>('/api/sales', body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/sales/${id}`),
  },

  // ─── Products ───────────────────────────────────────────────────────────────
  products: {
    list: (params?: Record<string, string>) => get<Paginated<Product>>(`/api/products?${new URLSearchParams(params).toString()}`),
    get: (id: string) => get<Product>(`/api/products/${id}`),
    create: (body: unknown) => post<Product>('/api/products', body),
    update: (id: string, body: unknown) => patch<Product>(`/api/products/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/products/${id}`),
    adjustStock: (id: string, body: unknown) => patch<StockResult>(`/api/products/${id}/stock`, body),
    setStock: (id: string, body: unknown) => put<StockResult>(`/api/products/${id}/stock`, body),
    adjustments: (id: string) => get<StockAdjustment[]>(`/api/products/${id}/stock-adjustments`),
    allAdjustments: (limit?: number) => get<StockAdjustment[]>(`/api/products/adjustments${limit ? `?limit=${limit}` : ''}`),
  },

  // ─── Customers ──────────────────────────────────────────────────────────────
  customers: {
    list: (q?: string) => get<Customer[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    get: (id: string) => get<Customer & { orders: Order[] }>(`/api/customers/${id}`),
    create: (body: unknown) => post<Customer>('/api/customers', body),
    update: (id: string, body: unknown) => patch<Customer>(`/api/customers/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/customers/${id}`),
    unified: () => get<{ app: Customer[]; wholesale: WholesaleCustomer[] }>('/api/customers/unified'),
  },

  // ─── Deliverers ─────────────────────────────────────────────────────────────
  deliverers: {
    list: () => get<Deliverer[]>('/api/deliverers'),
    create: (body: unknown) => post<Deliverer>('/api/deliverers', body),
    update: (id: string, body: unknown) => patch<Deliverer>(`/api/deliverers/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/deliverers/${id}`),
    route: (id: string) => get<RouteResult>(`/api/deliverers/${id}/route`),
  },

  // ─── Wholesalers ────────────────────────────────────────────────────────────
  wholesalers: {
    list: (active?: boolean) => get<Wholesaler[]>(`/api/wholesalers${active !== undefined ? `?active=${active}` : ''}`),
    create: (body: unknown) => post<Wholesaler>('/api/wholesalers', body),
    update: (id: string, body: unknown) => patch<Wholesaler>(`/api/wholesalers/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/wholesalers/${id}`),
    sales: (params?: Record<string, string>) => get<Paginated<WholesaleSale>>(`/api/wholesalers/sales?${new URLSearchParams(params).toString()}`),
    createSale: (body: unknown) => post<WholesaleSale>('/api/wholesalers/sales', body),
    recordPayment: (id: string, body: unknown) => post<{ payment: unknown; sale: WholesaleSale }>(`/api/wholesalers/sales/${id}/payments`, body),
    paymentLink: (id: string) => post<{ url: string; qrDataUrl: string }>(`/api/wholesalers/sales/${id}/payment-link`, {}),
  },

  // ─── Expenses ───────────────────────────────────────────────────────────────
  expenses: {
    list: (params?: Record<string, string>) => get<Paginated<Expense>>(`/api/expenses?${new URLSearchParams(params).toString()}`),
    create: (body: unknown) => post<Expense>('/api/expenses', body),
    update: (id: string, body: unknown) => patch<Expense>(`/api/expenses/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/expenses/${id}`),
  },

  // ─── Returns ────────────────────────────────────────────────────────────────
  returns: {
    list: (params?: Record<string, string>) => get<Paginated<Return>>(`/api/returns?${new URLSearchParams(params).toString()}`),
    get: (id: string) => get<Return>(`/api/returns/${id}`),
    create: (body: unknown) => post<Return>('/api/returns', body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/returns/${id}`),
  },

  // ─── Users ──────────────────────────────────────────────────────────────────
  users: {
    list: () => get<AdminUser[]>('/api/users'),
    create: (body: unknown) => post<AdminUser>('/api/users', body),
    update: (id: string, body: unknown) => patch<AdminUser>(`/api/users/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/users/${id}`),
  },

  // ─── Inventory — Locations ────────────────────────────────────────────────
  locations: {
    list: () => get<Location[]>('/api/locations'),
    create: (body: unknown) => post<Location>('/api/locations', body),
    update: (id: string, body: unknown) => patch<Location>(`/api/locations/${id}`, body),
  },

  // ─── Inventory — Recipes ──────────────────────────────────────────────────
  recipes: {
    list: () => get<Recipe[]>('/api/recipes'),
    create: (body: unknown) => post<Recipe>('/api/recipes', body),
    update: (id: string, body: unknown) => patch<Recipe>(`/api/recipes/${id}`, body),
    delete: (id: string) => del<{ ok: boolean }>(`/api/recipes/${id}`),
  },

  // ─── Inventory — Purchases ────────────────────────────────────────────────
  purchases: {
    list: (params?: Record<string, string>) => get<Paginated<Purchase>>(`/api/purchases?${new URLSearchParams(params).toString()}`),
    get: (id: string) => get<Purchase>(`/api/purchases/${id}`),
    create: (body: unknown) => post<Purchase>('/api/purchases', body),
    pay: (id: string) => patch<Purchase>(`/api/purchases/${id}/pay`, {}),
    receive: (id: string, body?: unknown) => patch<Purchase>(`/api/purchases/${id}/receive`, body ?? {}),
    cancel: (id: string) => patch<Purchase>(`/api/purchases/${id}/cancel`, {}),
  },

  // ─── Inventory — Transfers ────────────────────────────────────────────────
  transfers: {
    list: (params?: Record<string, string>) => get<Paginated<Transfer>>(`/api/transfers?${new URLSearchParams(params).toString()}`),
    get: (id: string) => get<Transfer>(`/api/transfers/${id}`),
    create: (body: unknown) => post<Transfer>('/api/transfers', body),
    complete: (id: string) => patch<Transfer>(`/api/transfers/${id}/complete`, {}),
    cancel: (id: string) => patch<Transfer>(`/api/transfers/${id}/cancel`, {}),
  },

  // ─── Inventory — Conversions ──────────────────────────────────────────────
  conversions: {
    list: (params?: Record<string, string>) => get<Paginated<Conversion>>(`/api/conversions?${new URLSearchParams(params).toString()}`),
    get: (id: string) => get<Conversion>(`/api/conversions/${id}`),
    create: (body: unknown) => post<Conversion>('/api/conversions', body),
    start: (id: string) => patch<Conversion>(`/api/conversions/${id}/start`, {}),
    finish: (id: string) => patch<Conversion>(`/api/conversions/${id}/finish`, {}),
    cancel: (id: string) => patch<Conversion>(`/api/conversions/${id}/cancel`, {}),
  },

  // ─── Inventory — Stock & Movements ───────────────────────────────────────
  stock: {
    list: (params?: Record<string, string>) => get<StockEntry[]>(`/api/stock?${new URLSearchParams(params).toString()}`),
    wip: () => get<StockEntry[]>('/api/stock/wip'),
    idle: (days?: number) => get<IdleStock[]>(`/api/stock/idle${days ? `?days=${days}` : ''}`),
    movements: (params?: Record<string, string>) => get<Paginated<Movement>>(`/api/movements?${new URLSearchParams(params).toString()}`),
    summary: () => get<StockSummary>('/api/stock/summary'),
  },
}

// ─── Types (lightweight, for client use) ────────────────────────────────────
export interface AuthUser { id: string; email: string; role: string; username: string }
export interface Paginated<T> { items: T[]; total: number; page: number; pages: number; limit: number }
export interface Product { id: string; name: string; category?: string; emoji?: string; price: number; cost?: number; stock: number; barcode?: string; updated_at: string }
export interface Customer { id: string; name: string; phone?: string; email?: string; address?: string; total_orders: number; total_spent: number }
export interface WholesaleCustomer { source: 'wholesale'; id: string; name: string; rfc?: string; email?: string; totalOrders: number; totalSpent: number }
export interface Deliverer { id: string; name: string; phone?: string; vehicle?: string; status: string; zone?: string; username?: string; rating: number; deliveries_today: number; deliveries_total: number; lat?: number; lng?: number }
export interface Wholesaler { id: string; razon_social: string; rfc?: string; email?: string; contacto?: string; nota?: string; active: boolean; created_at: string }
export interface WholesaleSale { id: string; wholesaler_id?: string; wholesaler_name: string; payment_method: string; subtotal: number; total: number; amount_paid: number; saldo: number; status: string; payments: unknown[]; created_at: string }
export interface Order { order_number: string; customer_name?: string; phone?: string; address?: string; status: string; total: number; delivery_type?: string; deliverer_id?: string; date: string; order_items?: OrderItem[] }
export interface OrderItem { product_id?: string; name: string; qty: number; price: number }
export interface Sale { id: string; payment_method: string; total: number; created_at: string; sale_items?: SaleItem[] }
export interface SaleItem { product_id?: string; name: string; quantity: number; unit_price: number; subtotal: number }
export interface SalesToday { count: number; revenue: number; refundTotal: number; netRevenue: number; recent: Sale[] }
export interface Expense { id: string; date: string; concept: string; category?: string; amount: number; payment_method?: string; notes?: string; created_at: string }
export interface Return { id: string; source: string; reason: string; refund_amount: number; refund_method: string; created_at: string; return_items?: ReturnItem[] }
export interface ReturnItem { name: string; qty: number; unit_price?: number }
export interface StockAdjustment { id: string; product_id: string; delta: number; previous_stock: number; new_stock: number; reason: string; note?: string; created_at: string }
export interface StockResult { product_id: string; previousStock: number; newStock: number; delta: number }
export interface AdminUser { id: string; username: string; email?: string; role: string; active: boolean; created_at: string }
export interface RouteResult { deliverer: Deliverer; stops: RouteStop[]; totals: { stops: number; distanceKm: number; etaMinutes: number }; generatedAt: string }
export interface RouteStop { sequence: number; order_number: string; customer_name?: string; address?: string; total: number; status: string; distanceFromPrev: number }

// ─── Inventory Types ─────────────────────────────────────────────────────────
export interface Location { id: string; name: string; type: 'warehouse' | 'pos' | 'wip_conversion' | 'wip_assembly'; active: boolean; created_at: string }
export interface Recipe { id: string; name: string; output_sku_id: string; output_sku_name?: string; output_qty: number; active: boolean; lines: RecipeLine[]; created_at: string }
export interface RecipeLine { id: string; input_sku_id: string; input_sku_name?: string; input_qty: number }
export interface Purchase { id: string; supplier: string; status: 'draft' | 'paid' | 'received' | 'cancelled'; total: number; notes?: string; paid_at?: string; received_at?: string; created_by?: string; created_at: string; lines?: PurchaseLine[] }
export interface PurchaseLine { id: string; purchase_id: string; sku_id: string; sku_name?: string; qty: number; unit_cost: number; received_to?: string }
export interface Transfer { id: string; from_loc: string; from_loc_name?: string; to_loc: string; to_loc_name?: string; status: 'draft' | 'in_transit' | 'completed' | 'cancelled'; notes?: string; created_by?: string; completed_at?: string; created_at: string; lines?: TransferLine[] }
export interface TransferLine { id: string; transfer_id: string; sku_id: string; sku_name?: string; qty: number }
export interface Conversion { id: string; recipe_id: string; recipe_name?: string; output_sku_name?: string; qty: number; location_id: string; location_name?: string; status: 'planned' | 'in_progress' | 'done' | 'cancelled'; notes?: string; started_at?: string; finished_at?: string; created_by?: string; created_at: string }
export interface StockEntry { sku_id: string; sku_name?: string; sku?: string; unit_type?: string; location_id: string; location_name?: string; location_type?: string; qty: number; avg_cost?: number }
export interface Movement { id: string; sku_id: string; sku_name?: string; qty: number; location_from?: string; location_from_name?: string; location_to?: string; location_to_name?: string; type: string; ref_table: string; ref_id: string; unit_cost?: number; note?: string; created_by?: string; created_at: string }
export interface IdleStock { sku_id: string; sku_name?: string; location_id: string; location_name?: string; qty: number; last_movement: string; days_idle: number }
export interface StockSummary { totalSkus: number; totalUnits: number; totalValue: number; wipUnits: number; byLocation: { location_id: string; location_name: string; location_type: string; skus: number; units: number; value: number }[] }

export interface DashboardData {
  range: { from: string; to: string; days: number }
  summary: { ingresoTotal: number; cobrado: number; porCobrar: number; utilidadBruta: number; totalEgresos: number; utilidadNeta: number; valorInventario: number; unidadesInventario: number; devoluciones: number }
  bySource: { pos: { count: number; revenue: number }; wholesale: { count: number; revenue: number }; app: { count: number; revenue: number } }
  byMethod: { efectivo: number; tarjeta: number; transferencia: number; credito: number }
  dailyCashFlow: { date: string; revenue: number }[]
  expensesByCat: Record<string, number>
  cuentasPorCobrar: { total: number; count: number; items: unknown[] }
}
export interface OrdersSummary { ordersToday: number; revenueToday: number; byStatus: Record<string, number>; recent: Order[] }
