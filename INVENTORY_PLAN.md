# Inventory System Plan — Mundial 2026

## 1. Gap Analysis: Current App vs Spec

### What we have
| Entity | Status | Notes |
|--------|--------|-------|
| Products | ✅ Basic | No unit hierarchy, no SKU type, stock is a mutable integer |
| Stock adjustments | ⚠️ Partial | `stock_adjustments` table exists but it's manual delta, not a ledger |
| POS sales | ✅ Basic | No location concept, no stock movement generated |
| Wholesale sales | ✅ Basic | Same — no movement ledger |
| Orders | ✅ Basic | App orders, no movement ledger |
| Expenses | ✅ Done | — |
| Locations | ❌ Missing | No warehouse / POS / WIP concept |
| Movements ledger | ❌ Missing | Core requirement — all stock changes append-only |
| Purchases flow | ❌ Missing | draft → paid → received (triggers movements) |
| Transfers | ❌ Missing | Warehouse → POS with movement |
| Recipes | ❌ Missing | Conversion recipes (corrugado → caja → sobre → carta) |
| Conversions | ❌ Missing | planned → in_progress (→ WIP) → done |
| Stock view | ❌ Missing | Derived from movements, never written directly |
| Cost tracking | ⚠️ Partial | `cost` field on product, no avg cost per movement |
| WIP visibility | ❌ Missing | Mid-conversion stock not visible |
| Idle stock report | ❌ Missing | — |
| COGS per set | ❌ Missing | Recipe cost rollup |

### Critical architectural difference
Current: `products.stock` is a mutable integer, updated by `stock_adjustments` (manual deltas).  
Spec: `stock` is derived from an append-only `movements` ledger. Direct writes to stock are forbidden.

**Decision**: Add the new ledger system alongside the current schema. Current `products.stock` stays for simple display. The new `movements` ledger is authoritative going forward. We'll add a job that reconciles `products.stock` from movements once the new system is wired up.

---

## 2. New Database Schema (additions to schema.sql)

