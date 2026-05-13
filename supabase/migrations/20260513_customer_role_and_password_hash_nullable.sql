-- Customer accounts (mobile app signups) need a 'customer' role in
-- public.users.role + auth-managed users don't need a local password_hash
-- since Supabase Auth (auth.users) stores the hash.

ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin', 'repartidor', 'capturista', 'customer']));

-- Mobile customer collection sync
CREATE TABLE IF NOT EXISTS public.album_stickers (
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   text    NOT NULL,
  sticker_n  int     NOT NULL,
  owned      int     NOT NULL DEFAULT 0,
  needed     int     NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, group_id, sticker_n)
);

CREATE INDEX IF NOT EXISTS idx_album_user ON public.album_stickers(user_id);
