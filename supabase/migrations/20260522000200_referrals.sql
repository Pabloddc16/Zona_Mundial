-- Referral plumbing.
--
-- users.referral_code  — short shareable slug, generated on signup, unique
-- users.referred_by_id — fk to inviter (auth.uid()); null for direct signups
-- referral_credits     — ledger of credits granted to inviters when invitees pay
--
-- Rules (Pablo R3 #12, May 2026):
--   - Inviter gets 5% of invitee's FIRST purchase, applied only after payment.
--   - Invitee gets $100 MXN off their first order ≥ $1,000.
--   - Credit applies to entire cart, no category filter, no min balance, 12-month expiry.

-- public.users.id is TEXT; match types on every FK referencing it.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS welcome_credit_used BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS users_referred_by_id_idx ON public.users (referred_by_id);

CREATE TABLE IF NOT EXISTS public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_mxn NUMERIC(10, 2) NOT NULL CHECK (amount_mxn > 0),
  source_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  source_order_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 months'),
  redeemed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_credits_user_id_idx
  ON public.referral_credits (user_id, expires_at)
  WHERE redeemed_amount < amount_mxn;

-- One credit grant per (inviter, invitee's first paid order). Anti-double-pay.
CREATE UNIQUE INDEX IF NOT EXISTS referral_credits_source_order_uniq
  ON public.referral_credits (source_order_number, source_user_id)
  WHERE source_order_number IS NOT NULL;

ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

-- auth.uid() returns uuid; users.id is text. Cast for the policy comparison.
DROP POLICY IF EXISTS "Users read own credits" ON public.referral_credits;
CREATE POLICY "Users read own credits" ON public.referral_credits
  FOR SELECT USING (auth.uid()::text = user_id);
