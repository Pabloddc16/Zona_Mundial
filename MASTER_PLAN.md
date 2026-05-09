# Master Plan — Zona Mundial Admin

## Status legend
- [ ] todo
- [~] in progress
- [x] done

---

## 1. Seed Script

File: `apps/api/scripts/seed.ts`  
Run: `pnpm --filter @pablo/api seed` (add to package.json scripts)

### What to seed

| Entity | Count | Notes |
|---|---|---|
| products | 30 | Realistic Mundial 2026 merch: jerseys, flags, scarves, keyrings, etc. With category, price, cost, stock, emoji |
| customers | 15 | Mix of names/phones/addresses |
| deliverers | 4 | With username (for login), zone, vehicle |
| wholesalers | 6 | With RFC, regimen fiscal, uso CFDI |
| orders | 20 | Mix of statuses, linked to customers + deliverers |
| order_items | ~60 | 2-4 items per order |
| sales (POS) | 10 | With sale_items |
| wholesale_sales | 8 | Mix of pagado/pendiente, with items + payments |
| expenses | 15 | Mix of categories: renta, gasolina, empaques, sueldos |
| users | 1 | Admin user row (Supabase auth user created separately) |

### Seed approach
- Pure TypeScript, uses `@pablo/db` `getClient()`
- Idempotent: `DELETE FROM table WHERE id LIKE 'seed_%'` before inserting
- All seed IDs prefixed `seed_` for easy cleanup
- Single `pnpm seed` command runs everything in order (FK deps respected)

---

## 2. API CRUD Gaps

### Products
| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/products` | ✅ done |
| GET | `/api/products/:id` | ✅ done |
| **POST** | `/api/products` | ❌ missing |
| PATCH | `/api/products/:id` | ✅ done |
| PATCH | `/api/products/:id/stock` | ✅ done |
| **DELETE** | `/api/products/:id` | ❌ missing |

### Customers
| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/customers` | ✅ done |
| GET | `/api/customers/unified` | ✅ done |
| **GET** | `/api/customers/:id` | ❌ missing |
| **POST** | `/api/customers` | ❌ missing |
| **PATCH** | `/api/customers/:id` | ❌ missing |
| **DELETE** | `/api/customers/:id` | ❌ missing |

### Wholesalers
| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/wholesalers` | ✅ done |
| POST | `/api/wholesalers` | ✅ done |
| PATCH | `/api/wholesalers/:id` | ✅ done |
| **DELETE** | `/api/wholesalers/:id` | ❌ missing |
| GET | `/api/wholesalers/sales` | ✅ done |
| POST | `/api/wholesalers/sales` | ✅ done |
| **GET** | `/api/wholesalers/sales/:id` | ❌ missing |
| **PATCH** | `/api/wholesalers/sales/:id` | ❌ missing |
| **DELETE** | `/api/wholesalers/sales/:id` | ❌ missing |
| POST | `/api/wholesalers/sales/:id/payments` | ✅ done |

### Orders, Expenses, Deliverers, Returns, Users
All fully covered. ✅

---

## 3. Admin UI — CRUD Pages

Every page currently has only a list view (no create/edit/delete). All CRUD uses inline dialogs (no new routes).

### 3a. Products page
- [ ] **Create dialog** — form: name, category (select), emoji, price, cost, stock, supplier, barcode
- [ ] **Edit dialog** — same form, pre-filled
- [ ] **Delete confirm** — with soft-delete warning if has sales history
- [ ] **Stock adjust dialog** — delta + reason (already has API)
- [ ] **Barcode scanner** input (camera, already have qrcode dep)

### 3b. Customers page
- [ ] **Create dialog** — name, phone, email, address
- [ ] **Edit dialog**
- [ ] **Delete confirm**
- [ ] **Detail drawer** — order history, total spent, lifetime value

### 3c. Deliverers page
- [ ] **Create dialog** — name, phone, username (for app login), vehicle, plate, zone
- [ ] **Edit dialog**
- [ ] **Delete confirm**
- [ ] **Status badge** inline toggle (DISPONIBLE / EN_RUTA / DESCANSO)

### 3d. Wholesalers page
- [ ] **Create dialog** — razon social, RFC, email, contacto, regimen fiscal, uso CFDI, CP
- [ ] **Edit dialog**
- [ ] **Delete confirm** (soft — set active=false if has sales)
- [ ] **Sales sub-page** — list wholesale_sales for this wholesaler
- [ ] **Record sale dialog** — product picker, qty, price, discount, payment method
- [ ] **Register payment dialog** — amount, method, date

### 3e. Orders page
- [ ] **Create order dialog** — customer search, items, delivery type, deliverer assign
- [ ] **Edit/status dialog** — change status, assign deliverer, add notes
- [ ] **Order detail drawer** — items, timeline, payment link button

### 3f. Expenses page
- [ ] **Create dialog** ← most important, currently no way to add expenses in UI
- [ ] **Edit dialog**
- [ ] **Delete confirm**

### 3g. Users page
- [ ] **Create dialog** — username, email, role, password (calls Supabase auth + inserts row)
- [ ] **Edit dialog** — change role, username, active toggle
- [ ] **Delete confirm** (deactivate, not hard delete)

### 3h. POS page
- [ ] **Full POS interface** — product grid, cart, payment method, customer optional
- [ ] **Receipt view** after sale

### 3i. Returns page
- [ ] **Create return dialog** — source (pos/wholesale/app), original sale ID, items, reason, refund method

---

## 4. UI Style Migration — Dark Glassmorphism (vantage-task-flow)

Current: light gray (`bg-gray-50`), amber brand, Inter font  
Target: dark glassmorphism, amber accent, Sora display + Manrope body

### Design tokens to port
```css
/* surfaces */
--surface-deep:    oklch(0.165 0.012 260);  /* page bg */
--surface-main:    oklch(0.195 0.010 260);  /* main area */
--surface-elevated: oklch(0.245 0.010 260); /* cards */

