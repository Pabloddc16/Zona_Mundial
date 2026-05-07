'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PRODUCTS, CATEGORIES, fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/cn'

export default function TiendaPage() {
  const [cat, setCat] = useState('all')
  const [added, setAdded] = useState<string | null>(null)
  const add = useCartStore((s) => s.add)

  const visible = cat === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat)

  function handleAdd(id: string) {
    add(id)
    setAdded(id)
    setTimeout(() => setAdded(null), 1200)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-tinta mb-4">Tienda</h1>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn('shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors', cat === c.id ? 'bg-verde text-white border-verde' : 'bg-white text-gray-600 border-gray-200 hover:border-verde/50')}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
            <Link href={`/tienda/${p.id}`}>
              {p.image ? (
                <div className="relative h-36 w-full">
                  <Image src={p.image} alt={p.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-36 flex items-center justify-center text-5xl" style={{ background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }}>
                  {p.emoji}
                </div>
              )}
            </Link>
            <div className="p-3">
              {p.badge && <span className="text-[10px] font-bold uppercase tracking-wide text-rojo">{p.badge}</span>}
              <Link href={`/tienda/${p.id}`}>
                <h3 className="font-semibold text-sm text-tinta leading-tight mt-0.5 mb-1">{p.name}</h3>
              </Link>
              <div className="flex items-center justify-between">
                <span className="font-bold text-verde">{fmt(p.price)}</span>
                <button
                  onClick={() => handleAdd(p.id)}
                  className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all', added === p.id ? 'bg-verde text-white scale-90' : 'bg-verde/10 text-verde hover:bg-verde hover:text-white')}
                >
                  {added === p.id ? '✓' : '+'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-4" />
    </div>
  )
}
