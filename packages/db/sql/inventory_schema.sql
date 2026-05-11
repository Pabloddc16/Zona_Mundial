-- =====================================================================
-- Inventory Ledger System — Mundial 2026
-- Idempotent: safe to run multiple times
-- Run: psql $DB_URL -f packages/db/sql/inventory_schema.sql
-- =====================================================================

-- Extend products with inventory fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku          text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type    text
  CHECK (unit_type IN ('corrugado','caja','sobre','carta','album','set','otro'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_sku_id text REFERENCES products(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_qty     integer DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost     numeric(12,4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- Physical and virtual locations
CREATE TABLE IF NOT EXISTS locations (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('warehouse','pos','wip_conversion','wip_assembly')),
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO locations (id, name, type) VALUES
  ('loc_warehouse',    'Bodega Principal',   'warehouse'),
  ('loc_pos',          'Punto de Venta',     'pos'),
  ('loc_wip_conv',     'WIP — Conversión',   'wip_conversion'),
  ('loc_wip_assembly', 'WIP — Ensamblado',   'wip_assembly')
ON CONFLICT DO NOTHING;

-- Append-only movement ledger (NEVER UPDATE OR DELETE)
CREATE TABLE IF NOT EXISTS movements (
  id            text PRIMARY KEY,
  sku_id        text NOT NULL REFERENCES products(id),
  qty           integer NOT NULL CHECK (qty > 0),
  location_from text REFERENCES locations(id),
  location_to   text REFERENCES locations(id),
  type          text NOT NULL CHECK (type IN (
                  'purchase_in','transfer','conversion_out','conversion_in',
                  'sale','adjustment')),
  ref_table     text NOT NULL,
  ref_id        text NOT NULL,
  unit_cost     numeric(12,4),
  note          text,
  created_by    text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movements_sku     ON movements(sku_id);
CREATE INDEX IF NOT EXISTS idx_movements_type    ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_ref     ON movements(ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_movements_from    ON movements(location_from);
CREATE INDEX IF NOT EXISTS idx_movements_to      ON movements(location_to);

-- Derived stock view (refresh after each write group)
CREATE MATERIALIZED VIEW IF NOT EXISTS stock AS
SELECT
  sku_id,
  location_id,
  SUM(qty) AS qty
FROM (
  SELECT sku_id, location_to   AS location_id,  qty FROM movements WHERE location_to   IS NOT NULL
  UNION ALL
  SELECT sku_id, location_from AS location_id, -qty FROM movements WHERE location_from IS NOT NULL
) t
GROUP BY sku_id, location_id
HAVING SUM(qty) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_sku_loc ON stock(sku_id, location_id);

-- Function called by the API after every movement write
CREATE OR REPLACE FUNCTION refresh_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_stock() TO service_role;

-- Avg cost per (sku, location) — updated on each inbound movement
CREATE TABLE IF NOT EXISTS avg_costs (
  sku_id      text NOT NULL REFERENCES products(id),
  location_id text NOT NULL REFERENCES locations(id),
  avg_cost    numeric(12,4) NOT NULL DEFAULT 0,
  qty         integer NOT NULL DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (sku_id, location_id)
);

-- Purchases (draft → paid → received)
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
CREATE INDEX IF NOT EXISTS idx_purchases_status  ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id           text PRIMARY KEY,
  purchase_id  text NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  sku_id       text NOT NULL REFERENCES products(id),
  qty          integer NOT NULL CHECK (qty > 0),
  unit_cost    numeric(12,4) NOT NULL,
  received_to  text REFERENCES locations(id) DEFAULT 'loc_warehouse'
);
CREATE INDEX IF NOT EXISTS idx_purchase_lines_purchase ON purchase_lines(purchase_id);

-- Transfers (draft → completed)
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
CREATE INDEX IF NOT EXISTS idx_transfers_status  ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at DESC);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id          text PRIMARY KEY,
  transfer_id text NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  sku_id      text NOT NULL REFERENCES products(id),
  qty         integer NOT NULL CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON transfer_lines(transfer_id);

-- Recipes (conversion blueprints)
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
CREATE INDEX IF NOT EXISTS idx_recipe_lines_recipe ON recipe_lines(recipe_id);

-- Conversions (planned → in_progress → done)
CREATE TABLE IF NOT EXISTS conversions (
  id           text PRIMARY KEY,
  recipe_id    text NOT NULL REFERENCES recipes(id),
  qty          integer NOT NULL CHECK (qty > 0),
  location_id  text NOT NULL REFERENCES locations(id),
  status       text NOT NULL DEFAULT 'planned'
               CHECK (status IN ('planned','in_progress','done','cancelled')),
  notes        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_by   text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversions_status  ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_created ON conversions(created_at DESC);