```sql
-- =====================================================================
-- INVENTORY LEDGER SYSTEM
-- Run: psql ... -f packages/db/sql/inventory_schema.sql
-- =====================================================================

-- Unit types: corrugado | caja | sobre | carta | album | set
-- Each is its own SKU row in products. We add fields to existing products table:
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku          text UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type    text 
  CHECK (unit_type IN ('corrugado','caja','sobre','carta','album','set'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_sku_id text REFERENCES products(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_qty     integer DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost     numeric(12,4);

-- Physical and virtual locations
CREATE TABLE IF NOT EXISTS locations (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('warehouse','pos','wip_conversion','wip_assembly')),
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed default locations
INSERT INTO locations (id, name, type) VALUES
  ('loc_warehouse',     'Bodega Principal',    'warehouse'),
  ('loc_pos',           'Punto de Venta',      'pos'),
  ('loc_wip_conv',      'WIP — Conversión',    'wip_conversion'),
  ('loc_wip_assembly',  'WIP — Ensamblado',    'wip_assembly')
ON CONFLICT DO NOTHING;

-- The ledger — NEVER UPDATE OR DELETE
CREATE TABLE IF NOT EXISTS movements (
  id            text PRIMARY KEY,
  sku_id        text NOT NULL REFERENCES products(id),
  qty           integer NOT NULL CHECK (qty > 0),
  location_from text REFERENCES locations(id),  -- null = entering system (purchase)
  location_to   text REFERENCES locations(id),  -- null = leaving system (sale)
  type          text NOT NULL CHECK (type IN (
                  'purchase_in','transfer','conversion_out','conversion_in',
                  'sale','adjustment')),
  ref_table     text NOT NULL,   -- 'purchases' | 'transfers' | 'conversions' | 'sales' | 'manual'
  ref_id        text NOT NULL,
  unit_cost     numeric(12,4),
  note          text,
  created_by    text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movements_sku      ON movements(sku_id);
CREATE INDEX IF NOT EXISTS idx_movements_type     ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created  ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_ref      ON movements(ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_movements_from     ON movements(location_from);
CREATE INDEX IF NOT EXISTS idx_movements_to       ON movements(location_to);

-- Stock view (refresh after each write group)
CREATE MATERIALIZED VIEW IF NOT EXISTS stock AS
SELECT
  sku_id,
  location_id,
  SUM(qty) AS qty
FROM (
  SELECT sku_id, location_to   AS location_id,  qty  FROM movements WHERE location_to   IS NOT NULL
  UNION ALL
  SELECT sku_id, location_from AS location_id, -qty  FROM movements WHERE location_from IS NOT NULL
) t
GROUP BY sku_id, location_id
HAVING SUM(qty) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_sku_loc ON stock(sku_id, location_id);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id           text PRIMARY KEY,
  supplier     text NOT NULL,
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','paid','received','cancelled')),
  total        numeric(12,2) DEFAULT 0,
  notes        text,
  paid_at      timestamptz,
  received_at  timestamptz,
  created_by   text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id           text PRIMARY KEY,
  purchase_id  text NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  sku_id       text NOT NULL REFERENCES products(id),
  qty          integer NOT NULL CHECK (qty > 0),
  unit_cost    numeric(12,4) NOT NULL,
  received_to  text REFERENCES locations(id)  -- which location receives the stock
);

-- Transfers
CREATE TABLE IF NOT EXISTS transfers (
  id           text PRIMARY KEY,
  from_loc     text NOT NULL REFERENCES locations(id),
  to_loc       text NOT NULL REFERENCES locations(id),
  status       text NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','in_transit','completed','cancelled')),
  notes        text,
  created_by   text,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id           text PRIMARY KEY,
  transfer_id  text NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  sku_id       text NOT NULL REFERENCES products(id),
  qty          integer NOT NULL CHECK (qty > 0)
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  output_sku_id  text NOT NULL REFERENCES products(id),
  output_qty     integer NOT NULL DEFAULT 1,
  active         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_lines (
  id            text PRIMARY KEY,
  recipe_id     text NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  input_sku_id  text NOT NULL REFERENCES products(id),
  input_qty     integer NOT NULL CHECK (input_qty > 0)
);

-- Conversions (runtime instances of recipes)
CREATE TABLE IF NOT EXISTS conversions (
  id           text PRIMARY KEY,
  recipe_id    text NOT NULL REFERENCES recipes(id),
  qty          integer NOT NULL CHECK (qty > 0),  -- executions of recipe
  location_id  text NOT NULL REFERENCES locations(id),  -- where outputs land
  status       text NOT NULL DEFAULT 'planned'
               CHECK (status IN ('planned','in_progress','done','cancelled')),
  notes        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_by   text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);

-- Avg cost tracking (updated on each purchase_in / conversion_in)
CREATE TABLE IF NOT EXISTS avg_costs (
  sku_id      text NOT NULL REFERENCES products(id),
  location_id text NOT NULL REFERENCES locations(id),
  avg_cost    numeric(12,4) NOT NULL DEFAULT 0,
  qty         integer NOT NULL DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (sku_id, location_id)
);
```

---

## 3. Default SKUs (seed data for inventory system)

