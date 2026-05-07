const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

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
  order_items?: Array<{ name: string; qty: number; price: number; product_id?: string }>
}

export const api = {
  orders: {
    create: (body: OrderPayload) =>
      request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
    get: (n: string) => request<Order>(`/api/orders/${n}`),
    external: (body: unknown) =>
      request<{ ok: boolean; orderNumber: string }>('/api/orders/external', { method: 'POST', body: JSON.stringify(body) }),
  },
}
