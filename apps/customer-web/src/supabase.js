/*
 * Supabase client + swap sync helpers.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at bundle time. If either
 * is missing, we degrade gracefully — `getSupabase()` returns null, callers
 * skip remote sync and the app falls back to the receipt-QR flow.
 *
 * Schema (run in Supabase SQL editor — see server/sql/001_swaps.sql):
 *
 *   create table swaps (
 *     id uuid primary key default gen_random_uuid(),
 *     offerer_user text not null,    -- the QR owner (will -took, +gave)
 *     scanner_user text not null,    -- the one who scanned & confirmed
 *     scanner_name text,
 *     took text[] not null default '{}',  -- codes scanner took FROM offerer
 *     gave text[] not null default '{}',  -- codes scanner gave TO offerer
 *     applied_at timestamptz,
 *     created_at timestamptz not null default now()
 *   );
 *
 * Realtime must be enabled on the table for live sync.
 */
import { createClient } from "@supabase/supabase-js";
import { captureException } from "./sentry.js";

const URL = import.meta.env.VITE_SUPABASE_URL || "";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let _client = null;
let _initFailed = false;

export function isSupabaseConfigured(){
  return !!(URL && KEY);
}

export function getSupabase(){
  if(_client || _initFailed) return _client;
  if(!isSupabaseConfigured()) return null;
  try {
    _client = createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  } catch(err){
    _initFailed = true;
    captureException(err, { tags: { mutation: "supabase.init" } });
    return null;
  }
  return _client;
}

/**
 * Push a swap so the offerer's app can apply it.
 * Returns the inserted row, or null if Supabase is not configured.
 */
export async function pushSwap({ offerer_user, scanner_user, scanner_name, took, gave }){
  const sb = getSupabase();
  if(!sb) return null;
  const row = {
    offerer_user: String(offerer_user || "").trim(),
    scanner_user: String(scanner_user || "").trim(),
    scanner_name: String(scanner_name || "").trim() || null,
    took: Array.isArray(took) ? took : [],
    gave: Array.isArray(gave) ? gave : [],
  };
  if(!row.offerer_user || !row.scanner_user) throw new Error("Missing user");
  const { data, error } = await sb.from("swaps").insert(row).select().single();
  if(error) throw error;
  return data;
}

/**
 * Mark a swap row as applied so it isn't re-applied on next boot.
 */
export async function markSwapApplied(id){
  const sb = getSupabase();
  if(!sb || !id) return;
  const { error } = await sb.from("swaps").update({ applied_at: new Date().toISOString() }).eq("id", id);
  if(error) captureException(error, { tags: { mutation: "supabase.markApplied" } });
}

/**
 * Fetch unapplied swaps directed at this user (catch-up after offline).
 */
export async function fetchPendingSwaps(myUsername){
  const sb = getSupabase();
  if(!sb || !myUsername) return [];
  const { data, error } = await sb.from("swaps")
    .select("*")
    .eq("offerer_user", myUsername)
    .is("applied_at", null)
    .order("created_at", { ascending: true });
  if(error){
    captureException(error, { tags: { mutation: "supabase.fetchPending" } });
    return [];
  }
  return data || [];
}

let _channel = null;
/**
 * Subscribe to live swaps directed at this user. onSwap is called with the
 * row whenever a new INSERT lands. Returns an unsubscribe function.
 */
export function subscribeToSwaps(myUsername, onSwap){
  const sb = getSupabase();
  if(!sb || !myUsername) return () => {};
  if(_channel){ try { sb.removeChannel(_channel); } catch(_){} _channel = null; }
  _channel = sb.channel(`swaps-${myUsername}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "swaps",
      filter: `offerer_user=eq.${myUsername}`,
    }, (payload) => {
      try { onSwap(payload.new); }
      catch(err){ captureException(err, { tags: { mutation: "supabase.onSwap" } }); }
    })
    .subscribe();
  return () => {
    if(_channel){ try { sb.removeChannel(_channel); } catch(_){} _channel = null; }
  };
}
