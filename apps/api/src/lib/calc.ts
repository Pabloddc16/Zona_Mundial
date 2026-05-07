// Pure calculation helpers — no I/O, no HTTP, no DOM. Fully unit-testable.

export const VALID_DISCOUNT_TYPES = ['amount', 'percent'] as const
export const POS_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia'] as const
export const WHOLESALE_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'credito'] as const

export type DiscountType = (typeof VALID_DISCOUNT_TYPES)[number]
export type WholesaleSaleStatus = 'pagado' | 'parcial' | 'pendiente_credito' | 'pendiente_efectivo'

export interface DiscountInput {
  type: string
  value: number | string
}

export interface Discount {
  type: DiscountType
  value: number
  amount: number
}

export interface SaleItem {
  mode?: string
  productId?: string
  totalAmount?: number
  subtotal?: number
  quantity?: number
  unitPrice?: number
}

export interface SaleTotals {
  ok: true
  subtotal: number
  discount: Discount | null
  total: number
}

export interface SaleTotalsError {
  ok: false
  error: string
}

export function round2(n: number | string): number {
  return Math.round(Number(n) * 100) / 100
}

export function isPositiveInt(n: unknown): boolean {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 && Number.isInteger(v)
}

export function averageUnitPrice(totalAmount: number, quantity: number): number | null {
  const q = Number(quantity)
  if (!Number.isFinite(q) || q <= 0) return null
  return round2(Number(totalAmount) / q)
}

export function itemsSubtotal(items: SaleItem[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((acc, it) => {
    if (it.mode === 'total' || it.productId === 'CARTA-SUELTA') {
      return acc + Number(it.totalAmount ?? it.subtotal ?? 0)
    }
    return acc + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0)
  }, 0)
}

export function computeDiscount(
  subtotal: number,
  input: DiscountInput | null | undefined,
): { ok: true; discount: Discount | null } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: true, discount: null }
  const type = input.type as DiscountType
  const value = Number(input.value)
  if (!VALID_DISCOUNT_TYPES.includes(type)) {
    return { ok: false, error: 'Tipo de descuento inválido' }
  }
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: 'Valor de descuento inválido' }
  }
  if (type === 'percent' && value > 100) {
    return { ok: false, error: 'Porcentaje de descuento no puede superar 100' }
  }
  if (value === 0) return { ok: true, discount: null }
  const amount = type === 'percent' ? round2(subtotal * (value / 100)) : round2(value)
  if (amount > subtotal) {
    return { ok: false, error: 'Descuento no puede superar el subtotal' }
  }
  return { ok: true, discount: { type, value, amount } }
}

export function saleTotal(subtotal: number, discount: Discount | null): number {
  const d = discount ? Number(discount.amount ?? 0) : 0
  return Math.max(0, round2(subtotal - d))
}

export function computeSaleTotals(
  items: SaleItem[],
  discountInput?: DiscountInput | null,
): SaleTotals | SaleTotalsError {
  const subtotal = round2(itemsSubtotal(items))
  const r = computeDiscount(subtotal, discountInput)
  if (!r.ok) return r
  const total = saleTotal(subtotal, r.discount)
  return { ok: true, subtotal, discount: r.discount, total }
}

export function aggregateByMethod(
  sales: Array<{ paymentMethod?: string; total?: number }>,
): Record<string, number> {
  const out: Record<string, number> = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    credito: 0,
  }
  for (const s of sales ?? []) {
    const m = s.paymentMethod ?? ''
    if (m in out) out[m]! += Number(s.total ?? 0)
  }
  return out
}

export function aggregateRevenue(
  sales: Array<{ total?: number }>,
): { count: number; revenue: number } {
  return (sales ?? []).reduce(
    (acc, s) => ({ count: acc.count + 1, revenue: acc.revenue + Number(s.total ?? 0) }),
    { count: 0, revenue: 0 },
  )
}

export function wholesaleBalance(sale: { total?: number; amountPaid?: number } | null): number {
  if (!sale) return 0
  return Math.max(0, round2(Number(sale.total ?? 0) - Number(sale.amountPaid ?? 0)))
}

// Fixed: was returning 'pendiente_credito' for BOTH credit and cash no-payment cases.
export function deriveSaleStatus({
  total,
  amountPaid,
  paymentMethod,
}: {
  total: number
  amountPaid: number
  paymentMethod?: string
}): WholesaleSaleStatus {
  const t = Number(total ?? 0)
  const paid = Number(amountPaid ?? 0)
  if (paid >= t - 0.001) return 'pagado'
  if (paid > 0) return 'parcial'
  return paymentMethod === 'credito' ? 'pendiente_credito' : 'pendiente_efectivo'
}
