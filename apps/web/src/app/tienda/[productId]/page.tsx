'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { productById, fmt } from '@/lib/data'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/cn'

export default function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params)
  const product = productById(productId)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const add = useCartStore((s) => s.add)

  if (!product) return <div className="p-8 text-center text-gray-400">Producto no encontrado</div>

  function handleAdd() {
    add(product!.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero */}
      {product.image ? (
        <div className="relative h-64 w-full">
          <Image src={product.image} alt={product.name} fill className="object-cover" />
          <Link href="/tienda" className="absolute top-4 left-4 p-2 bg-white/90 rounded-xl shadow">
            <ChevronLeft />
          </Link>
        </div>
      ) : (
        <div className="relative h-64 flex items-center justify-center text-7xl" style={{ background: `linear-gradient(135deg, ${product.gradient[0]}, ${product.gradient[1]})` }}>
          {product.emoji}
          <Link href="/tienda" className="absolute top-4 left-4 p-2 bg-white/90 rounded-xl shadow">
            <ChevronLeft />
          </Link>
        </div>
      )}

      {/* Info */}
      <div className="px-4 pt-4">
        {product.badge && <span className="text-xs font-bold uppercase tracking-wide text-rojo">{product.badge}</span>}
        <h1 className="text-2xl font-bold text-tinta mt-1">{product.name}</h1>
        <p className="text-gray-500 mt-1 text-sm">{product.description}</p>
        <div className="text-3xl font-bold text-verde mt-3">{fmt(product.price)}</div>

        {/* Qty selector */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm font-medium text-gray-500">Cantidad</span>
          <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg text-gray-700 disabled:opacity-30" disabled={qty <= 1}>−</button>
            <span className="w-6 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-lg text-gray-700">+</button>
          </div>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          className={cn('w-full mt-6 py-4 rounded-2xl font-bold text-lg transition-all', added ? 'bg-verde text-white' : 'bg-rojo text-white hover:bg-rojo/90 active:scale-95')}
        >
          {added ? '✓ Agregado al carrito' : `Agregar ${qty > 1 ? `(${qty})` : ''} — ${fmt(product.price * qty)}`}
        </button>

        <Link href="/carrito" className="block text-center mt-3 text-sm text-verde font-medium">Ver carrito</Link>
      </div>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}
