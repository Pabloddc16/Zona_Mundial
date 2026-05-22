import { getAT, getRT, setAT, setRT, clearTokens, getTokenExpiry } from './auth-storage'

const API = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'

let _refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    const rt = await getRT()
    if (!rt) return false
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) await clearTokens()
        return false
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string }
      await setAT(data.accessToken)
      await setRT(data.refreshToken)
      return true
    } catch {
      // network error — keep tokens, don't wipe
      return false
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const at = await getAT()
  return {
    'Content-Type': 'application/json',
    ...(at ? { Authorization: `Bearer ${at}` } : {}),
    ...(extra ?? {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isAuthPath = path === '/api/auth/login' || path === '/api/auth/refresh' || path === '/api/auth/register'

  // Proactive refresh: if AT expires in < 90s, refresh first
  if (!isAuthPath) {
    const at = await getAT()
    if (at) {
      const exp = getTokenExpiry(at)
      if (exp > 0 && exp - Date.now() < 90_000) await tryRefresh()
    }
  }

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: await authHeaders(init?.headers as Record<string, string> | undefined),
  })

  if (res.status === 401 && !isAuthPath) {
    const ok = await tryRefresh()
    if (ok) {
      const retry = await fetch(`${API}${path}`, {
        ...init,
        headers: await authHeaders(init?.headers as Record<string, string> | undefined),
      })
      if (!retry.ok) throw await parseError(retry, path)
      return retry.json() as Promise<T>
    }
    throw new Error('Session expired')
  }

  if (!res.ok) throw await parseError(res, path)
  return res.json() as Promise<T>
}

async function parseError(res: Response, path: string): Promise<Error> {
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  // Fastify shape: { statusCode, error: 'Bad Request', message: 'actual reason' }
  // Custom shape:  { error: 'message' }
  const message =
    (typeof body['message'] === 'string' && body['message']) ||
    (typeof body['error'] === 'string' && body['error']) ||
    `HTTP ${res.status}`
  // Always log full server response so debugging is possible from device logs
  if (__DEV__ || true) console.warn(`[api] ${res.status} ${path}`, body)
  return new Error(String(message))
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export interface AuthUser { id: string; email: string; username: string; role: string }
export interface LoginResp { user: AuthUser; accessToken: string; refreshToken: string }
export interface Product { id: string; name: string; price: number; emoji?: string; image?: string; category?: string; stock: number }

export interface OrderPayload {
  customer_name: string
  phone: string
  address: string
  delivery_type: 'local' | 'envio'
  notes?: string
  payment_method: string
  items: Array<{ product_id: string; name: string; qty: number; price: number }>
  shipping?: number
  referral_code?: string
}

export interface Order {
  order_number: string
  customer_name: string
  phone: string
  address: string
  status: string
  total: number
  subtotal: number
  shipping: number
  payment_method: string
  delivery_type: string
  date: string
  pickup_code?: string | null
  order_items?: Array<{ name: string; qty: number; price: number; product_id?: string }>
}

const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

export interface StickerState { owned: number; needed: number }
export interface TradeMatch {
  user_id: string
  username: string
  they_have_i_need: string[]
  i_have_they_need: string[]
  score: number
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      post<LoginResp>('/api/auth/login', { email, password }),
    register: (body: { email: string; password: string; username?: string }) =>
      post<LoginResp>('/api/auth/register', body),
    me: () => get<AuthUser & { profile: unknown }>('/api/auth/me'),
    logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),
    deleteAccount: () => del<{ ok: boolean }>('/api/auth/account'),
    requestReset: (email: string) =>
      post<{ ok: boolean; message: string }>('/api/auth/request-reset', { email }),
    reset: (new_password: string) =>
      post<{ ok: boolean }>('/api/auth/reset', { new_password }),
  },
  products: {
    list: (params?: Record<string, string>) =>
      get<{ items: Product[]; total: number; page: number; pages: number }>(
        `/api/products?${new URLSearchParams(params ?? {}).toString()}`,
      ),
  },
  orders: {
    create: (body: OrderPayload) => post<Order>('/api/orders', body),
    get: (n: string) => get<Order>(`/api/orders/${n}`),
  },
  album: {
    fetch: () => get<{ album: Record<string, Record<number, StickerState>> }>('/api/album'),
    upsertSticker: (body: { group_id: string; sticker_n: number; owned: number; needed: number }) =>
      put<{ ok: boolean }>('/api/album/sticker', body),
    bulk: (stickers: Array<{ group_id: string; sticker_n: number; owned: number; needed: number }>) =>
      post<{ ok: boolean; count: number }>('/api/album/bulk', { stickers }),
  },
  trades: {
    matches: () => get<{ matches: TradeMatch[] }>('/api/trades/matches'),
  },
}

export { setAT, setRT, clearTokens }
