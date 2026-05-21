# Cromos 26 — Remaining Tasks (last updated 2026-05-20)

Single source of truth for everything still owed before public launch.
Older planning docs moved to `docs/archive/`.

---

## Pablo owes (waiting on)

Send `PABLO_QUESTIONS_ROUND3.md` and wait for answers. Specifically:

| # | Topic | Blocker for |
|---|-------|-------------|
| 1 | Auth flow (email-only vs +Google/Apple/Facebook) | Auth sprint, Apple Store rule 4.8 |
| 2 | Payment error retry (TEST mode) — exact error text | Final MP debug |
| 3 | Pickup code (4 or 6 digits + email/SMS?) | Pickup UX |
| 4 | Coca-Cola brand kit (logo + colors) | Promo section polish |
| 5 | Coca-Cola exact sticker count | Album total |
| 6 | Coca-Cola redemption channel | Promo section copy |
| 7 | 6 new countries' player rosters (BIH/SWE/TUR/CZE/IRQ/COD) | Album labels |
| 8 | Confirm 20 Star player names + spellings | Album + shop labels |
| 9 | Stickers-per-team confirm (20 vs varying) | Album catalog |
| 10 | STAR-ORO $2,500 typo check | Pricing matrix |
| 11 | Mi Panini flow (auto filter vs human 24h) | Custom-sticker feature |
| 12 | Referral credit redemption rules (cart-wide vs SKU-limited, min balance, expiry) | Referral checkout logic |

---

## Branko owes (manual config, no Pablo input needed)

### Google Maps / Places

- ✅ Both API keys created + restricted (Android `Cromos26KeyAndroid`, iOS `Cromos26KeyiOS`)
- ✅ Keys wired into `apps/mobile/eas.json` + `apps/mobile/.env.local`
- ✅ Address autocomplete component built (`AddressForm`)
- ⏳ Add **Play App Signing SHA-1** to Android key restriction (after first AAB upload to Play Console)
- ⏳ Rotate keys before public launch (current keys exposed in our chat)

### Mercado Pago

- ✅ Code path ready (`/api/payments/mp/preference` → live when env vars set, falls back to STUB)
- ⏳ **Paste TEST credentials into Render env:**
  ```
  MP_ACCESS_TOKEN_TEST   = APP_USR-8297526384109437-052000-...
  MP_PUBLIC_KEY_TEST     = APP_USR-be0ae120-6434-...
  MP_WEBHOOK_SECRET      = 0d7aba4595715d0829e7986f...
  ```
- ⏳ Temporarily unset `MP_ACCESS_TOKEN_PROD` to force TEST mode during QA
- ⏳ Curl-verify preference endpoint stops returning STUB
- ⏳ Pablo retries checkout end-to-end with TEST card (`5031 7557 3453 0604`, CVV `123`, future date)

### Play Store

- ⏳ Service account JSON for `eas submit --platform android` — can create ourselves using Pablo's Play Console password
- ⏳ Upload first AAB to Internal Testing track
- ⏳ Add testers + opt-in URL
- ⏳ Promote Internal → Closed → Open → Production after testing

### App Store

