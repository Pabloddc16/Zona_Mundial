import { getClient } from '@pablo/db'

const sb = getClient()
const now = () => new Date().toISOString()
const uid = (prefix: string, n: number) => `seed_${prefix}_${String(n).padStart(3, '0')}`

async function clean() {
  console.log('Cleaning seed data...')
  const tables = [
    'order_items', 'orders',
    'sale_items', 'sales',
    'wholesale_sale_items', 'wholesale_payments', 'wholesale_sales',
    'stock_adjustments', 'products',
    'customers', 'deliverers', 'wholesalers',
    'expenses', 'returns',
  ]
  for (const t of tables) {
    await sb.from(t).delete().like('id', 'seed_%')
  }
  // order_items and similar use bigserial — clean by order ref
  await sb.from('order_items').delete().like('order_number', 'seed_%')
  await sb.from('sale_items').delete().in('sale_id', (await sb.from('sales').select('id').like('id', 'seed_%')).data?.map(r => r.id) ?? [])
  console.log('Cleaned.')
}

// ─── Products ────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: 'Álbum Mundial 2026 Oficial', category: 'album', emoji: '📚', price: 180, cost: 90, stock: 120 },
  { name: 'Sobre Estampas x5', category: 'sobre', emoji: '✉️', price: 18, cost: 8, stock: 800 },
  { name: 'Sobre Estampas x10', category: 'sobre', emoji: '📦', price: 35, cost: 15, stock: 500 },
  { name: 'Caja Estampas x50 Sobres', category: 'caja', emoji: '🎁', price: 160, cost: 70, stock: 80 },
  { name: 'Set Completo Estampas (670 láminas)', category: 'set', emoji: '⭐', price: 850, cost: 400, stock: 30 },
  { name: 'Jersey México Local 2026', category: 'jersey', emoji: '🟢', price: 650, cost: 280, stock: 45 },
  { name: 'Jersey México Visita 2026', category: 'jersey', emoji: '⚪', price: 650, cost: 280, stock: 38 },
  { name: 'Jersey Argentina 2026', category: 'jersey', emoji: '🔵', price: 620, cost: 270, stock: 22 },
  { name: 'Jersey Brasil 2026', category: 'jersey', emoji: '💛', price: 620, cost: 270, stock: 18 },
  { name: 'Jersey España 2026', category: 'jersey', emoji: '🔴', price: 620, cost: 270, stock: 15 },
  { name: 'Jersey Francia 2026', category: 'jersey', emoji: '🫐', price: 620, cost: 270, stock: 20 },
  { name: 'Playera Fan México', category: 'playera', emoji: '👕', price: 280, cost: 120, stock: 60 },
  { name: 'Gorra México 2026', category: 'gorra', emoji: '🧢', price: 220, cost: 95, stock: 55 },
  { name: 'Bufanda México', category: 'bufanda', emoji: '🧣', price: 150, cost: 65, stock: 40 },
  { name: 'Bandera México 90x150', category: 'bandera', emoji: '🏳️', price: 120, cost: 50, stock: 75 },
  { name: 'Bandera Argentina 90x150', category: 'bandera', emoji: '🏳️', price: 120, cost: 50, stock: 35 },
  { name: 'Bandera Brasil 90x150', category: 'bandera', emoji: '🏳️', price: 120, cost: 50, stock: 30 },
  { name: 'Mini Balón Panini', category: 'accesorio', emoji: '⚽', price: 320, cost: 140, stock: 25 },
  { name: 'Llavero Escudo México', category: 'llavero', emoji: '🔑', price: 45, cost: 18, stock: 150 },
  { name: 'Llavero Balón Mundial', category: 'llavero', emoji: '⚽', price: 45, cost: 18, stock: 130 },
  { name: 'Magneto Selección México', category: 'accesorio', emoji: '🧲', price: 35, cost: 14, stock: 200 },
  { name: 'Taza Selección México', category: 'accesorio', emoji: '☕', price: 180, cost: 75, stock: 40 },
  { name: 'Cuaderno Mundial 2026', category: 'papeleria', emoji: '📓', price: 95, cost: 40, stock: 60 },
  { name: 'Poster Selección México A2', category: 'poster', emoji: '🖼️', price: 75, cost: 28, stock: 90 },
  { name: 'Poster Todos los Equipos A1', category: 'poster', emoji: '🖼️', price: 130, cost: 55, stock: 50 },
  { name: 'Pack Coleccionista (álbum + 10 sobres)', category: 'pack', emoji: '🎀', price: 350, cost: 160, stock: 35 },
  { name: 'Pack Fan México (jersey + gorra + bufanda)', category: 'pack', emoji: '🎽', price: 980, cost: 440, stock: 15 },
  { name: 'Sticker Holo México (5 pzas)', category: 'sticker', emoji: '✨', price: 55, cost: 20, stock: 180 },
  { name: 'Tarjeta Coleccionable Oro (1 pza)', category: 'coleccion', emoji: '🥇', price: 120, cost: 50, stock: 65 },
  { name: 'Tarjeta Coleccionable Plata (1 pza)', category: 'coleccion', emoji: '🥈', price: 65, cost: 25, stock: 90 },
]

