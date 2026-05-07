'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type Order } from '@/lib/api'
import { fmt } from '@/lib/data'

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-orange-100 text-orange-700',
  entregado: 'bg-verde/10 text-verde',
  cancelado: 'bg-rojo/10 text-rojo',
}

export default function OrdenPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.orders.get(orderNumber)
      .then(setOrder)
      .catch((e: Error) => setError(e.message))
  }, [orderNumber])

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/tienda" className="text-verde font-medium">Ir a la tienda</Link>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-verde border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-400 mt-4 text-sm">Cargando pedido...</p>
      </div>
    )
  }

  const statusClass = STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-tinta">¡Pedido confirmado!</h1>
        <p className="text-gray-500 text-sm mt-1">Recibirás tu pedido pronto</p>
        <div className="mt-3 inline-flex items-center gap-2">
          <span className="text-gray-400 text-sm">Pedido</span>
          <span className="font-mono font-bold text-tinta">#{order.order_number}</span>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Estado</span>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusClass}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 space-y-2">
        <Row label="Cliente" value={order.customer_name} />
        <Row label="Teléfono" value={order.phone} />
        {order.address && <Row label="Dirección" value={order.address} />}
        <Row label="Entrega" value={order.delivery_type === 'envio' ? 'Envío a domicilio' : 'Recoger en tienda'} />
        <Row label="Pago" value={order.payment_method} />
      </div>

      {/* Items */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
          <div className="text-sm font-medium text-gray-500 mb-2">Productos</div>
          {order.order_items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">{item.name} × {item.qty}</span>
              <span className="font-medium">{fmt(item.price * item.qty)}</span>
            </div>
          ))}
          {order.shipping > 0 && (
            <div className="flex justify-between text-sm py-1 text-gray-400">
              <span>Envío</span><span>{fmt(order.shipping)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-tinta border-t mt-2 pt-2">
            <span>Total</span><span>{fmt(order.total)}</span>
          </div>
        </div>
      )}

      <Link href="/album" className="block w-full mt-4 py-4 bg-verde text-white text-center rounded-2xl font-bold text-lg">
        Volver al álbum
      </Link>
      <Link href="/tienda" className="block text-center mt-3 text-sm text-verde font-medium mb-4">
        Seguir comprando
      </Link>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-tinta text-right max-w-[60%]">{value}</span>
    </div>
  )
}
