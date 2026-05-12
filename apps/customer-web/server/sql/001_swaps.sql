-- Mundial 26 — swaps sync table
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

create extension if not exists "pgcrypto";

create table if not exists public.swaps (
  id uuid primary key default gen_random_uuid(),
  offerer_user text not null,           -- QR owner (will -took, +gave)
  scanner_user text not null,           -- one who scanned & confirmed
  scanner_name text,
  took text[] not null default '{}',    -- codes scanner took FROM offerer
  gave text[] not null default '{}',    -- codes scanner gave TO offerer
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists swaps_offerer_idx on public.swaps(offerer_user);
create index if not exists swaps_pending_idx on public.swaps(offerer_user) where applied_at is null;

-- RLS — open for the demo. Lock down (auth-based) before production scale.
alter table public.swaps enable row level security;

drop policy if exists "anon insert swaps"  on public.swaps;
drop policy if exists "anon select swaps"  on public.swaps;
drop policy if exists "anon update swaps"  on public.swaps;

create policy "anon insert swaps" on public.swaps
  for insert with check (true);

create policy "anon select swaps" on public.swaps
  for select using (true);

create policy "anon update swaps" on public.swaps
  for update using (true) with check (true);

-- Realtime: emit INSERT/UPDATE events for subscribers.
alter publication supabase_realtime add table public.swaps;