async function seedProducts() {
  console.log('Seeding products...')
  const rows = PRODUCTS.map((p, i) => ({
    id: uid('prod', i + 1),
    ...p,
    supplier: 'Panini México',
    created_at: now(),
    updated_at: now(),
  }))
  const { error } = await sb.from('products').upsert(rows)
  if (error) throw new Error(`products: ${error.message}`)
  console.log(`  ${rows.length} products inserted`)
  return rows
}

// ─── Customers ───────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { name: 'Carlos Mendoza', phone: '3312345678', email: 'carlos.m@gmail.com', address: 'Av. Juárez 123, Guadalajara' },
  { name: 'Sofía Ramírez', phone: '3398765432', email: 'sofia.r@hotmail.com', address: 'Calle Morelos 45, Zapopan' },
  { name: 'Luis Hernández', phone: '3311223344', email: 'luis.h@gmail.com', address: 'López Mateos 890, Guadalajara' },
  { name: 'Ana García', phone: '3355443322', email: 'ana.g@outlook.com', address: 'Insurgentes 234, Tlaquepaque' },
  { name: 'Pedro Torres', phone: '3377889900', email: 'pedro.t@gmail.com', address: 'Hidalgo 56, Tonalá' },
  { name: 'María López', phone: '3322113300', email: 'maria.l@gmail.com', address: 'Reforma 789, Guadalajara' },
  { name: 'Juan Martínez', phone: '3344556677', email: 'juan.m@yahoo.com', address: 'Av. México 321, Zapopan' },
  { name: 'Laura Sánchez', phone: '3366778899', email: 'laura.s@gmail.com', address: 'Federalismo 654, Guadalajara' },
  { name: 'Roberto Jiménez', phone: '3300112233', email: 'roberto.j@gmail.com', address: 'Vallarta 987, Guadalajara' },
  { name: 'Carmen Flores', phone: '3388990011', email: 'carmen.f@hotmail.com', address: 'Patria 147, Zapopan' },
]

async function seedCustomers() {
  console.log('Seeding customers...')
  const rows = CUSTOMERS.map((c, i) => ({
    id: uid('cust', i + 1),
    ...c,
    member_since: '2026-01-01',
    total_orders: 0,
    total_spent: 0,
    created_at: now(),
  }))
  const { error } = await sb.from('customers').upsert(rows)
  if (error) throw new Error(`customers: ${error.message}`)
  console.log(`  ${rows.length} customers inserted`)
  return rows
}

// ─── Deliverers ──────────────────────────────────────────────────────────────

