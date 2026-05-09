import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'

type MovementType = 'purchase_in' | 'transfer' | 'conversion_out' | 'conversion_in' | 'sale' | 'adjustment'

interface MovementInput {
  sku_id: string
  qty: number
  location_from?: string | null
  location_to?: string | null
  type: MovementType
  ref_table: string
  ref_id: string
  unit_cost?: number | null
  note?: string | null
  created_by?: string | null
}

export async function recordMovement(input: MovementInput) {
  const sb = getClient()

  // Validate sufficient stock at source
  if (input.location_from) {
    const { data: stockRow } = await sb
      .from('stock')
      .select('qty')
      .eq('sku_id', input.sku_id)
      .eq('location_id', input.location_from)
      .single()

    const available = (stockRow as { qty?: number } | null)?.qty ?? 0
    if (available < input.qty) {
      throw new Error(
        `Stock insuficiente en ${input.location_from}: disponible ${available}, requerido ${input.qty}`
      )
    }
  }

  const { error } = await sb.from('movements').insert({
    id: randomUUID(),
    ...input,
  })

  if (error) throw new Error(`Error registrando movimiento: ${error.message}`)

  await refreshStock()

  if (input.location_to && input.unit_cost) {
    await updateAvgCost(input.sku_id, input.location_to, input.qty, input.unit_cost)
  }
}

export async function recordMovements(inputs: MovementInput[]) {
  const sb = getClient()

  for (const input of inputs) {
    if (input.location_from) {
      const { data: stockRow } = await sb
        .from('stock')
        .select('qty')
        .eq('sku_id', input.sku_id)
        .eq('location_id', input.location_from)
        .single()

      const available = (stockRow as { qty?: number } | null)?.qty ?? 0
      if (available < input.qty) {
        throw new Error(
          `Stock insuficiente: SKU ${input.sku_id} en ${input.location_from}: disponible ${available}, requerido ${input.qty}`
        )
      }
    }
  }

  const rows = inputs.map((i) => ({ id: randomUUID(), ...i }))
  const { error } = await sb.from('movements').insert(rows)
  if (error) throw new Error(`Error registrando movimientos: ${error.message}`)

  await refreshStock()

  for (const input of inputs) {
    if (input.location_to && input.unit_cost) {
      await updateAvgCost(input.sku_id, input.location_to, input.qty, input.unit_cost)
    }
  }
}

export async function refreshStock() {
  const sb = getClient()
  await sb.rpc('refresh_stock' as never)
}

async function updateAvgCost(skuId: string, locationId: string, inboundQty: number, inboundCost: number) {
  const sb = getClient()
  const { data: existing } = await sb
    .from('avg_costs')
    .select('avg_cost, qty')
    .eq('sku_id', skuId)
    .eq('location_id', locationId)
    .single()

  const prevQty = (existing as { qty?: number } | null)?.qty ?? 0
  const prevCost = (existing as { avg_cost?: number } | null)?.avg_cost ?? 0
  const newQty = prevQty + inboundQty
  const newAvg = newQty > 0 ? (prevCost * prevQty + inboundCost * inboundQty) / newQty : inboundCost

  await sb.from('avg_costs').upsert({
    sku_id: skuId,
    location_id: locationId,
    avg_cost: newAvg,
    qty: newQty,
    updated_at: new Date().toISOString(),
  })
}

export async function getStock(skuId?: string, locationId?: string) {
  const sb = getClient()
  let q = sb
    .from('stock')
    .select('sku_id, location_id, qty, products(name, sku, unit_type), locations(name, type)')

  if (skuId) q = q.eq('sku_id', skuId) as typeof q
  if (locationId) q = q.eq('location_id', locationId) as typeof q

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}
