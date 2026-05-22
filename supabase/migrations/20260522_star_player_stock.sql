-- Star player stock — physical inventory per (player_slug, rarity).
-- Updated by admin (manual restock) or MP webhook (decrement on Star SKU payment).
--
-- Rarity values match apps/admin/src/lib/star-inventory.ts STAR_RARITIES.
-- STAR-tier players have rarity=ORO at count=0 (Pablo R3 #10 — typo, SKU doesn't exist).

CREATE TABLE IF NOT EXISTS public.star_player_stock (
  player_slug TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('BASE', 'BRONCE', 'PLATA', 'ORO')),
  count INT NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_slug, rarity)
);

-- Seed initial values from STAR_PLAYERS x INITIAL_STOCK in admin lib.
-- Only insert if table is empty so re-runs are safe.
INSERT INTO public.star_player_stock (player_slug, rarity, count)
SELECT * FROM (VALUES
  ('messi','BASE',9),       ('messi','BRONCE',5),      ('messi','PLATA',3),       ('messi','ORO',2),
  ('cristiano','BASE',2),   ('cristiano','BRONCE',2),  ('cristiano','PLATA',3),   ('cristiano','ORO',1),
  ('haaland','BASE',10),    ('haaland','BRONCE',4),    ('haaland','PLATA',2),     ('haaland','ORO',1),
  ('yamal','BASE',13),      ('yamal','BRONCE',12),     ('yamal','PLATA',1),       ('yamal','ORO',1),
  ('vinicius','BASE',10),   ('vinicius','BRONCE',7),   ('vinicius','PLATA',2),    ('vinicius','ORO',1),
  ('modric','BASE',17),     ('modric','BRONCE',7),     ('modric','PLATA',1),      ('modric','ORO',2),
  ('salah','BASE',8),       ('salah','BRONCE',5),      ('salah','PLATA',1),       ('salah','ORO',2),
  ('bellingham','BASE',14), ('bellingham','BRONCE',4), ('bellingham','PLATA',1),  ('bellingham','ORO',1),
  ('mbappe','BASE',8),      ('mbappe','BRONCE',7),     ('mbappe','PLATA',6),      ('mbappe','ORO',1),
  ('hakimi','BASE',9),      ('hakimi','BRONCE',5),     ('hakimi','PLATA',1),      ('hakimi','ORO',2),
  ('son','BASE',11),        ('son','BRONCE',8),        ('son','PLATA',2),         ('son','ORO',1),
  ('valverde','BASE',10),   ('valverde','BRONCE',7),   ('valverde','PLATA',3),    ('valverde','ORO',0),
  ('doku','BASE',13),       ('doku','BRONCE',5),       ('doku','PLATA',1),        ('doku','ORO',0),
  ('a-davies','BASE',14),   ('a-davies','BRONCE',6),   ('a-davies','PLATA',4),    ('a-davies','ORO',0),
  ('l-diaz','BASE',14),     ('l-diaz','BRONCE',1),     ('l-diaz','PLATA',3),      ('l-diaz','ORO',0),
  ('caicedo','BASE',9),     ('caicedo','BRONCE',2),    ('caicedo','PLATA',2),     ('caicedo','ORO',0),
  ('wirtz','BASE',10),      ('wirtz','BRONCE',4),      ('wirtz','PLATA',2),       ('wirtz','ORO',0),
  ('r-jimenez','BASE',16),  ('r-jimenez','BRONCE',10), ('r-jimenez','PLATA',0),   ('r-jimenez','ORO',0),
  ('gakpo','BASE',13),      ('gakpo','BRONCE',11),     ('gakpo','PLATA',2),       ('gakpo','ORO',0),
  ('pulisic','BASE',11),    ('pulisic','BRONCE',5),    ('pulisic','PLATA',7),     ('pulisic','ORO',0)
) AS seed(player_slug, rarity, count)
WHERE NOT EXISTS (SELECT 1 FROM public.star_player_stock LIMIT 1);

ALTER TABLE public.star_player_stock ENABLE ROW LEVEL SECURITY;

-- Public read so mobile shop can check stock; only service_role writes.
DROP POLICY IF EXISTS "Anyone reads stock" ON public.star_player_stock;
CREATE POLICY "Anyone reads stock" ON public.star_player_stock
  FOR SELECT USING (true);

-- Atomic decrement helper used by MP webhook. Returns the new count.
-- Guards against overselling — clamps at 0 instead of going negative.
CREATE OR REPLACE FUNCTION public.decrement_star_stock(p_slug TEXT, p_rarity TEXT, p_qty INT DEFAULT 1)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE public.star_player_stock
     SET count = GREATEST(0, count - p_qty),
         updated_at = now()
   WHERE player_slug = p_slug AND rarity = p_rarity
   RETURNING count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;
