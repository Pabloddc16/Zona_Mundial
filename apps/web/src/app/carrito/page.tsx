'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { fmt } from '@/lib/data'

const SHIPPING = 120

export default function CarritoPage() {
  const cart = useCartStore((s) => s.cart)
  const { add, sub, remove } = useCartStore()
  const items = cartItems(cart)
  const subtotal = cartSubtotal(cart)
  const total = subtotal + SHIPPING

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-tinta mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-400 mb-6">Agrega productos de la tienda</p>
        <Link href="/tienda" className="inline-block bg-verde text-white px-8 py-3 rounded-2xl font-bold">Ir a la tienda</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-tinta mb-4">Carrito</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item!.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100">
            {item!.image ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                <Image src={item!.image} alt={item!.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0" style={{ background: `linear-gradient(135deg, ${item!.gradient[0]}, ${item!.gradient[1]})` }}>
                {item!.emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-tinta truncate">{item!.name}</div>
              <div className="text-verde font-bold text-sm">{fmt(item!.price)}</div>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => sub(item!.id)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">−</button>
                <span className="text-sm font-bold w-4 text-center">{item!.qty}</span>
                <button onClick={() => add(item!.id)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">+</button>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-tinta">{fmt(item!.price * item!.qty)}</div>
              <button onClick={() => remove(item!.id)} className="text-xs text-gray-400 hover:text-rojo mt-1">Quitar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mb-3">
          <span>Envío estimado</span><span>{fmt(SHIPPING)}</span>
        </div>
        <div className="flex justify-between font-bold text-tinta border-t pt-3">
          <span>Total</span><span>{fmt(total)}</span>
        </div>
      </div>

      <Link href="/checkout" className="block w-full mt-4 py-4 bg-rojo text-white text-center rounded-2xl font-bold text-lg hover:bg-rojo/90 active:scale-95 transition-all">
        Continuar pedido
      </Link>

      <Link href="/tienda" className="block text-center mt-3 text-sm text-verde font-medium">Seguir comprando</Link>
      <div className="h-4" />
    </div>
  )
}
