-- Mi Panini drafts table — print-ready metadata per custom sticker.
--
-- One row per cart item with SKU prefix MI-PANINI-. Order can contain
-- multiple Mi Panini drafts (each its own row). order_number ties them
-- back to the orders table.
--
-- photo_url points to public bucket panini-customs/<user_id>/<draft_id>.jpg
-- (bucket itself is RLS-protected, but signed URLs work for admin print).

CREATE TABLE IF NOT EXISTS public.mi_panini_drafts (
  id TEXT PRIMARY KEY,                                 -- the <draftId> portion of SKU
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_number TEXT REFERENCES public.orders(order_number) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('BASE', 'BRONCE', 'PLATA', 'ORO')),
  player_name TEXT NOT NULL,
  country TEXT NOT NULL,
  stat_pace INT NOT NULL CHECK (stat_pace BETWEEN 0 AND 99),
  stat_shooting INT NOT NULL CHECK (stat_shooting BETWEEN 0 AND 99),
  stat_passing INT NOT NULL CHECK (stat_passing BETWEEN 0 AND 99),
  stat_defending INT NOT NULL CHECK (stat_defending BETWEEN 0 AND 99),
  photo_storage_path TEXT,                             -- panini-customs/<user_id>/<draft_id>.jpg
  photo_public_url TEXT,                               -- cached public URL for admin convenience
  ai_processed_url TEXT,                               -- bg-removed version (Replicate result, optional)
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PRINTED', 'SHIPPED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mi_panini_drafts_order_idx
  ON public.mi_panini_drafts (order_number);

CREATE INDEX IF NOT EXISTS mi_panini_drafts_user_idx
  ON public.mi_panini_drafts (user_id, created_at DESC);

ALTER TABLE public.mi_panini_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own drafts" ON public.mi_panini_drafts;
CREATE POLICY "Users read own drafts" ON public.mi_panini_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Note: service_role bypasses RLS so the API can write drafts on behalf
-- of authenticated users without needing per-user policies.