/* glass */
--glass-surface: oklch(1 0 0 / 0.03);
--glass-border:  oklch(1 0 0 / 0.06);
--glass-hover:   oklch(1 0 0 / 0.06);

/* amber accent (keep brand identity) */
--amber-accent:       oklch(0.77 0.163 70);  /* #f59e0b */
--amber-accent-hover: oklch(0.84 0.150 80);  /* #fbbf24 */

/* text */
--text-primary:   oklch(1 0 0 / 0.92);
--text-secondary: oklch(1 0 0 / 0.56);
--text-tertiary:  oklch(1 0 0 / 0.52);
```

### Files to change
- `apps/admin/src/app/globals.css` — replace light theme with dark tokens
- `apps/admin/tailwind.config.ts` — add glass/surface/amber tokens, swap fonts
- `apps/admin/src/components/layout/sidebar.tsx` — dark sidebar bg, amber active state
- All `bg-gray-*` → surface tokens, all `text-gray-*` → text tokens
- Cards: `bg-white border-gray-200` → `bg-[var(--surface-elevated)] border-[var(--glass-border)]`

### Fonts to add
```tsx
// layout.tsx — add next/font
import { Sora, Manrope } from 'next/font/google'
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })
```

---

## 5. Advanced Features (future sprints)

### 5a. Real-time dashboard
- Supabase realtime subscriptions on orders table
- Live order status updates without page refresh
- Live deliverer location (lat/lng already in schema)

### 5b. Deliverer mobile app improvements
- Current: Expo app exists (`apps/mobile`)
- Needs: order assignment push notification, route view, status update from phone
- Fix Node version issue (needs Node 18/20, use `.nvmrc`)

### 5c. CFDI / Invoicing
- `invoices` table already in schema
- Integrate with SAT-compliant provider (e.g. Facturapi)
- Auto-generate from wholesale sales
- PDF + XML download

### 5d. Reports & exports
- PDF daily/weekly/monthly reports
- Excel export for accountant (expenses, sales, CXC)
- Already have jspdf + jspdf-autotable in admin deps

### 5e. Barcode / QR scanner
- Product lookup by barcode in POS
- Already have `qrcode` dep + barcode field in products schema
- Use device camera (admin on tablet) or USB scanner input

### 5f. Multi-tenant / client handoff
- Supabase RLS policies per tenant
- Render service handoff (separate account, same codebase)
- Env-based branding (logo, colors per client)

### 5g. Analytics page
- Sales by product, category, deliverer
- Profit margin per product (price - cost_at_sale)
- CXC aging report (wholesalers overdue)
- Recharts already installed

### 5h. Audit log viewer
- `audit` table already populated by API
- Admin UI page to browse audit trail
- Filter by user, resource, date range
- Undo button for reversible actions

### 5i. Notification system
- Email via Resend (already wired) on key events:
  - New order assigned to deliverer
  - Payment received from wholesaler
  - Low stock alert (stock < threshold)

---

## Execution Order

| Sprint | Deliverables |
|---|---|
| **1** | Seed script + API CRUD gaps (products POST/DELETE, customers full, wholesalers DELETE) |
| **2** | Admin UI — create/edit/delete dialogs for all entities |
| **3** | UI style migration to dark glassmorphism |
| **4** | POS full interface |
| **5** | Real-time dashboard + audit log viewer |
| **6** | Reports/exports + CFDI |
| **7** | Mobile app improvements |