```sql
INSERT INTO products (id, sku, name, unit_type, base_qty, price, stock, active) VALUES
  ('sku_corr',   'CORR-WC2026',   'Corrugado Mundial 2026',   'corrugado', 16,  0, 0, true),
  ('sku_caja',   'CAJA-WC2026',   'Caja Mundial 2026',        'caja',     100,  0, 0, true),
  ('sku_sobre',  'SOBRE-WC2026',  'Sobre Mundial 2026',       'sobre',      7,  12, 0, true),
  ('sku_carta',  'CARTA-WC2026',  'Carta/Sticker',            'carta',      1,   2, 0, true),
  ('sku_album',  'ALBUM-WC2026',  'Álbum Mundial 2026',       'album',      1,  85, 0, true),
  ('sku_set',    'SET-WC2026',    'Set Completo Mundial 2026','set',         1, 950, 0, true)
ON CONFLICT DO NOTHING;

-- Parent links
UPDATE products SET parent_sku_id = 'sku_corr'  WHERE id = 'sku_caja';
UPDATE products SET parent_sku_id = 'sku_caja'  WHERE id = 'sku_sobre';
UPDATE products SET parent_sku_id = 'sku_sobre' WHERE id = 'sku_carta';

-- Recipes
INSERT INTO recipes (id, name, output_sku_id, output_qty) VALUES
  ('recipe_open_corr',   'Abrir corrugado → cajas',         'sku_caja',  16),
  ('recipe_open_caja',   'Abrir caja → sobres',             'sku_sobre', 100),
  ('recipe_open_sobre',  'Abrir sobre → cartas',            'sku_carta',   7),
  ('recipe_build_set',   'Ensamblar set completo',          'sku_set',     1)
ON CONFLICT DO NOTHING;

-- Recipe inputs
INSERT INTO recipe_lines (id, recipe_id, input_sku_id, input_qty) VALUES
  ('rl_corr_1',   'recipe_open_corr',  'sku_corr',  1),
  ('rl_caja_1',   'recipe_open_caja',  'sku_caja',  1),
  ('rl_sobre_1',  'recipe_open_sobre', 'sku_sobre', 1),
  -- Set: 638 cards (WC2026 has 638 stickers) + 1 album + 1 spare packet
  ('rl_set_cards', 'recipe_build_set', 'sku_carta',  638),
  ('rl_set_album', 'recipe_build_set', 'sku_album',    1),
  ('rl_set_sobre', 'recipe_build_set', 'sku_sobre',    1)
ON CONFLICT DO NOTHING;
```

---

## 4. API Endpoints to Build

### Inventory service (shared, internal)
All stock changes route through `InventoryService.recordMovement()`:
- Validates location_from has sufficient stock
- Writes movement row
- Calls `REFRESH MATERIALIZED VIEW CONCURRENTLY stock`
- Updates `avg_costs` on inbound movements

### New endpoints

```
# Locations
GET    /api/locations
POST   /api/locations
PATCH  /api/locations/:id

# Recipes
GET    /api/recipes
POST   /api/recipes          (with lines)
PATCH  /api/recipes/:id
DELETE /api/recipes/:id

# Purchases
GET    /api/purchases?status=
POST   /api/purchases        (creates draft)
GET    /api/purchases/:id
PATCH  /api/purchases/:id/pay
PATCH  /api/purchases/:id/receive  → writes purchase_in movements
DELETE /api/purchases/:id    (cancel draft only)

# Transfers
GET    /api/transfers
POST   /api/transfers        (creates draft)
PATCH  /api/transfers/:id/complete → writes transfer movements
PATCH  /api/transfers/:id/cancel

# Conversions
GET    /api/conversions?status=
POST   /api/conversions      (planned)
PATCH  /api/conversions/:id/start   → inputs → WIP movements
PATCH  /api/conversions/:id/finish  → WIP → null + null → output movements
PATCH  /api/conversions/:id/cancel  → reverse WIP movements if in_progress

# Stock & movements
GET    /api/stock?location_id=&sku_id=
GET    /api/stock/wip
GET    /api/stock/idle?days=30
GET    /api/movements?sku_id=&location_id=&from=&to=&type=
GET    /api/reports/cogs?sku_id=    (avg cost rollup up the recipe tree)
GET    /api/reports/sales?channel=&from=&to=
```

