-- Add server-generated 6-digit pickup code to orders.
-- Replaces client-derived order_number.slice(-6) so staff can verify against
-- a stable, random value the user shows at pickup.
--
-- pickup_code is null for delivery orders, populated only when delivery_type='local'.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_code TEXT;

-- Lookup index so staff can search "show me order with code 384217" quickly.
CREATE INDEX IF NOT EXISTS orders_pickup_code_idx
  ON public.orders (pickup_code)
  WHERE pickup_code IS NOT NULL;
