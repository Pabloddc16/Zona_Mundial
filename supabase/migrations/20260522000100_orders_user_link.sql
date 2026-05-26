-- Link orders back to the authenticated user who placed them so we can:
--   1. Apply per-user referral credit on first paid order.
--   2. Show order history per user in mobile profile.
--   3. Filter admin orders by customer.
--
-- user_id is nullable for legacy / guest orders.

-- public.users.id is TEXT (not UUID) — match FK type so constraint creates.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id) WHERE user_id IS NOT NULL;