const DELIVERERS = [
  { name: 'Miguel Ángel Ruiz', phone: '3312341234', username: 'repartidor1', vehicle: 'Moto Honda', plate: 'JAL-001', zone: 'Norte' },
  { name: 'Fernando Castro', phone: '3398769876', username: 'repartidor2', vehicle: 'Moto Yamaha', plate: 'JAL-002', zone: 'Sur' },
  { name: 'Jorge Morales', phone: '3311221122', username: 'repartidor3', vehicle: 'Bicicleta', plate: '', zone: 'Centro' },
  { name: 'Eduardo Vega', phone: '3355445544', username: 'repartidor4', vehicle: 'Moto Suzuki', plate: 'JAL-003', zone: 'Zapopan' },
]

async function seedDeliverers() {
  console.log('Seeding deliverers...')
  const rows = DELIVERERS.map((d, i) => ({
    id: uid('deliv', i + 1),
    ...d,
    status: 'DISPONIBLE',
    rating: 4.5,
    deliveries_today: 0,
    deliveries_total: 0,
    created_at: now(),
  }))
  const { error } = await sb.from('deliverers').upsert(rows)
  if (error) throw new Error(`deliverers: ${error.message}`)
  console.log(`  ${rows.length} deliverers inserted`)
  return rows
}

// ─── Wholesalers ─────────────────────────────────────────────────────────────

const WHOLESALERS = [
  { razon_social: 'Distribuidora Norte S.A. de C.V.', rfc: 'DNO160101AB1', email: 'compras@disnorte.mx', contacto: 'Ricardo Peña', regimen_fiscal: '601', uso_cfdi: 'G03', codigo_postal: '44100' },
  { razon_social: 'Papelería y Más S.A. de C.V.', rfc: 'PAM180601CD2', email: 'pedidos@papeleriamas.mx', contacto: 'Verónica Gil', regimen_fiscal: '601', uso_cfdi: 'G01', codigo_postal: '44200' },
  { razon_social: 'Deportes Jalisco S.A. de C.V.', rfc: 'DJA200101EF3', email: 'mayoreo@deportesjalisco.mx', contacto: 'Héctor Ruiz', regimen_fiscal: '601', uso_cfdi: 'G03', codigo_postal: '44300' },
  { razon_social: 'Tienda Escolar del Oeste S.A. de C.V.', rfc: 'TEO190501GH4', email: 'info@escolaroeste.mx', contacto: 'Patricia Lima', regimen_fiscal: '601', uso_cfdi: 'G01', codigo_postal: '45050' },
  { razon_social: 'Mercado Sport S.A. de C.V.', rfc: 'MSP210301IJ5', email: 'ventas@mercadosport.mx', contacto: 'Daniel Cruz', regimen_fiscal: '601', uso_cfdi: 'G03', codigo_postal: '45100' },
]

async function seedWholesalers() {
  console.log('Seeding wholesalers...')
  const rows = WHOLESALERS.map((w, i) => ({
    id: uid('ws', i + 1),
    ...w,
    active: true,
    created_at: now(),
  }))
  const { error } = await sb.from('wholesalers').upsert(rows)
  if (error) throw new Error(`wholesalers: ${error.message}`)
  console.log(`  ${rows.length} wholesalers inserted`)
  return rows
}

// ─── Expenses ────────────────────────────────────────────────────────────────

const EXPENSES = [
  { concept: 'Renta local Av. Juárez', category: 'renta', amount: 15000, payment_method: 'transferencia' },
  { concept: 'Nómina repartidores — semana 1', category: 'sueldos', amount: 8000, payment_method: 'transferencia' },
  { concept: 'Gasolina unidades', category: 'transporte', amount: 1200, payment_method: 'efectivo' },
  { concept: 'Empaques y bolsas', category: 'compra-inventario', amount: 850, payment_method: 'efectivo' },
  { concept: 'Luz y agua', category: 'servicios', amount: 2200, payment_method: 'transferencia' },
  { concept: 'Compra inventario Panini — lote abril', category: 'compra-inventario', amount: 45000, payment_method: 'transferencia' },
  { concept: 'Marketing Instagram/Facebook', category: 'marketing', amount: 2500, payment_method: 'tarjeta' },
  { concept: 'Nómina repartidores — semana 2', category: 'sueldos', amount: 8000, payment_method: 'transferencia' },
  { concept: 'Mantenimiento motos', category: 'transporte', amount: 1800, payment_method: 'efectivo' },
  { concept: 'Material de oficina', category: 'otros', amount: 450, payment_method: 'efectivo' },
]

