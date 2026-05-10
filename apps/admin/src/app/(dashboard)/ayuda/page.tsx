'use client'
import { useState } from 'react'

const SECTIONS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'orders', label: '📦 Orders' },
  { id: 'pos', label: '🛒 POS' },
  { id: 'products', label: '📋 Products' },
  { id: 'customers', label: '👤 Customers' },
  { id: 'deliverers', label: '🚴 Deliverers' },
  { id: 'wholesalers', label: '🏢 Wholesalers' },
  { id: 'expenses', label: '💸 Expenses' },
  { id: 'returns', label: '↩ Returns' },
  { id: 'cuentas', label: '🏦 Cuentas' },
  { id: 'inv-stock', label: '📦 Stock', sub: true },
  { id: 'inv-locations', label: '📍 Locations', sub: true },
  { id: 'inv-purchases', label: '🛍 Purchases', sub: true },
  { id: 'inv-transfers', label: '↔ Transfers', sub: true },
  { id: 'inv-recipes', label: '🧪 Recipes', sub: true },
  { id: 'inv-conversions', label: '⚙ Conversions', sub: true },
  { id: 'users', label: '👥 Users' },
  { id: 'mobile', label: '📱 Mobile App' },
]

export default function AyudaPage() {
  const [active, setActive] = useState('dashboard')

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar TOC */}
      <aside
        className="w-52 shrink-0 overflow-y-auto p-3 space-y-0.5"
        style={{ borderRight: '1px solid oklch(1 0 0 / 0.07)', background: 'oklch(0.17 0.011 260)' }}
      >
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Contents</p>

        {/* Inventory group label */}
        {SECTIONS.map((s, i) => {
          const isFirstSub = s.sub && !SECTIONS[i - 1]?.sub
          return (
            <div key={s.id}>
              {isFirstSub && (
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/20">Inventory</p>
              )}
              <button
                onClick={() => {
                  setActive(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="w-full text-left rounded-lg text-xs font-medium transition-all"
                style={{
                  padding: s.sub ? '5px 12px 5px 20px' : '6px 12px',
                  ...(active === s.id
                    ? { background: 'oklch(0.77 0.163 70 / 0.13)', color: 'oklch(0.84 0.150 80)' }
                    : { color: 'var(--text-secondary)' }),
                }}
              >
                {s.label}
              </button>
            </div>
          )
        })}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        <div>
          <h1 className="text-2xl font-black text-white/90">Admin Guide</h1>
          <p className="text-sm text-white/40 mt-1">Complete reference for the Pablo / Zona Mundial admin panel.</p>
        </div>

        {/* ── DASHBOARD ─────────────────────────────── */}
        <Section id="dashboard" title="📊 Dashboard">
          <P>Shows business performance for any date range. Use the selector (top right) to switch between 7, 30, or 90 days.</P>
          <H3>KPI cards</H3>
          <Table rows={[
            ['Total revenue', 'All sales combined (POS + App orders + Wholesale)'],
            ['Collected', 'Cash actually received (excludes credit/outstanding wholesale)'],
            ['Pending collection', 'Wholesale credit not yet paid'],
            ['Net profit', 'Revenue minus all expenses for the period'],
            ['Expenses', 'Total registered expenses'],
            ['Gross profit', 'Revenue minus cost of goods sold'],
            ['Inventory (value)', 'Current stock × cost price of all products'],
            ['Inventory (units)', 'Total units currently in stock'],
          ]} />
          <H3>Charts</H3>
          <P><strong>Daily revenue</strong> — income per day. <strong>Revenue by source</strong> — POS vs wholesale vs app orders. <strong>Order status</strong> — count per status. <strong>Accounts receivable</strong> — only appears when wholesale clients have unpaid balances.</P>
        </Section>

        {/* ── ORDERS ────────────────────────────────── */}
        <Section id="orders" title="📦 Orders (App Orders)">
          <P>Orders come from customers using the <strong>mobile app</strong>. Customers browse, add to cart, fill in their info, and place the order. You manage them here.</P>
          <H3>Order statuses</H3>
          <Table rows={[
            ['CREATED', 'New order just placed by the customer — needs attention'],
            ['ASSIGNED', 'Deliverer assigned, preparing to send'],
            ['IN_ROUTE', 'Deliverer is on the way to the customer'],
            ['DELIVERED', 'Successfully delivered'],
            ['CANCELLED', 'Cancelled'],
          ]} />
          <H3>Processing an order</H3>
          <Steps steps={[
            'Go to Orders. New orders appear with status CREATED.',
            'Click Edit on the order.',
            'Assign a deliverer from the dropdown.',
            'Change status to ASSIGNED when the driver is preparing.',
            'Change to IN_ROUTE when the driver departs.',
            'Mark DELIVERED once the customer confirms receipt.',
          ]} />
          <H3>Payment link</H3>
          <P>The <strong>Payment Link</strong> button generates a Mercado Pago / Stripe link to send to the customer via WhatsApp for online payment.</P>
          <H3>Order notes</H3>
          <P>Customers can add special instructions at checkout (e.g. "leave at the door", "call on arrival"). These appear in the order detail view.</P>
        </Section>

        {/* ── POS ───────────────────────────────────── */}
        <Section id="pos" title="🛒 POS — Point of Sale">
          <P>For <strong>in-person sales</strong> at the physical store. Search for a product, add to cart, charge.</P>
          <H3>Making a sale</H3>
          <Steps steps={[
            'Go to POS. The search bar is automatically focused.',
            'Type the product name (min. 1 character). Matching products appear below.',
            'Click a product card to add it to the cart.',
            'Adjust quantity with + / − or type a new quantity directly.',
            'Edit the unit price directly in the cart if applying a discount.',
            'Select payment method: Efectivo, Tarjeta, Transferencia, etc.',
            'Optionally enter the customer name.',
            'Click "Charge" to complete the sale. Stock is deducted automatically.',
          ]} />
          <Note>POS sales appear in the Dashboard under "Revenue by source → POS" and are counted in Cuentas under the matching payment method.</Note>
        </Section>

        {/* ── PRODUCTS ──────────────────────────────── */}
        <Section id="products" title="📋 Products">
          <P>Products appear in the mobile app store and in the POS search. Managing products well — with images and accurate costs — is key to correct profit reporting.</P>
          <H3>Creating a product</H3>
          <Steps steps={[
            'Go to Products → click "New product".',
            'Image: click the upload zone to choose a file (uploads to Supabase), or paste any hosted image URL below it.',
            'Emoji: fallback icon shown if no image is set.',
            'Sale price: what the customer pays.',
            'Purchase cost: what you paid for it — used for profit margin, never shown to customers.',
            'Category: album, jersey, sobre, gorra, etc.',
            'Initial stock: units on hand right now.',
            'Click Save.',
          ]} />
          <H3>Images</H3>
          <P>File upload goes to Supabase Storage (requires correct Supabase credentials in .env.local). Alternatively, upload the image anywhere (imgur.com, cloudinary.com) and paste the URL into the Image URL field.</P>
          <H3>Editing a product</H3>
          <P>Click <strong>Edit</strong> on any row. The current image is shown as a preview — click the upload zone to replace it. Stock is NOT editable here — use the Stock button.</P>
          <H3>Stock adjustments</H3>
          <P>Click <strong>Stock</strong> on a product row. Enter a <strong>delta</strong> (positive = received, negative = lost/sold manually) and choose a reason.</P>
          <Table rows={[
            ['compra', 'Received new inventory from a supplier'],
            ['merma', 'Loss, damage, or expiry'],
            ['ajuste', 'Manual correction of a counting error'],
            ['devolucion', 'Customer returned the product'],
            ['otro', 'Any other reason'],
          ]} />
        </Section>

        {/* ── CUSTOMERS ─────────────────────────────── */}
        <Section id="customers" title="👤 Customers">
          <P>App customers are created automatically when they place their first order. You can also create them manually.</P>
          <P>Click any customer to view their full order history, total spend, and contact info. You can edit name, phone, email, and address.</P>
          <Note>Wholesale clients are tracked separately in Wholesalers — they do not appear here.</Note>
        </Section>

        {/* ── DELIVERERS ────────────────────────────── */}
        <Section id="deliverers" title="🚴 Deliverers">
          <P>Delivery staff who carry out app orders. You assign them to orders and they can see their optimized route.</P>
          <H3>Step 1 — Create the deliverer profile</H3>
          <Steps steps={[
            'Go to Deliverers → click "New".',
            'Enter name, phone, vehicle type, plate, and zone.',
            'In the Username field, type a short identifier (e.g. "pedro") — you will use this in Step 2.',
            'Click Save.',
          ]} />
          <H3>Step 2 — Give them a login account</H3>
          <P>The deliverer profile alone does NOT give login access. You must create a user account too:</P>
          <Steps steps={[
            'Go to Users → click "New user".',
            'Username: use the same identifier you typed in the Deliverer form (e.g. "pedro").',
            'Email: the deliverer\'s email — this is what they use to log in.',
            'Password: choose a temporary password (min 8 chars). Share it with them privately.',
            'Role: set to "repartidor".',
            'Click Save.',
          ]} />
          <P>The deliverer now logs in at the admin URL with their <strong>email + password</strong>. With the repartidor role, they can only view and update their own deliverer record (status, location). They cannot see orders, customers, or financial data.</P>
          <H3>Assigning deliverers to orders</H3>
          <P>In Orders → Edit an order → select the deliverer from the dropdown → save. The deliverer will be linked to that order.</P>
          <H3>Viewing a route</H3>
          <P>Click the <strong>Route</strong> button on a deliverer card to see their optimized route — nearest-neighbor sorted list of all their IN_ROUTE orders, with distances and estimated time.</P>
          <H3>Deliverer statuses</H3>
          <Table rows={[
            ['DISPONIBLE', 'Available and ready'],
            ['EN_RUTA', 'Currently out delivering'],
            ['DESCANSO', 'On break — not available'],
          ]} />
        </Section>

        {/* ── WHOLESALERS ───────────────────────────── */}
        <Section id="wholesalers" title="🏢 Wholesalers">
          <P>Business clients who buy in bulk, often on credit. Track their sales, outstanding balances, and payment history.</P>
          <H3>Creating a wholesale sale</H3>
          <Steps steps={[
            'Go to Wholesalers → click "New sale".',
            'Select or type the wholesaler name.',
            'Add line items: product name, quantity, unit price.',
            'Payment method: Efectivo, Transferencia, or Crédito (pay later).',
            'Apply a discount if needed (% or fixed $).',
            'Click Save.',
          ]} />
          <H3>Recording a payment on credit</H3>
          <P>Click <strong>Pay</strong> on any sale row to record a partial or full payment. The outstanding balance updates automatically and shows in Dashboard → Accounts receivable.</P>
          <H3>Payment link</H3>
          <P>Generate a Mercado Pago / Stripe payment link to send to the wholesaler via WhatsApp.</P>
        </Section>

        {/* ── EXPENSES ──────────────────────────────── */}
        <Section id="expenses" title="💸 Expenses">
          <P>All business costs. Expenses reduce the net profit shown on the Dashboard.</P>
          <H3>Creating an expense</H3>
          <Steps steps={[
            'Go to Expenses → click "New".',
            'Enter date, concept (what it was for), and amount.',
            'Category: renta, sueldos, transporte, marketing, etc.',
            'Payment method: see below.',
            'Notes: optional additional detail.',
            'Click Save.',
          ]} />
          <H3>Payment methods</H3>
          <Table rows={[
            ['efectivo', 'Paid from the cash register'],
            ['transferencia', 'Bank transfer from the business account'],
            ['pablo', "Paid from Pablo's personal money"],
            ['lucho', "Paid from Lucho's personal money"],
            ['rodrigo', "Paid from Rodrigo's personal money"],
          ]} />
          <H3>Filtering</H3>
          <P>Use the date pickers and category filter. The total for the current filter is shown top-right.</P>
        </Section>

        {/* ── RETURNS ───────────────────────────────── */}
        <Section id="returns" title="↩ Returns">
          <P>Process when a customer sends a product back or a sale needs refunding.</P>
          <H3>Creating a return</H3>
          <Steps steps={[
            'Go to Returns → click "New return".',
            'Enter the original sale or order ID.',
            'Source: POS, Wholesale, or App.',
            'Reason for return.',
            'Refund amount and how it is issued (efectivo, transferencia, etc.).',
            'Add the items being returned with quantities.',
            'Click Save.',
          ]} />
          <Note>Returns reduce net revenue on the Dashboard for the selected period.</Note>
        </Section>

        {/* ── CUENTAS ───────────────────────────────── */}
        <Section id="cuentas" title="🏦 Cuentas (Bank Accounts)">
          <P>Shows how much money landed in each account for any date range. Covers all sources: POS, app orders, and wholesale.</P>
          <H3>Accounts</H3>
          <Table rows={[
            ['💵 Efectivo', 'All cash payments from any channel'],
            ['🏦 BBVA', 'All card payments (tarjeta) from any channel'],
            ['💜 Nu Bank', 'All bank transfers (transferencia) from any channel'],
          ]} />
          <P>The percentage bars show each account's share of total collected revenue. Use the date pickers to analyze any period.</P>
          <Note>The Outstanding credit card appears when wholesale clients have unpaid balances.</Note>
        </Section>

        {/* ── INVENTORY: STOCK ──────────────────────── */}
        <div className="pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-4">Inventory system</p>
          <P className="text-sm text-white/40">The inventory system tracks stock by physical location (warehouse, POS, WIP areas). It supports purchase orders, transfers between locations, production recipes, and conversions.</P>
        </div>

        <Section id="inv-stock" title="📦 Stock">
          <P>The Stock page shows current inventory levels per product per location. Use it to quickly see what you have and where.</P>
          <P>Filter by location or search by product name. The WIP view shows items currently in a conversion process.</P>
          <P>The <strong>Idle stock</strong> view shows products that haven't moved in 30+ days — useful for spotting slow-moving inventory.</P>
        </Section>

        <Section id="inv-locations" title="📍 Locations">
          <P>Locations are the physical places where stock lives. Create them before creating transfers or purchases.</P>
          <Table rows={[
            ['warehouse', 'Main storage (e.g. Almacén principal)'],
            ['pos', 'Point of sale counter — stock available for immediate sale'],
            ['wip_conversion', 'Work-in-progress: items being converted into a different product'],
            ['wip_assembly', 'Work-in-progress: items being assembled'],
          ]} />
          <P>Go to <strong>Locations → New</strong> to create a location. You must have at least one location before creating purchases or transfers.</P>
        </Section>

        <Section id="inv-purchases" title="🛍 Purchases">
          <P>A Purchase records buying inventory from a supplier. It adds stock to a specific location.</P>
          <H3>Purchase workflow</H3>
          <Steps steps={[
            'Go to Purchases → New purchase.',
            'Enter supplier name.',
            'Add line items: product, quantity, unit cost, destination location.',
            'Click Save (status: Draft — no stock change yet).',
            'Click "Pay" when you have paid the supplier.',
            'Click "Receive" when the physical goods arrive — stock is added to the location.',
          ]} />
          <Note>You can pay and receive in any order. Stock only increases when you click Receive.</Note>
        </Section>

        <Section id="inv-transfers" title="↔ Transfers">
          <P><strong>Transfers move existing stock between your locations.</strong> They do not add new inventory — they just relocate it.</P>
          <H3>When to use a transfer</H3>
          <Table rows={[
            ['Warehouse → POS', 'Restock the POS counter so the cashier can sell items'],
            ['POS → Warehouse', 'Return unsold items from a pop-up event back to storage'],
            ['Any → Any', 'Rebalance inventory between any two locations for any reason'],
          ]} />
          <H3>Transfer workflow</H3>
          <Steps steps={[
            'Go to Transfers → New transfer.',
            'Select the From location (where stock is currently).',
            'Select the To location (where it is going).',
            'Add line items: product + quantity to move.',
            'Click Save (status: Draft).',
            'Click "Complete" when the physical move is done — stock updates in both locations.',
          ]} />
          <Note>Draft transfers do NOT move stock. Stock only moves when you click Complete. You can cancel a draft before completing it.</Note>
        </Section>

        <Section id="inv-recipes" title="🧪 Recipes">
          <P>A Recipe defines how to produce one product from other products (raw materials). Used when you assemble or repackage items.</P>
          <P><strong>Example:</strong> 1 "Pack de 10 sobres" = 10 × "Sobre individual". When you run a conversion with this recipe, it consumes 10 sobres and produces 1 pack.</P>
          <H3>Creating a recipe</H3>
          <Steps steps={[
            'Go to Recipes → New recipe.',
            'Name the recipe.',
            'Select the output product (what gets produced).',
            'Set the output quantity (how many units are produced per run).',
            'Add input lines: each raw material and how many units it takes.',
            'Click Save.',
          ]} />
        </Section>

        <Section id="inv-conversions" title="⚙ Conversions">
          <P>A Conversion executes a Recipe. It consumes the raw materials and creates the finished product.</P>
          <H3>Conversion workflow</H3>
          <Steps steps={[
            'Go to Conversions → New conversion.',
            'Select the Recipe to run.',
            'Set the quantity (how many batches to produce).',
            'Select the Location where the work happens and where the output goes.',
            'Click Save (status: Planned).',
            'Click "Start" when production begins — inputs move to WIP.',
            'Click "Finish" when done — WIP is consumed and output stock is created.',
          ]} />
          <Note>If you cancel a conversion after starting, input materials are returned to the original location.</Note>
        </Section>

        {/* ── USERS ─────────────────────────────────── */}
        <Section id="users" title="👥 Users (Admin Only)">
          <P>Admins-only. Users are people who can log into this admin panel.</P>
          <H3>Roles</H3>
          <Table rows={[
            ['admin', 'Full access to all features including user management and deletions'],
            ['capturista', 'Can view and create orders and sales — cannot manage users, delete records, or access financial settings'],
            ['repartidor', 'Can only view and update their own deliverer record (status, location)'],
          ]} />
          <H3>Creating a user</H3>
          <Steps steps={[
            'Go to Users → click "New user".',
            'Username: display name (used for logs and deliverer linking).',
            'Email: what they use to log in — must be a real email.',
            'Password: minimum 8 characters. Share it privately. They can change it later.',
            'Role: admin, capturista, or repartidor.',
            'Click Save. They can now log in immediately.',
          ]} />
          <Note>To reset someone's password: edit the user and type a new password in the password field.</Note>
        </Section>

        {/* ── MOBILE ────────────────────────────────── */}
        <Section id="mobile" title="📱 Mobile App (Customer App)">
          <P>The Zona Mundial mobile app for your customers. They browse products, add to cart, and place orders that appear in your Orders page.</P>
          <H3>What customers can do</H3>
          <Table rows={[
            ['Álbum', 'Sticker album — browse World Cup team cards (cosmetic, no purchases)'],
            ['Tienda', 'Product store — browse all items with images and prices'],
            ['Producto', 'Detail view — adjust quantity, add to cart'],
            ['Carrito', 'Review items, see shipping estimate'],
            ['Checkout', 'Enter name, phone, address, delivery type, payment method'],
            ['Pedido', 'Order confirmation with number and status'],
          ]} />
          <H3>Delivery types</H3>
          <Table rows={[
            ['Envío a domicilio', 'Shipped to address — $120 MXN shipping fee added automatically'],
            ['Recoger en tienda', 'Customer picks up — no shipping fee'],
          ]} />
          <H3>Customer payment methods</H3>
          <P>Efectivo, Transferencia, Tarjeta. Payment is handled offline — you collect it on delivery or the customer transfers before shipping.</P>
          <H3>Testing on your phone (dev)</H3>
          <Steps steps={[
            'Install Expo Go from App Store (iOS) or Google Play (Android).',
            'Connect phone to the same Wi-Fi as your dev machine.',
            'Find your machine\'s local IP: run "ip addr | grep 192" or check Wi-Fi settings.',
            'Update apps/mobile/.env → EXPO_PUBLIC_API_URL=http://YOUR_IP:4000',
            'Run: cd apps/mobile && npx expo start',
            'Scan the QR code with Expo Go.',
          ]} />
        </Section>
      </div>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4">
      <h2 className="text-lg font-bold text-white/90 mb-4 pb-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 0.08)' }}>
        {title}
      </h2>
      <div className="space-y-3 text-sm text-white/70 leading-relaxed">{children}</div>
    </div>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-white/80 mt-5 mb-2">{children}</h3>
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'oklch(0.77 0.163 70 / 0.1)', border: '1px solid oklch(0.77 0.163 70 / 0.2)', color: 'oklch(0.84 0.150 80)' }}>
      ℹ️ {children}
    </div>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
            style={{ background: 'oklch(0.77 0.163 70 / 0.15)', color: 'oklch(0.84 0.150 80)' }}>
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid oklch(1 0 0 / 0.08)' }}>
      {rows.map(([key, val], i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-2.5 text-xs"
          style={{ background: i % 2 === 0 ? 'oklch(1 0 0 / 0.02)' : 'transparent', borderBottom: i < rows.length - 1 ? '1px solid oklch(1 0 0 / 0.05)' : 'none' }}
        >
          <span className="font-mono font-semibold text-white/60 w-40 shrink-0">{key}</span>
          <span className="text-white/50">{val}</span>
        </div>
      ))}
    </div>
  )
}
