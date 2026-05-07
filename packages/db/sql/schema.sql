-- =====================================================================
-- Admin Mundial 2026 — Schema Postgres (Supabase)
-- Idempotente: se puede correr varias veces sin romper.
-- =====================================================================

-- ---------- Productos ----------
CREATE TABLE IF NOT EXISTS products (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  category        text,
  emoji           text,
  price           numeric(12,2) NOT NULL DEFAULT 0,
  cost            numeric(12,2),
  stock           integer NOT NULL DEFAULT 0,
  supplier        text,
  barcode         text,
  clave_prod_serv text,
  clave_unidad    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ---------- Customers (clientes app) ----------
CREATE TABLE IF NOT EXISTS customers (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  phone         text,
  email         text,
  address       text,
  member_since  date,
  total_orders  integer DEFAULT 0,
  total_spent   numeric(12,2) DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ---------- Deliverers (repartidores) ----------
CREATE TABLE IF NOT EXISTS deliverers (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  phone               text,
  username            text UNIQUE,
  vehicle             text,
  plate               text,
  zone                text,
  status              text NOT NULL DEFAULT 'DISPONIBLE' CHECK (status IN ('DISPONIBLE','EN_RUTA','DESCANSO')),
  rating              numeric(3,2),
  deliveries_today    integer DEFAULT 0,
  deliveries_total    integer DEFAULT 0,
  current_order       text,
  lat                 numeric(10,7),
  lng                 numeric(10,7),
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverers_username ON deliverers(username);

-- ---------- Wholesalers (mayoristas) ----------
CREATE TABLE IF NOT EXISTS wholesalers (
  id              text PRIMARY KEY,
  razon_social    text NOT NULL,
  rfc             text,
  email           text,
  contacto        text,
  nota            text,
  regimen_fiscal  text,
  uso_cfdi        text,
  codigo_postal   text,
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wholesalers_rfc ON wholesalers(rfc);

-- ---------- Orders (app users) ----------
CREATE TABLE IF NOT EXISTS orders (
  order_number    text PRIMARY KEY,
  customer_id     text REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text,
  phone           text,
  address         text,
  date            timestamptz,
  status          text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','ASSIGNED','IN_ROUTE','DELIVERED','CANCELLED')),
  payment_method  text,
  delivery_type   text DEFAULT 'local' CHECK (delivery_type IN ('local','envio')),
  shipping_guide  text,
  deliverer_id    text REFERENCES deliverers(id) ON DELETE SET NULL,
  subtotal        numeric(12,2) DEFAULT 0,
  shipping        numeric(12,2) DEFAULT 0,
  total           numeric(12,2) DEFAULT 0,
  notes           text,
  deleted         boolean DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  updated_at      timestamptz,
  updated_by      text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_deliverer ON orders(deliverer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id            bigserial PRIMARY KEY,
  order_number  text NOT NULL REFERENCES orders(order_number) ON DELETE CASCADE,
  product_id    text,
  name          text,
  qty           integer NOT NULL,
  price         numeric(12,2) NOT NULL,
  cost_at_sale  numeric(12,2),
  position      integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_number);

-- ---------- POS Sales ----------
CREATE TABLE IF NOT EXISTS sales (
  id              text PRIMARY KEY,
  customer_name   text,
  customer_phone  text,
  payment_method  text,
  notes           text,
  total           numeric(12,2) DEFAULT 0,
  created_by      text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);

CREATE TABLE IF NOT EXISTS sale_items (
  id            bigserial PRIMARY KEY,
  sale_id       text NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id    text,
  name          text,
  emoji         text,
  quantity      numeric(12,3) NOT NULL,
  unit_price    numeric(12,2) NOT NULL,
  subtotal      numeric(12,2) NOT NULL,
  cost_at_sale  numeric(12,2),
  total_amount  numeric(12,2),
  mode          text DEFAULT 'unit' CHECK (mode IN ('unit','total')),
  position      integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ---------- Wholesale Sales ----------
CREATE TABLE IF NOT EXISTS wholesale_sales (
  id              text PRIMARY KEY,
  wholesaler_id   text REFERENCES wholesalers(id) ON DELETE SET NULL,
  wholesaler_name text,
  payment_method  text,
  status          text DEFAULT 'pending' CHECK (status IN ('pagado','pendiente_credito','parcial','cancelled')),
  subtotal        numeric(12,2) DEFAULT 0,
  discount_type   text,
  discount_value  numeric(12,2),
  discount_amount numeric(12,2),
  total           numeric(12,2) DEFAULT 0,
  amount_paid     numeric(12,2) DEFAULT 0,
  notes           text,
  created_by      text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wsales_wholesaler ON wholesale_sales(wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_wsales_status ON wholesale_sales(status);
CREATE INDEX IF NOT EXISTS idx_wsales_created ON wholesale_sales(created_at DESC);

CREATE TABLE IF NOT EXISTS wholesale_sale_items (
  id            bigserial PRIMARY KEY,
  sale_id       text NOT NULL REFERENCES wholesale_sales(id) ON DELETE CASCADE,
  product_id    text,
  name          text,
  emoji         text,
  quantity      integer NOT NULL,
  unit_price    numeric(12,2) NOT NULL,
  subtotal      numeric(12,2) NOT NULL,
  cost_at_sale  numeric(12,2),
  position      integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wholesale_payments (
  id          bigserial PRIMARY KEY,
  sale_id     text NOT NULL REFERENCES wholesale_sales(id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL,
  method      text,
  date        date,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpayments_sale ON wholesale_payments(sale_id);

-- ---------- Expenses (egresos) ----------
CREATE TABLE IF NOT EXISTS expenses (
  id              text PRIMARY KEY,
  date            date NOT NULL,
  concept         text NOT NULL,
  category        text,
  amount          numeric(12,2) NOT NULL,
  payment_method  text,
  notes           text,
  created_by      text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz,
  updated_by      text
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ---------- Returns (devoluciones) ----------
CREATE TABLE IF NOT EXISTS returns (
  id              text PRIMARY KEY,
  original_id     text NOT NULL,
  source          text NOT NULL CHECK (source IN ('pos','wholesale','app')),
  reason          text,
  refund_method   text,
  refund_amount   numeric(12,2),
  created_by      text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id          bigserial PRIMARY KEY,
  return_id   text NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id  text,
  name        text,
  qty         numeric(12,3) NOT NULL,
  unit_price  numeric(12,2),
  subtotal    numeric(12,2)
);

-- ---------- Invoices (CFDI) ----------
CREATE TABLE IF NOT EXISTS invoices (
  id            text PRIMARY KEY,
  source        text NOT NULL CHECK (source IN ('pos','wholesale')),
  source_id     text NOT NULL,
  uuid          text UNIQUE,
  status        text DEFAULT 'pending',
  total         numeric(12,2),
  pdf_url       text,
  xml_url       text,
  receptor_rfc  text,
  receptor_name text,
  cancelled_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_source ON invoices(source, source_id);

-- ---------- Stock Adjustments ----------
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              text PRIMARY KEY,
  product_id      text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta           integer NOT NULL,
  previous_stock  integer,
  new_stock       integer,
  reason          text,
  note            text,
  created_by      text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);

-- ---------- Audit Log ----------
CREATE TABLE IF NOT EXISTS audit (
  id                  text PRIMARY KEY,
  ts                  timestamptz NOT NULL DEFAULT now(),
  "user"              text,
  role                text,
  method              text,
  path                text,
  status              integer,
  action              text,
  resource            text,
  resource_id         text,
  before_data         jsonb,
  after_data          jsonb,
  body                jsonb,
  reversible          boolean,
  reverted            boolean DEFAULT false,
  reverted_at         timestamptz,
  reverted_by         text,
  reverted_audit_id   text
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit("user");
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit(resource, resource_id);

-- ---------- Users (gestión interna — para futuro #5, no rompe nada hoy) ----------
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','repartidor')),
  email         text,
  totp_secret   text,
  totp_enabled  boolean DEFAULT false,
  active        boolean DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz DEFAULT now()
);
