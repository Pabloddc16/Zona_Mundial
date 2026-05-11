'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Product, type Sale } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Trash2, Receipt, History, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'

interface CartItem { product: Product; quantity: number; unit_price: number }

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

type Tab = 'pos' | 'history'

export default function POSPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('pos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [customerName, setCustomerName] = useState('')
  const [isWholesale, setIsWholesale] = useState(false)
  const [discountPct, setDiscountPct] = useState(0)
  const [success, setSuccess] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)

  const { data: products } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () => api.products.list({ q: search, limit: '30' }),
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['sales-history', historyPage],
    queryFn: () => api.sales.list({ page: String(historyPage), limit: '20' }),
    enabled: tab === 'history',
  })

  const saleMut = useMutation({
    mutationFn: (body: unknown) => api.sales.create(body),
    onSuccess: () => {
      setCart([])
      setCustomerName('')
      setIsWholesale(false)
      setDiscountPct(0)
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sales-history'] })
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.sales.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-history'] }),
  })

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, unit_price: product.price }]
    })
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product.id !== id))
    else setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: qty } : i))
  }

  function setPrice(id: string, price: number) {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, unit_price: price } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discountAmount = isWholesale && discountPct > 0 ? Math.round(subtotal * discountPct) / 100 : 0
  const total = subtotal - discountAmount

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
    const body: Record<string, unknown> = { items, payment_method: payment, customer_name: customerName }
    if (isWholesale && discountPct > 0) {
      body['discount_type'] = 'percent'
      body['discount_value'] = discountPct
    }
    saleMut.mutate(body)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-white/8 px-6 pt-4 gap-4">
        <button
          onClick={() => setTab('pos')}
          className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'pos' ? 'border-brand-400 text-brand-400' : 'border-transparent text-white/50 hover:text-white/70'}`}
        >
          <ShoppingCart className="h-4 w-4" /> Point of Sale
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-brand-400 text-brand-400' : 'border-transparent text-white/50 hover:text-white/70'}`}
        >
          <History className="h-4 w-4" /> Sales History
        </button>
      </div>

      {tab === 'pos' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — product grid */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-white/8">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="mb-4"
            />
            {success && (
              <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400 font-medium">
                Sale recorded successfully
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {products?.items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="text-left rounded-lg border border-white/8 bg-surface-elevated p-3 hover:border-brand-400 hover:bg-brand-50/5 transition-colors"
                >
                  {(p as unknown as Record<string, string>)['image_url'] ? (
                    <img
                      src={(p as unknown as Record<string, string>)['image_url']}
                      alt={p.name}
                      className="h-16 w-full rounded object-cover mb-2"
                    />
                  ) : (
                    <div className="text-2xl mb-1">{p.emoji ?? '📦'}</div>
                  )}
                  <div className="text-sm font-medium text-white/90 truncate">{p.name}</div>
                  <div className="text-xs text-white/50 mt-0.5">{fmt(p.price)}</div>
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
          <div className="w-80 flex flex-col border-l border-white/8 bg-surface-elevated">
            <div className="p-4 border-b border-white/8">
              <h2 className="font-semibold text-white/90 flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Ticket
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 && (
                <p className="text-center text-sm text-white/40 mt-8">Add products from the left</p>
              )}
              {cart.map((item) => (
                <div key={item.product.id} className="rounded-md border border-white/8 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-white/90 flex-1">{item.product.emoji} {item.product.name}</span>
                    <button onClick={() => setQty(item.product.id, 0)} className="text-white/30 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(item.product.id, item.quantity - 1)} className="rounded border border-white/8 p-0.5 hover:bg-white/8 text-white/70">
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setQty(item.product.id, Number(e.target.value))}
                      className="w-12 rounded border border-white/8 bg-transparent px-1.5 py-0.5 text-center text-sm text-white/90"
                      min={1}
                    />
                    <button onClick={() => setQty(item.product.id, item.quantity + 1)} className="rounded border border-white/8 p-0.5 hover:bg-white/8 text-white/70">
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-xs text-white/50">×</span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => setPrice(item.product.id, Number(e.target.value))}
                      className="w-20 rounded border border-white/8 bg-transparent px-1.5 py-0.5 text-right text-sm text-white/90"
                      step="0.01"
                      min={0}
                    />
                  </div>
                  <div className="text-right text-xs font-medium text-white/60">
                    {fmt(item.quantity * item.unit_price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/8 p-4 space-y-3">
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="efectivo">Cash</option>
                <option value="tarjeta">Card</option>
                <option value="transferencia">Transfer</option>
              </Select>

              {/* Wholesale / discount toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWholesale}
                  onChange={(e) => { setIsWholesale(e.target.checked); if (!e.target.checked) setDiscountPct(0) }}
                  className="rounded border-white/20 bg-transparent"
                />
                <span className="text-sm text-white/70">Wholesale sale (apply discount)</span>
              </label>
              {isWholesale && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Discount %</span>
                  <input
                    type="number"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-20 rounded border border-white/8 bg-transparent px-2 py-1 text-sm text-white/90"
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className="text-sm text-white/50">= {fmt(discountAmount)} off</span>
                </div>
              )}

              {isWholesale && discountPct > 0 && (
                <div className="flex items-center justify-between text-sm text-white/50">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold text-white/90">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
              <Button
                className="w-full"
                disabled={cart.length === 0 || saleMut.isPending}
                onClick={checkout}
              >
                {saleMut.isPending ? 'Processing...' : 'Charge'}
              </Button>
              {saleMut.isError && (
                <p className="text-xs text-red-400 text-center">
                  {(saleMut.error as Error).message}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white/90">POS Sales History</h2>
          {historyLoading && <p className="text-white/40 text-sm">Loading...</p>}
          <div className="space-y-2">
            {history?.items.map((sale: Sale) => (
              <SaleRow key={sale.id} sale={sale} onDelete={(id) => {
                if (confirm('Delete this sale and restore stock?')) deleteMut.mutate(id)
              }} />
            ))}
            {history?.items.length === 0 && (
              <p className="text-center text-white/40 text-sm py-8">No sales yet</p>
            )}
          </div>
          {(history?.pages ?? 1) > 1 && (
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="ghost" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-white/50 self-center">Page {historyPage} of {history?.pages}</span>
              <Button size="sm" variant="ghost" disabled={historyPage >= (history?.pages ?? 1)} onClick={() => setHistoryPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SaleRow({ sale, onDelete }: { sale: Sale; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  return (
    <div className="rounded-lg border border-white/8 bg-surface-elevated p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/90">{fmt(sale.total)}</span>
          <span className="text-xs text-white/50">{sale.payment_method} · {format(new Date(sale.created_at), 'MM/dd/yy HH:mm')}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Details'}
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => onDelete(sale.id)}>
            Delete
          </Button>
        </div>
      </div>
      {open && sale.sale_items && (
        <div className="mt-3 border-t border-white/8 pt-3 space-y-1">
          {sale.sale_items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-white/60">
              <span>{item.name} × {item.quantity}</span>
              <span>{fmt(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
