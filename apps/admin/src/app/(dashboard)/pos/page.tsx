'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Trash2, Receipt } from 'lucide-react'

interface CartItem { product: Product; quantity: number; unit_price: number }

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function POSPage() {
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [customerName, setCustomerName] = useState('')
  const [success, setSuccess] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: products } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.products.list({ q: search, limit: '30' }),
    enabled: search.length >= 1,
  })

  const saleMut = useMutation({
    mutationFn: (body: unknown) => api.sales.create(body),
    onSuccess: () => {
      setCart([])
      setCustomerName('')
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['sales'] })
      setTimeout(() => setSuccess(false), 3000)
      searchRef.current?.focus()
    },
  })

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unit_price: product.price }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product.id !== id))
    else setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }

  function setPrice(id: string, price: number) {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, unit_price: price } : i))
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  function checkout() {
    if (cart.length === 0) return
    const items = cart.map((i) => ({
      product_id: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: Math.round(i.quantity * i.unit_price * 100) / 100,
      mode: 'unit',
    }))
    saleMut.mutate({ items, payment_method: payment, customer_name: customerName })
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left — product search */}
      <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Punto de venta</h1>
        <Input
          ref={searchRef}
          placeholder="Buscar producto por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-4"
        />
        {success && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
            Venta registrada correctamente
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {products?.items.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="text-left rounded-lg border border-gray-200 bg-white p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors"
            >
              <div className="text-2xl mb-1">{p.emoji ?? '📦'}</div>
              <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{fmt(p.price)}</div>
              <div className="mt-1">
                <Badge variant={p.stock > 5 ? 'success' : p.stock > 0 ? 'warning' : 'danger'} className="text-xs">
                  Stock: {p.stock}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — cart */}
      <div className="w-80 flex flex-col border-l border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Ticket
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-8">Agrega productos</p>
          )}
          {cart.map((item) => (
            <div key={item.product.id} className="rounded-md border border-gray-100 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 flex-1">{item.product.emoji} {item.product.name}</span>
                <button onClick={() => setQty(item.product.id, 0)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(item.product.id, item.quantity - 1)} className="rounded border border-gray-200 p-0.5 hover:bg-gray-100">
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => setQty(item.product.id, Number(e.target.value))}
                  className="w-12 rounded border border-gray-200 px-1.5 py-0.5 text-center text-sm"
                  min={1}
                />
                <button onClick={() => setQty(item.product.id, item.quantity + 1)} className="rounded border border-gray-200 p-0.5 hover:bg-gray-100">
                  <Plus className="h-3 w-3" />
                </button>
                <span className="text-xs text-gray-500">×</span>
                <input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => setPrice(item.product.id, Number(e.target.value))}
                  className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-right text-sm"
                  step="0.01"
                  min={0}
                />
              </div>
              <div className="text-right text-xs font-medium text-gray-600">
                {fmt(item.quantity * item.unit_price)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 p-4 space-y-3">
          <Input
            placeholder="Nombre del cliente (opcional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </Select>
          <div className="flex items-center justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
          <Button
            className="w-full"
            disabled={cart.length === 0 || saleMut.isPending}
            onClick={checkout}
          >
            {saleMut.isPending ? 'Procesando...' : 'Cobrar'}
          </Button>
          {saleMut.isError && (
            <p className="text-xs text-red-600 text-center">
              {(saleMut.error as Error).message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
