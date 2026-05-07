import { describe, it, expect } from 'vitest'
import {
  itemsSubtotal,
  computeDiscount,
  saleTotal,
  computeSaleTotals,
  aggregateRevenue,
  aggregateByMethod,
  wholesaleBalance,
  deriveSaleStatus,
  round2,
  averageUnitPrice,
} from '../src/lib/calc'

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.234)).toBe(1.23)
    expect(round2(1.236)).toBe(1.24)
    expect(round2(100)).toBe(100)
  })
})

describe('itemsSubtotal', () => {
  it('sums quantity × unit price items', () => {
    expect(itemsSubtotal([
      { quantity: 2, unitPrice: 25 },
      { quantity: 3, unitPrice: 10 },
    ])).toBe(80)
  })

  it('handles total-mode items', () => {
    expect(itemsSubtotal([{ mode: 'total', totalAmount: 500 }])).toBe(500)
  })

  it('returns 0 for empty array', () => {
    expect(itemsSubtotal([])).toBe(0)
  })
})

describe('computeDiscount', () => {
  it('applies percent discount', () => {
    const r = computeDiscount(1000, { type: 'percent', value: 10 })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.discount?.amount).toBe(100)
  })

  it('applies fixed amount discount', () => {
    const r = computeDiscount(1000, { type: 'amount', value: 150 })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.discount?.amount).toBe(150)
  })

  it('rejects discount exceeding subtotal', () => {
    const r = computeDiscount(100, { type: 'amount', value: 200 })
    expect(r.ok).toBe(false)
  })

  it('rejects percent > 100', () => {
    const r = computeDiscount(1000, { type: 'percent', value: 101 })
    expect(r.ok).toBe(false)
  })

  it('returns null discount for null input', () => {
    const r = computeDiscount(500, null)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.discount).toBeNull()
  })

  it('rejects invalid discount type', () => {
    const r = computeDiscount(500, { type: 'invalid', value: 10 })
    expect(r.ok).toBe(false)
  })
})

describe('saleTotal', () => {
  it('total = subtotal - discount.amount', () => {
    expect(saleTotal(1000, { type: 'amount', value: 100, amount: 100 })).toBe(900)
  })

  it('never negative', () => {
    expect(saleTotal(50, { type: 'amount', value: 200, amount: 200 })).toBe(0)
  })

  it('handles null discount', () => {
    expect(saleTotal(500, null)).toBe(500)
  })
})

describe('computeSaleTotals', () => {
  it('computes full sale totals', () => {
    const r = computeSaleTotals(
      [{ quantity: 4, unitPrice: 25 }],
      { type: 'percent', value: 10 },
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.subtotal).toBe(100)
      expect(r.discount?.amount).toBe(10)
      expect(r.total).toBe(90)
    }
  })

  it('propagates discount error', () => {
    const r = computeSaleTotals(
      [{ quantity: 1, unitPrice: 100 }],
      { type: 'percent', value: 999 },
    )
    expect(r.ok).toBe(false)
  })
})

describe('aggregateRevenue', () => {
  it('counts and sums sales', () => {
    const r = aggregateRevenue([{ total: 100 }, { total: 200 }, { total: 50 }])
    expect(r.count).toBe(3)
    expect(r.revenue).toBe(350)
  })
})

describe('aggregateByMethod', () => {
  it('buckets sales by payment method', () => {
    const r = aggregateByMethod([
      { paymentMethod: 'efectivo', total: 100 },
      { paymentMethod: 'tarjeta', total: 200 },
      { paymentMethod: 'efectivo', total: 50 },
    ])
    expect(r['efectivo']).toBe(150)
    expect(r['tarjeta']).toBe(200)
  })
})

describe('wholesaleBalance', () => {
  it('computes unpaid balance', () => {
    expect(wholesaleBalance({ total: 1000, amountPaid: 300 })).toBe(700)
  })
  it('returns 0 when fully paid', () => {
    expect(wholesaleBalance({ total: 500, amountPaid: 500 })).toBe(0)
  })
})

describe('deriveSaleStatus', () => {
  it('paid when amountPaid >= total', () => {
    expect(deriveSaleStatus({ total: 100, amountPaid: 100 })).toBe('pagado')
  })
  it('parcial when partial payment', () => {
    expect(deriveSaleStatus({ total: 100, amountPaid: 50 })).toBe('parcial')
  })
  it('pendiente_credito when credit method and no payment', () => {
    expect(deriveSaleStatus({ total: 100, amountPaid: 0, paymentMethod: 'credito' })).toBe('pendiente_credito')
  })
  it('pendiente_efectivo when no payment and non-credit method', () => {
    expect(deriveSaleStatus({ total: 100, amountPaid: 0, paymentMethod: 'efectivo' })).toBe('pendiente_efectivo')
  })
})

describe('averageUnitPrice', () => {
  it('divides total by quantity', () => {
    expect(averageUnitPrice(100, 4)).toBe(25)
  })
  it('returns null for zero qty', () => {
    expect(averageUnitPrice(100, 0)).toBeNull()
  })
})
