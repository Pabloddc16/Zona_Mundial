import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Product } from './data'
import { STAR_PLAYERS } from './star-players'
import { STAR_PRICING, RARITY_DISPLAY, type StarRarity } from './pricing'
import { usePaniniDraftStore } from './panini-drafts'
import { MI_PANINI_PRICE_MXN } from './mi-panini'

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
    { name: 'pablo-cart-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
)

/**
 * Resolve a cart line item to its display + pricing data.
 *
 * Three SKU families exist:
 *   • Static catalog products (ALBUM-*, SOBRE-*, etc) — live in `products`
 *   • Dynamic Star SKUs (STAR-<slug>-<RARITY>) — derived from STAR_PLAYERS + STAR_PRICING
 *   • Mi Panini customs (MI-PANINI-<orderId>) — TODO when feature ships
 *
 * Returns null for unknown IDs (caller filters them out — silent drop on the
 * checkout summary is fine since the cart UI also relies on this resolver).
 */
function resolveCartItem(id: string, products: Product[]): Product | null {
  // Static catalog lookup first — covers all DB-driven products.
  const fromProducts = products.find((x) => x.id === id)
  if (fromProducts) return fromProducts

  // Mi Panini custom card. Format: MI-PANINI-<draftId>
  // Display data comes from the draft metadata persisted in panini-drafts.
  if (id.startsWith('MI-PANINI-')) {
    const draftId = id.slice('MI-PANINI-'.length)
    const draft = usePaniniDraftStore.getState().drafts[draftId]
    return {
      id,
      name: draft
        ? `Mi Panini · ${draft.playerName || 'Sin nombre'} (${draft.cardType})`
        : 'Mi Panini · Sticker custom',
      price: MI_PANINI_PRICE_MXN,
      category: 'mi-panini',
      description: draft
        ? `${draft.country} · PAC ${draft.stats.pace} TIR ${draft.stats.shooting} PAS ${draft.stats.passing} DEF ${draft.stats.defending}`
        : '',
      emoji: '📸',
      gradient: ['#FFD100', '#806100'],
    }
  }

  // Dynamic Star SKU. Format: STAR-<slug>-<RARITY>
  if (id.startsWith('STAR-')) {
    const rest = id.slice('STAR-'.length)
    const lastDash = rest.lastIndexOf('-')
    if (lastDash > 0) {
      const slug = rest.slice(0, lastDash)
      const rarity = rest.slice(lastDash + 1) as StarRarity
      const player = STAR_PLAYERS.find((p) => p.slug === slug)
      const price = player ? STAR_PRICING[player.tier]?.[rarity] : 0
      if (player && price && price > 0) {
        const rd = RARITY_DISPLAY[rarity]
        return {
          id,
          name: `${player.name} · ${rd?.label ?? rarity}`,
          price,
          category: 'estampas',
          description: `${player.country} · ${player.tier}`,
          emoji: '⭐',
          gradient: ['#006341', '#FFD100'],
        }
      }
    }
  }

  return null
}

export function cartItems(cart: Record<string, number>, products: Product[]) {
  return Object.entries(cart)
    .map(([id, qty]) => {
      const p = resolveCartItem(id, products)
      return p ? { ...p, qty } : null
    })
    .filter(Boolean) as Array<Product & { qty: number }>
}

export function cartCount(cart: Record<string, number>) {
  return Object.values(cart).reduce((s, q) => s + q, 0)
}

export function cartSubtotal(cart: Record<string, number>, products: Product[]) {
  return cartItems(cart, products).reduce((s, i) => s + i.price * i.qty, 0)
}