async function seedExpenses() {
  console.log('Seeding expenses...')
  const rows = EXPENSES.map((e, i) => ({
    id: uid('exp', i + 1),
    ...e,
    date: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    created_at: now(),
  }))
  const { error } = await sb.from('expenses').upsert(rows)
  if (error) throw new Error(`expenses: ${error.message}`)
  console.log(`  ${rows.length} expenses inserted`)
}

// ─── Orders ──────────────────────────────────────────────────────────────────

async function seedOrders(products: typeof PRODUCTS & { id: string }[], customers: typeof CUSTOMERS & { id: string }[], deliverers: typeof DELIVERERS & { id: string }[]) {
  console.log('Seeding orders...')

  const STATUSES = ['CREATED', 'ASSIGNED', 'IN_ROUTE', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED'] as const
  const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'mercadopago']

  const orders = []
  const items = []

  for (let i = 0; i < 20; i++) {
    const customer = customers[i % customers.length]!
    const status = STATUSES[i % STATUSES.length]!
    const deliverer = deliverers[i % deliverers.length]!
    const daysAgo = i * 2
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

    const numItems = (i % 3) + 1
    const orderItems = Array.from({ length: numItems }, (_, j) => {
      const prod = products[(i + j) % products.length]!
      return { product_id: prod.id, name: prod.name, qty: (j % 3) + 1, price: prod.price, cost_at_sale: prod.cost }
    })

    const subtotal = orderItems.reduce((s, it) => s + it.price * it.qty, 0)
    const shipping = i % 4 === 0 ? 80 : 0
    const total = subtotal + shipping

    const orderNumber = uid('ord', i + 1)

    orders.push({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      date: orderDate,
      status,
      payment_method: PAYMENT_METHODS[i % PAYMENT_METHODS.length]!,
      delivery_type: shipping > 0 ? 'envio' : 'local',
      deliverer_id: status !== 'CREATED' ? deliverer.id : null,
      subtotal,
      shipping,
      total,
      deleted: false,
      created_at: orderDate,
    })

    for (let j = 0; j < orderItems.length; j++) {
      items.push({
        order_number: orderNumber,
        ...orderItems[j]!,
        position: j,
      })
    }
  }

  const { error: ordErr } = await sb.from('orders').upsert(orders)
  if (ordErr) throw new Error(`orders: ${ordErr.message}`)

  const { error: itemErr } = await sb.from('order_items').insert(items)
  if (itemErr) throw new Error(`order_items: ${itemErr.message}`)

  console.log(`  ${orders.length} orders + ${items.length} items inserted`)
}

// ─── POS Sales ───────────────────────────────────────────────────────────────

async function seedSales(products: typeof PRODUCTS & { id: string }[]) {
  console.log('Seeding POS sales...')

  const sales = []
  const saleItems = []

  for (let i = 0; i < 10; i++) {
    const saleId = uid('sale', i + 1)
    const daysAgo = i
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    const numItems = (i % 3) + 1

    const items = Array.from({ length: numItems }, (_, j) => {
      const prod = products[(i * 3 + j) % products.length]!
      const qty = (j % 2) + 1
      return {
        sale_id: saleId,
        product_id: prod.id,
        name: prod.name,
        emoji: prod.emoji,
        quantity: qty,
        unit_price: prod.price,
        subtotal: prod.price * qty,
        cost_at_sale: prod.cost,
        total_amount: prod.price * qty,
        mode: 'unit',
        position: j,
      }
    })

    const total = items.reduce((s, it) => s + it.subtotal, 0)

    sales.push({
      id: saleId,
      payment_method: ['efectivo', 'tarjeta', 'transferencia'][i % 3]!,
      total,
      created_by: 'admin',
      created_at: createdAt,
    })
    saleItems.push(...items)
  }

  const { error: sErr } = await sb.from('sales').upsert(sales)
  if (sErr) throw new Error(`sales: ${sErr.message}`)

  const { error: siErr } = await sb.from('sale_items').insert(saleItems)
  if (siErr) throw new Error(`sale_items: ${siErr.message}`)

  console.log(`  ${sales.length} POS sales + ${saleItems.length} items inserted`)
}