- ✅ Apple Team `7D7NLMWLYL` (Pablo's account) confirmed
- ✅ TestFlight build #7 submitted earlier
- ⏳ Confirm #7 status is "Ready to Test" (Pablo)
- ⏳ Add Internal Testing group + invite testers
- ⏳ Submit for App Review (1-2 day turnaround)

### Domain

- ⏳ Buy `zonamundial.mx` (Branko handles, registers under Pablo's profile if requested)
- ⏳ Point DNS to Vercel (landing) + Render (API)
- ⏳ Update share text + referral URLs in code

### Production data

- ⏳ Add real product images for 5 missing SKUs (Acrilico, Caja Repetidas Consigna, Carta Coca-Cola, Cartita suelta, Set Coca-Cola en sobre) — need photos from Pablo
- ⏳ Seed any new Star SKUs once Pablo confirms #10

### OAuth (when auth sprint starts)

- ⏳ Google OAuth Client IDs (Android + iOS + Web) in Google Cloud Console
- ⏳ Apple "Sign in with Apple" service ID + key in Apple Developer
- ⏳ Facebook App ID in Meta Developer Portal (only if Pablo picks option C)

---

## Code features still to build

After Pablo answers the questions, in this order:

### Auth sprint (~6 hrs, blocked on Q1)
- Welcome screen + sign-in/sign-up flow
- Provider buttons (Google / Apple / Facebook depending on Q1 answer)
- `expo-auth-session` config
- Link existing local album state to account (one-time merge)

### Backend remaining (~3 hrs)
- `/auth/signup` captures `?ref=` query param into `users.referredBy`
- `/referral/me` returns code + stats
- `/referral/credit` internal endpoint triggered by paid webhook
- MP webhook decrement on `payment.created` for Star SKUs (needs `star_player_stock` table)
- Pickup code generated server-side and persisted on order (instead of client-derived last-6)

### Stars inventory live (~2 hrs)
- Supabase `star_player_stock` table + migration
- Admin grid live-editable (currently read-only)
- CSV export

### Final pre-launch polish
- Replace placeholder product images
- Add Real player names where Pablo confirms
- Trademark disclaimer pass on every screen

---

## What's already DONE (don't re-do)

- ✅ Album restructure: 48 teams (with 6 newly qualified) + 3 FWC sections + Stars + Coca-Cola
- ✅ Tap behavior (+1 / long-press = -1)
- ✅ Share repetidas (formatted exactly per spec)
- ✅ Settings → header gear icon
- ✅ Tienda 4-card hero layout
- ✅ Stars catalog collapsed to 20 player cards + detail page
- ✅ Profile tab (5th bottom tab, merges referral + quick links)
- ✅ Recurring inline banners on Album (every 4 sections, rotate)
- ✅ Pickup address card + 6-digit code
- ✅ Cash payment killed (card-only everywhere)
- ✅ Referral math (5% inviter / $100 invitee ≥ $1000)
- ✅ Checkout address split fields + Google Places autocomplete
- ✅ Mobile UI translated to English
- ✅ Admin Stars inventory page (read-only)
- ✅ Real product images for 7 main SKUs
- ✅ Landing page at `https://zona-mundial.vercel.app/`
- ✅ Privacy / Terms / Delete-account legal pages
- ✅ Admin moved to `/admin/*`, public landing at `/`
- ✅ Render auto-deploys API on push; Vercel auto-deploys landing on push

---

## Doc map (where to find what)

| File | Purpose |
|------|---------|
| `REMAINING_TASKS.md` | **This file** — single source of truth |
| `PABLO_QUESTIONS_ROUND3.md` | 12 open questions to send Pablo |
| `PABLO_LAUNCH_GUIDE.md` | One-pager for Pablo on the 4 launch blockers (MP / EAS / Play / TestFlight) |
| `PABLO_CONTENT/` | Pablo's source material — PDFs, screenshots, product photos |
| `docs/MASTER_PLAN.md` | Project architecture overview |
| `docs/ADMIN_GUIDE.md` | Admin panel usage guide |
| `docs/INVENTORY_PLAN.md` | Inventory + movements ledger design |
| `docs/GUIDE.md` | General product guide |
| `docs/DEPLOY_RENDER.md` | API deploy notes (Render) |
| `docs/CLIENT_BRIEF.md` | Original client brief |
| `docs/REWRITE_PLAN.md` | Historical rewrite plan |
| `docs/archive/round1-plan.md` | Round 1 feedback plan (executed, kept for history) |
| `docs/archive/round2-plan.md` | Round 2 feedback plan (executed, kept for history) |
| `docs/archive/mobile-polish-plan.md` | Old mobile polish plan (executed) |
| `notes.md` | Branko's private notes — don't touch without permission |
