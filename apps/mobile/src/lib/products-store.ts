import { create } from 'zustand'
import { PRODUCTS, type Product } from './data'

interface ApiProduct {
  id: string
  name: string
  price: number
  cost?: number
  category?: string
  emoji?: string
  image_url?: string
  stock: number
  barcode?: string
}

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  sobre: ['#006341', '#004a30'],
  sobres: ['#006341', '#004a30'],
  album: ['#006341', '#FFD100'],
  albumes: ['#006341', '#FFD100'],
  jersey: ['#CE1126', '#8B0B1C'],
  jerseys: ['#CE1126', '#8B0B1C'],
  balon: ['#CE1126', '#FFD100'],
  balones: ['#CE1126', '#FFD100'],
  trofeo: ['#FFD100', '#C19800'],
  trofeos: ['#FFD100', '#C19800'],
  coca: ['#CE1126', '#FFD100'],
  accesorio: ['#374151', '#1C1917'],
  accesorios: ['#374151', '#1C1917'],
  pack: ['#FFD100', '#006341'],
  packs: ['#FFD100', '#006341'],
  carta: ['#006341', '#FFD100'],
  cartas: ['#006341', '#FFD100'],
}

function apiToProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category ?? 'otros',
    description: '',
    emoji: p.emoji ?? '📦',
    image: p.image_url ?? undefined,
    gradient: CATEGORY_GRADIENTS[p.category ?? ''] ?? ['#374151', '#1C1917'],
    badge: undefined,
  }
}

interface ProductsState {
  products: Product[]
  loaded: boolean
  fetch: (apiUrl: string) => Promise<void>
  getById: (id: string) => Product | undefined
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: PRODUCTS,
  loaded: false,

  fetch: async (apiUrl: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/products?limit=200`)
      if (!res.ok) return
      const data = (await res.json()) as { items: ApiProduct[] }
      if (data.items && data.items.length > 0) {
        set({ products: data.items.map(apiToProduct), loaded: true })
      }
    } catch {
      // keep hardcoded fallback
    }
  },

  getById: (id: string) => get().products.find((p) => p.id === id),
}))