// ─── Wholesale Sales ─────────────────────────────────────────────────────────

async function seedWholesaleSales(products: typeof PRODUCTS & { id: string }[], wholesalers: typeof WHOLESALERS & { id: string }[]) {
  console.log('Seeding wholesale sales...')

  const wSales = []
  const wItems = []
  const wPayments = []

  for (let i = 0; i < 8; i++) {
    const ws = wholesalers[i % wholesalers.length]!
    const saleId = uid('wsale', i + 1)
    const daysAgo = i * 5
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    const numItems = (i % 4) + 2

    const items = Array.from({ length: numItems }, (_, j) => {
      const prod = products[(i * 2 + j) % products.length]!
      const qty = (j + 1) * 5
      return {
        sale_id: saleId,
        product_id: prod.id,
        name: prod.name,
        emoji: prod.emoji,
        quantity: qty,
        unit_price: prod.price * 0.85,
        subtotal: prod.price * 0.85 * qty,
        cost_at_sale: prod.cost,
        position: j,
      }
    })

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
    const total = Math.round(subtotal * 100) / 100

    const statuses = ['pagado', 'pendiente_credito', 'parcial', 'pagado', 'pagado'] as const
    const status = statuses[i % statuses.length]!
    const amountPaid = status === 'pagado' ? total : status === 'parcial' ? total * 0.5 : 0

    wSales.push({
      id: saleId,
      wholesaler_id: ws.id,
      wholesaler_name: ws.razon_social,
      payment_method: status === 'pendiente_credito' ? 'credito' : 'transferencia',
      status,
      subtotal: total,
      total,
      amount_paid: Math.round(amountPaid * 100) / 100,
      created_by: 'admin',
      created_at: createdAt,
    })
    wItems.push(...items)

    if (amountPaid > 0) {
      wPayments.push({
        sale_id: saleId,
        amount: Math.round(amountPaid * 100) / 100,
        method: 'transferencia',
        date: createdAt.slice(0, 10),
        created_at: createdAt,
      })
    }
  }

  const { error: wsErr } = await sb.from('wholesale_sales').upsert(wSales)
  if (wsErr) throw new Error(`wholesale_sales: ${wsErr.message}`)

  const { error: wiErr } = await sb.from('wholesale_sale_items').insert(wItems)
  if (wiErr) throw new Error(`wholesale_sale_items: ${wiErr.message}`)

  if (wPayments.length) {
    const { error: wpErr } = await sb.from('wholesale_payments').insert(wPayments)
    if (wpErr) throw new Error(`wholesale_payments: ${wpErr.message}`)
  }

  console.log(`  ${wSales.length} wholesale sales + ${wItems.length} items + ${wPayments.length} payments inserted`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Starting seed...\n')

  await clean()

  const products = (await seedProducts()) as typeof PRODUCTS & { id: string }[]
  const customers = (await seedCustomers()) as typeof CUSTOMERS & { id: string }[]
  const deliverers = (await seedDeliverers()) as typeof DELIVERERS & { id: string }[]
  const wholesalers = (await seedWholesalers()) as typeof WHOLESALERS & { id: string }[]

  await seedExpenses()
  await seedOrders(products as any, customers as any, deliverers as any)
  await seedSales(products as any)
  await seedWholesaleSales(products as any, wholesalers as any)

  console.log('\n✅ Seed complete!\n')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
