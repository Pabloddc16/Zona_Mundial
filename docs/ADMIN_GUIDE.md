# Pablo Admin — Comprehensive Guide

> World Cup 2026 merchandise operations panel.  
> URL (local): http://localhost:3001  
> URL (prod): your Render deployment URL

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard](#2-dashboard)
3. [Orders](#3-orders)
4. [Point of Sale (POS)](#4-point-of-sale-pos)
5. [Products](#5-products)
6. [Customers](#6-customers)
7. [Deliverers](#7-deliverers)
8. [Wholesalers](#8-wholesalers)
9. [Expenses](#9-expenses)
10. [Returns](#10-returns)
11. [Inventory — Locations](#11-inventory--locations)
12. [Inventory — Recipes](#12-inventory--recipes)
13. [Inventory — Purchases](#13-inventory--purchases)
14. [Inventory — Transfers](#14-inventory--transfers)
15. [Inventory — Conversions](#15-inventory--conversions)
16. [Inventory — Stock & Movements](#16-inventory--stock--movements)
17. [Users](#17-users)
18. [Roles & Permissions](#18-roles--permissions)
19. [Running E2E Tests](#19-running-e2e-tests)
20. [Deploying to Render](#20-deploying-to-render)

---

## 1. Logging In

Navigate to `/login`. Enter your email and password.

| Field    | Example              |
|----------|----------------------|
| Email    | admin@admin.com      |
| Password | your password        |

- Click **Sign in**.
- On success you land on the Dashboard.
- Forgot password? Click the link — a reset email is sent via Supabase Auth (requires `RESEND_API_KEY` set in the API `.env`).

**Local dev credentials:**
```
Email:    admin@admin.com
Password: admin1234
```

---

## 2. Dashboard

The dashboard shows a financial overview for the selected date range (default: last 30 days).

### KPI Cards (top row)

| Card | What it means |
|------|--------------|
| **Total revenue** | Gross revenue from all sales channels (POS + app orders + wholesale) |
| **Collected** | Cash/card/transfer actually received (paid sales + wholesale payments made) |
| **Receivable** | Wholesale credit outstanding (not yet paid) |
| **Gross profit** | Revenue minus cost of goods sold (avg cost per unit × units sold) |
| **Expenses** | Total recorded operational expenses in the period |
| **Net profit** | Gross profit minus expenses |
| **Inventory value** | Current stock × average cost per SKU |
| **Stock units** | Total units across all locations |
| **Returns** | Total refund amount in the period |

### Charts

- **Daily revenue** — bar chart, one bar per day.
- **Order status** — breakdown of orders by status (CREATED / ASSIGNED / IN_ROUTE / DELIVERED / CANCELLED).
- **Accounts receivable** — list of wholesale sales with outstanding balance.

> **Cost varies?** Product cost is the weighted-average cost from your purchase history. It updates each time you receive a purchase order. If you bought 10 units at $5 and later 10 units at $7, the avg cost becomes $6. This is expected — it reflects your real cost basis.

---

## 3. Orders

`/orders` — delivery orders placed via the customer-facing app.

### Columns

| Column | Description |
|--------|-------------|
| Order | Order number (e.g. `ORD-00042`) |
| Date | Created timestamp |
| Customer | Customer name |
| Status | Current status badge |
| Total | Order total |

### Status flow

```
CREATED → ASSIGNED → IN_ROUTE → DELIVERED
                              ↘ CANCELLED
```

### Actions

- **Edit** — opens side sheet to change status and assign a deliverer.
- **Payment link** (link icon) — generates Stripe/MercadoPago payment link + QR code.
- **Delete** — only available on `CREATED` orders (cannot delete once assigned).

### Filters

Use the **status dropdown** to filter. Click the **refresh** button (top right) to reload.

---

## 4. Point of Sale (POS)

`/pos` — in-store sales terminal.

### How to use

1. Type in the **search box** to find products by name.
2. Click a product card to add it to the cart (right panel).
3. Adjust **quantity** with the +/− buttons, or type directly in the number field.
4. Edit the **unit price** inline if you need to apply a discount.
5. Enter **Customer name** (optional) at the bottom.
6. Select **payment method**: Cash / Card / Transfer.
7. Click **Charge** to finalize. A green "Sale recorded successfully" message confirms.

> Tip: The search box re-focuses automatically after adding a product — scan barcodes rapidly without touching the mouse.

---

## 5. Products

`/products` — catalog management.

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| Name | ✓ | Display name |
| SKU | — | Auto-generated if blank |
| Category | — | Free text or pick from list |
| Price | ✓ | Selling price (USD) |
| Cost | — | Purchase cost — overridden by inventory avg cost once received |
| Emoji | — | Shows on POS cards |
| Barcode | — | For scanner use |

### Actions

- **New product** → opens side sheet form.
- **Edit** → opens side sheet pre-filled.
- **Delete** → removes product (cannot delete if it has associated sales/orders).
- **Adjust stock** (from inventory page) → manual stock correction with reason note.

### About product cost

Cost shown in the product form is the *initial* cost. Once you receive a purchase order, the system calculates a **weighted average cost** from all purchase movements. The dashboard uses this avg cost for gross profit. The cost on the product record itself is just a reference; the real cost is tracked in the `movements` ledger.

---

## 6. Customers

`/customers` — customer directory.

### Fields

| Field | Notes |
|-------|-------|
| Name | Required |
| Phone | Optional |
| Email | Optional |
| Address | Used for delivery orders |

### Search

Use the search box to filter by name, phone, or email in real-time (client-side filter, no extra API call).

### Stats

Each row shows **Orders** count and **Spent** total — calculated from all orders associated with that customer.

---

## 7. Deliverers

`/deliverers` — delivery staff management.

### Fields

| Field | Notes |
|-------|-------|
| Name | Required |
| Phone | Contact number |
| Vehicle | Description (e.g. "Moto Honda 125cc") |
| Plate | License plate |
| Zone | Delivery zone name |
| Username | Used to log into the deliverer app |
| Status | DISPONIBLE / EN_RUTA / DESCANSO (editable) |

### Route optimizer

Click the **route icon** on any deliverer row to see their optimized delivery sequence:
- Shows all current assigned orders.
- Calculated shortest path with estimated distance (km) and ETA (minutes).
- Stops are ordered by proximity.

---

## 8. Wholesalers

`/wholesalers` — two tabs: **Directory** and **Wholesale sales**.

### Directory tab

Manage wholesale clients (businesses that buy in bulk on credit).

| Field | Notes |
|-------|-------|
| Business name | Required (razón social) |
| Tax ID (RFC) | Mexican tax ID |
| Email | For invoices |
| Contact | Contact person name |
| Tax regime | 3-digit SAT code (e.g. 601) |
| CFDI use | e.g. G01 |
| Postal code | Required for digital invoicing |
| Internal note | Any private note |

**Deactivate** hides them from new sale dropdowns but preserves history.

### Wholesale sales tab

Shows all wholesale transactions with payment status.

| Status | Meaning |
|--------|---------|
| `pagado` | Fully paid |
| `parcial` | Partial payment received |
| `pendiente_credito` | No payment yet (credit) |

#### Recording a payment

1. Click **Record payment** on any row with outstanding balance.
2. Enter amount and payment method.
3. Save — balance updates automatically.

#### Payment link

Click the link icon (ExternalLink) to generate a Stripe payment link + QR code for the wholesaler to pay online.

---

## 9. Expenses

`/expenses` — operational expense tracking.

### Fields

| Field | Notes |
|-------|-------|
| Date | Expense date |
| Concept | Description |
| Category | See categories below |
| Amount | USD |
| Payment method | Cash / Card / Transfer |
| Notes | Optional internal note |

### Categories

`compra-inventario` · `sueldos` · `renta` · `servicios` · `transporte` · `marketing` · `impuestos` · `otros`

### Date filter

Use the **From** / **To** date pickers to filter by period. The total for the filtered period is shown in the top right.

---

## 10. Returns

`/returns` — refund processing.

### Fields

| Field | Notes |
|-------|-------|
| Source | `pos` / `app` / `wholesale` |
| Reason | `defecto` / `error_pedido` / `arrepentimiento` / `otro` |
| Refund amount | Amount to refund |
| Method | Cash / Card / Transfer |
| Items | List of returned items (name, qty, unit price) |
| Notes | Optional |

Returns are logged only (no automatic stock reversal) — if items are resaleable, create a manual stock adjustment in Inventory.

---

## 11. Inventory — Locations

`/locations` — physical stock locations.

### Location types

| Type | Use |
|------|-----|
| `warehouse` | Main storage |
| `pos` | Point-of-sale location |
| `wip_conversion` | Work-in-progress during a conversion |
| `wip_assembly` | Assembly work-in-progress |

WIP locations are created automatically when needed. Do not delete them.

### Setup

Create at least:
- One **warehouse** (e.g. "Main Warehouse")
- One **POS** location (e.g. "Store Front")

---

## 12. Inventory — Recipes

`/recipes` — production recipes (what inputs turn into what output).

### Example

> Recipe "Pack 5 jerseys": consumes 5 × Jersey SKU → produces 1 × Jersey 5-Pack SKU

### Fields

| Field | Notes |
|-------|-------|
| Recipe name | Display name |
| Output product | What gets produced |
| Output qty | How many units of output per run |
| Input lines | Product → qty per run |
| Active | Inactive recipes can't start new conversions |

---

## 13. Inventory — Purchases

`/purchases` — purchase orders from suppliers.

### Lifecycle

```
draft → paid → received
      ↘ cancelled
```

### Creating a purchase

1. Click **New purchase**.
2. Enter **Supplier** name.
3. Add line items: select product, enter qty and unit cost.
4. For each line, select **Destination** — the location where stock will land when received. Defaults to your main warehouse if left blank.
5. Save → purchase created in `draft` status.

### Advancing status

| Button | Action |
|--------|--------|
| **Mark paid** | Records payment date, moves to `paid` |
| **Receive** | Creates inventory movements (stock enters the destination locations), moves to `received` |
| **Cancel** | Cancels draft/paid purchase (cannot cancel received) |

### Cost impact

When you receive a purchase, the system records `purchase_in` movements with the `unit_cost` from the purchase line. This updates the **weighted average cost** used in profit calculations.

---

## 14. Inventory — Transfers

`/transfers` — moving stock between locations.

### Creating a transfer

1. Select **From** location (origin).
2. Select **To** location (destination — cannot be same as origin, WIP locations excluded).
3. Add product lines: product + quantity.
4. Save → transfer in `draft`.

### Completing

Click **Complete** → stock moves from origin to destination (inventory movements recorded).  
Click **Cancel** → discards the draft.

---

## 15. Inventory — Conversions

`/conversions` — production runs (consume inputs, produce output).

### Creating a conversion

1. Select a **Recipe**.
2. Enter **Quantity** (how many recipe runs).
3. Select **Output destination** (where finished goods go).
4. Save → status `planned`.

### Two-phase execution

| Phase | Button | What happens |
|-------|--------|-------------|
| Phase 1 | **Start** | Input materials move from their locations to WIP. Status → `in_progress` |
| Phase 2 | **Finish** | WIP consumed, output units created in destination. Status → `done` |

You can also **Cancel** a planned or in-progress conversion (reverses WIP movements if started).

---

## 16. Inventory — Stock & Movements

`/inventory` — four tabs:

### All stock

Current stock levels by SKU + location. Columns: Product, Location, Qty, Avg Cost, Value.

Use the **location filter** to see one location at a time.

### In progress (WIP)

Units currently in WIP locations (mid-conversion). Shows recipe context.

### Idle

Stock that hasn't moved in N days (default 30). Useful for identifying dead inventory.

### Movements

Full audit ledger — every stock movement ever recorded:

| Type | Triggered by |
|------|-------------|
| `purchase_in` | Receiving a purchase order |
| `transfer_out` / `transfer_in` | Completing a transfer |
| `conversion_consume` | Starting a conversion |
| `conversion_produce` | Finishing a conversion |
| `adjustment` | Manual stock adjustment from the Products page |
| `sale_out` | POS sale |
| `return_in` | Return recorded |

Filter by product or location using the dropdowns.

---

## 17. Users

`/users` — admin user management (admin role required).

### Roles

| Role | Access |
|------|--------|
| `admin` | Full access to everything |
| `capturista` | Can create sales, orders, returns — cannot manage users, expenses, or inventory bulk ops |
| `repartidor` | Delivery app access only |

### Creating a user

1. Click **New user**.
2. Enter username (login handle), email, password (min 8 chars), and role.
3. Save — creates both a Supabase Auth account and a `public.users` row.

### Editing a user

- Change role, email, or active status.
- Leave password blank to keep existing password.
- Cannot demote the **last active admin** (system protection).

### Deleting a user

Removes from both Supabase Auth and `public.users`. Cannot delete the last active admin.

---

## 18. Roles & Permissions

| Feature | admin | capturista | repartidor |
|---------|-------|------------|------------|
| Dashboard | ✓ | ✓ | — |
| Orders (view) | ✓ | ✓ | ✓ |
| Orders (create) | ✓ | ✓ | — |
| Orders (delete) | ✓ | — | — |
| POS sales | ✓ | ✓ | — |
| Products (view) | ✓ | ✓ | — |
| Products (create/edit/delete) | ✓ | — | — |
| Customers (view) | ✓ | ✓ | — |
| Customers (create) | ✓ | — | — |
| Deliverers | ✓ | ✓ | — |
| Wholesalers (view) | ✓ | ✓ | — |
| Wholesalers (create/edit) | ✓ | — | — |
| Expenses | ✓ | — | — |
| Returns (create) | ✓ | ✓ | — |
| Returns (delete) | ✓ | — | — |
| Inventory (all) | ✓ | — | — |
| Users | ✓ | — | — |

---

## 19. Running E2E Tests

Tests require both the **admin** (port 3001) and **API** (port 4000) to be running locally.

```bash
# Terminal 1 — start API
pnpm --filter @pablo/api dev

# Terminal 2 — start admin
pnpm --filter @pablo/admin dev

# Terminal 3 — run tests
cd apps/admin
pnpm test:e2e

# Run with interactive UI
pnpm test:e2e:ui
```

Test files:

| File | Covers |
|------|--------|
| `tests/e2e/auth.spec.ts` | Login, logout, bad credentials, redirect |
| `tests/e2e/products.spec.ts` | Create / Edit / Delete products |
| `tests/e2e/customers.spec.ts` | Create / Search / Edit / Delete customers |
| `tests/e2e/orders.spec.ts` | List, filter by status, open edit sheet |
| `tests/e2e/users.spec.ts` | Create / Edit role / Delete users |

---

## 20. Deploying to Render

The API is deployed as a **Web Service** on Render.

### Required environment variables (API)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=random-32+-char-string
CORS_ORIGIN=https://your-admin-app.vercel.app,https://your-web-app.vercel.app
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
```

Optional (leave blank to skip):
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=noreply@yourdomain.com
SENTRY_DSN=
```

### Admin app (Next.js — deploy to Vercel or Render Static)

Required env:
```
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase setup checklist

1. Create project at supabase.com.
2. Run `schema.sql` in the SQL Editor.
3. Run `inventory_schema.sql` in the SQL Editor.
4. Create an admin Auth user: **Authentication → Users → Invite user** (or use the Supabase admin API).
5. Insert matching row in `public.users`:
   ```sql
   INSERT INTO public.users (id, username, email, role, active)
   VALUES ('<supabase-auth-user-id>', 'admin', 'admin@yourdomain.com', 'admin', true);
   ```
6. Create at least one Location (warehouse) via the admin UI.

### After first deploy

1. Log in as admin.
2. Go to **Locations** → create a warehouse and a POS location.
3. Go to **Products** → add your catalog.
4. Go to **Purchases** → create and receive your initial stock.
5. Done — ready to sell.

---

*Last updated: 2026-05-10*
