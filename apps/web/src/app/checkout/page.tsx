'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore, cartItems, cartSubtotal } from '@/lib/cart-store'
import { api, type OrderPayload } from '@/lib/api'
import { fmt } from '@/lib/data'
import { cn } from '@/lib/cn'

const SHIPPING = 120
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta'] as const

export default function CheckoutPage() {
  const router = useRouter()
  const cart = useCartStore((s) => s.cart)
  const clear = useCartStore((s) => s.clear)
  const items = cartItems(cart)
  const subtotal = cartSubtotal(cart)

  const [form, setForm] = useState({ name: '', phone: '', address: '', payment: 'Efectivo' as string, notes: '', deliveryType: 'envio' as 'local' | 'envio', referral: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const shipping = form.deliveryType === 'envio' ? SHIPPING : 0
  const total = subtotal + shipping

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { setError('Nombre y teléfono requeridos'); return }
    if (form.deliveryType === 'envio' && !form.address.trim()) { setError('Dirección requerida para envío'); return }
    if (items.length === 0) { setError('El carrito está vacío'); return }

    setLoading(true)
    setError('')

    try {
      const notesVal = form.notes.trim()
      const referralVal = form.referral.trim()
      const payload: OrderPayload = {
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        delivery_type: form.deliveryType,
        payment_method: form.payment,
        shipping,
        items: items.map((i) => ({ product_id: i!.id, name: i!.name, qty: i!.qty, price: i!.price })),
        ...(notesVal ? { notes: notesVal } : {}),
        ...(referralVal ? { referral_code: referralVal } : {}),
      }
      const order = await api.orders.create(payload)
      clear()
      router.push(`/orden/${order.order_number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar pedido')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return <div className="p-8 text-center text-gray-400">El carrito está vacío. <a href="/tienda" className="text-verde underline">Ir a la tienda</a></div>
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-tinta mb-4">Tu pedido</h1>

      <form onSubmit={submit} className="space-y-4">
        {/* Delivery type */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Tipo de entrega</label>
          <div className="grid grid-cols-2 gap-2">
            {(['envio', 'local'] as const).map((t) => (
              <button key={t} type="button" onClick={() => set('deliveryType', t)} className={cn('py-3 rounded-xl border-2 text-sm font-medium transition-colors', form.deliveryType === t ? 'border-verde bg-verde/5 text-verde' : 'border-gray-200 text-gray-500')}>
                {t === 'envio' ? '📦 Envío a domicilio' : '🏪 Recoger en tienda'}
              </button>
            ))}
          </div>
        </div>

        {/* Customer info */}
        <Field label="Nombre completo" value={form.name} onChange={(v) => set('name', v)} placeholder="Juan García" required />
        <Field label="Teléfono / WhatsApp" value={form.phone} onChange={(v) => set('phone', v)} placeholder="55 1234 5678" type="tel" required />
        {form.deliveryType === 'envio' && (
          <Field label="Dirección de entrega" value={form.address} onChange={(v) => set('address', v)} placeholder="Calle, número, colonia, municipio" required />
        )}

        {/* Payment */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} type="button" onClick={() => set('payment', m)} className={cn('py-2.5 rounded-xl border-2 text-sm font-medium transition-colors', form.payment === m ? 'border-verde bg-verde/5 text-verde' : 'border-gray-200 text-gray-500')}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Notes + referral */}
        <Field label="Notas (opcional)" value={form.notes} onChange={(v) => set('notes', v)} placeholder="Instrucciones especiales..." />
        <Field label="Código de referido (opcional)" value={form.referral} onChange={(v) => set('referral', v)} placeholder="AMIGO123" />

        {/* Order summary */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Resumen</div>
          {items.map((i) => (
            <div key={i!.id} className="flex justify-between text-sm py-0.5">
              <span className="text-gray-600">{i!.name} × {i!.qty}</span>
              <span className="font-medium">{fmt(i!.price * i!.qty)}</span>
            </div>
          ))}
          {shipping > 0 && (
            <div className="flex justify-between text-sm py-0.5">
              <span className="text-gray-500">Envío</span><span>{fmt(shipping)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-tinta border-t mt-2 pt-2">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        {error && <p className="text-rojo text-sm bg-rojo/5 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading} className="w-full py-4 bg-rojo text-white rounded-2xl font-bold text-lg disabled:opacity-50 hover:bg-rojo/90 active:scale-95 transition-all">
          {loading ? 'Procesando...' : `Confirmar pedido — ${fmt(total)}`}
        </button>
      </form>

      <div className="h-4" />
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}{required && <span className="text-rojo ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-verde/30 focus:border-verde text-sm bg-white"
      />
    </div>
  )
}