### Wire existing POS/wholesale sales to movements
When a POS sale is `confirmed`: write `sale` movements for each line item (from = sale's location, to = null). Same for wholesale sales.

---

## 5. Admin UI Screens to Build

| Screen | Route | Priority |
|--------|-------|----------|
| Stock Dashboard | `/stock` | P0 — headline numbers |
| Purchases | `/purchases` | P0 — how stock enters |
| Conversions | `/conversions` | P0 — core business flow |
| Transfers | `/transfers` | P1 — warehouse → POS |
| Recipes | `/recipes` | P1 — configure conversion rules |
| Locations | `/locations` | P2 — CRUD |
| Movement Ledger | `/movements` | P2 — audit view |

### Stock Dashboard (`/stock`) widgets
- Total stock per location (cards/chart)
- WIP qty (conversion + assembly)
- Idle stock alerts (items with no movement > 30 days)
- Today's conversions in progress
- Stock value (qty × avg_cost) per location

### Purchases screen
- List with status badges (draft/paid/received)
- Create dialog: supplier, lines (SKU + qty + unit_cost)
- Actions: Mark Paid → Mark Received (triggers movements)

### Conversions screen
- List grouped by status
- "Nueva conversión": pick recipe, qty, destination location
- Timeline: planned → in_progress (with WIP stock badge) → done
- Cancel with automatic reversal of WIP movements

---

## 6. Advanced Features (beyond spec)

### 6.1 Real-time stock alerts
- Supabase Realtime on `movements` table
- Admin dashboard updates without refresh
- Toast alert when any SKU drops below configured minimum

### 6.2 Barcode scanner integration
- Each SKU has a barcode
- POS and transfer screens: scan barcode → auto-fill SKU + qty
- Works with USB HID scanners (just `onKeyDown` capture)

### 6.3 Cost rollup report
- "Costo de un set completo": walk recipe tree bottom-up
- Shows: avg_cost(carta) × 638 + avg_cost(album) × 1 + avg_cost(sobre) × 1
- Plus breakdown per layer with margin at each stage

### 6.4 Inventory valuation report
- Stock qty × avg_cost per (SKU, location)
- Total portfolio value
- Breakdown: corrugados value vs already-converted value

### 6.5 Idle stock aging
- Heatmap or list: SKUs with no outbound movement in N days
- Sortable by age, value at risk, location
- Export to CSV

### 6.6 Purchase order PDF
- Generate PDF from purchase draft (for supplier)
- Simple: supplier name, lines, totals, company header

### 6.7 Conversion batch tracking
- Link multiple conversions to a "batch" (e.g. "Lote Mayo 2026")
- Report: input cost per batch → output value → margin

### 6.8 Multi-location stock transfer approvals
- Optional: require manager approval for large transfers (qty > threshold)
- Approval stored in `transfers` table, movement only writes on approval

### 6.9 FIFO cost layers (future)
- Replace avg_cost with FIFO layers table
- Required for accurate COGS when input costs fluctuate

### 6.10 Webhook on low stock
- Configurable minimum qty per SKU per location
- HTTP webhook (or WhatsApp via Twilio) when stock crosses threshold

---

## 7. Implementation Order

### Sprint 1 — Foundation (no UI yet)
1. `inventory_schema.sql` — run migrations
2. Seed default locations + SKUs + recipes (idempotent script)
3. `InventoryService` — `recordMovement()`, `refreshStock()`, `updateAvgCost()`
4. Unit tests for the service (no DB required, mock Supabase)

### Sprint 2 — Purchases flow
1. `POST /api/purchases` + `purchase_lines`
2. `PATCH /api/purchases/:id/pay`
3. `PATCH /api/purchases/:id/receive` → movements
4. Admin UI: Purchases list + create dialog + workflow buttons

### Sprint 3 — Transfers
1. `POST /api/transfers` + `transfer_lines`
2. `PATCH /api/transfers/:id/complete` → movements
3. Admin UI: Transfers screen

### Sprint 4 — Conversions (most complex)
1. `POST /api/conversions`
2. `PATCH .../start` → inputs to WIP
3. `PATCH .../finish` → WIP consumed, outputs created
4. `PATCH .../cancel` → reverse WIP
5. Admin UI: Conversions screen with status timeline

### Sprint 5 — Stock screens & reporting
1. `/api/stock` endpoint (reads materialized view)
2. `/api/movements` audit endpoint
3. Stock Dashboard UI
4. Movement ledger UI (filterable)
5. Cost rollup report

### Sprint 6 — Wire existing sales to movements
1. POS sale confirm → `sale` movements
2. Wholesale sale confirm → `sale` movements
3. Reconcile `products.stock` from movements

### Sprint 7 — Advanced features
- Barcode scanner (6.2)
- Idle stock aging (6.5)
- Inventory valuation (6.4)
- Cost rollup report (6.3)
- Real-time alerts (6.1)

---

## 8. What Does NOT Change

- Existing `customers`, `orders`, `deliverers`, `wholesalers`, `expenses`, `returns` — keep as-is
- Existing POS sales UI — add movement writing on confirm, but UI stays the same
- Auth / user management — no change
- The `products` table — we ADD columns, don't replace it

The new inventory system is additive. Old simple `stock` integer stays for backwards compat during migration; the new `stock` materialized view becomes the source of truth.
