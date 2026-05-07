import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'
import { productById } from './data'

const storage = new MMKV({ id: 'pablo-cart' })
const mmkvStorage = {
  setItem: (key: string, value: string) => storage.set(key, value),
  getItem: (key: string) => storage.getString(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
}

interface CartStore {
  cart: Record<string, number>
  add: (id: string, qty?: number) => void
  sub: (id: string) => void
  remove: (id: string) => void
  clear: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: {},
      add: (id, qty = 1) => set((s) => ({ cart: { ...s.cart, [id]: (s.cart[id] ?? 0) + qty } })),
      sub: (id) => set((s) => {
        const n = Math.max(0, (s.cart[id] ?? 0) - 1)
        const cart = { ...s.cart }
        if (n === 0) delete cart[id]
        else cart[id] = n
        return { cart }
      }),
      remove: (id) => set((s) => { const cart = { ...s.cart }; delete cart[id]; return { cart } }),
      clear: () => set({ cart: {} }),
    }),
    { name: 'pablo-cart-v1', storage: createJSONStorage(() => mmkvStorage) },
  ),
)

export function cartItems(cart: Record<string, number>) {
  return Object.entries(cart)
    .map(([id, qty]) => { const p = productById(id); return p ? { ...p, qty } : null })
    .filter(Boolean) as Array<ReturnType<typeof productById> & { qty: number }>
}

export function cartCount(cart: Record<string, number>) {
  return Object.values(cart).reduce((s, q) => s + q, 0)
}

export function cartSubtotal(cart: Record<string, number>) {
  return cartItems(cart).reduce((s, i) => s + i!.price * i!.qty, 0)
}
