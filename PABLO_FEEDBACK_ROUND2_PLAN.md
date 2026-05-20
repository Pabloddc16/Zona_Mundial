# Pablo Feedback Round 2 — Plan

Changes Pablo requested after first round of QA on the app. Review this before I start executing.

---

## 1) Bottom tab — Profile / Refiere y gana

**Current:** 4 tabs (Album / Store / Stats / Trade). Settings reached via gear icon. Referral reached via card on Album.

**Pablo wants:** Profile + Referral as a 5th bottom tab.

### Decisions to make

- Combine Profile + Referral into a single "Profile" tab (recommended), or two separate tabs?
- Tab label: **Profile** or **Refiere**? Suggest "Profile".
- Tab icon: `person-circle-outline`.
- Position: between Trade and (nothing) — make 5 tabs total again.

### What goes inside

A single screen with stacked sections:

1. **Hero card** — avatar + username + member-since
2. **Refiere y gana hero** (gradient green→gold, same as Album card) — QR + "Mi código" + share
3. **Stats strip** — friends invited, credits earned, credits available
4. **Quick links** — Order history, Saved addresses, Notifications, Settings, About app, Sign out

### Files

- `apps/mobile/src/app/(tabs)/_layout.tsx` — add Profile tab
- `apps/mobile/src/app/(tabs)/profile.tsx` — NEW (merges referral.tsx + settings sections)
- `apps/mobile/src/app/referral.tsx` — keep or merge into profile tab
- Remove Refiere y gana card from Album top (per Pablo it lives in tab now)

**Estimated effort:** 2 hrs

---

## 2) Mercado Pago — TEST credentials (Pablo confirmed)

From `PABLO_CONTENT/WhatsApp Image 2026-05-20 at 06.32.37.jpeg` + notes.md:

```
MP_ACCESS_TOKEN_TEST = APP_USR-8297526384109437-052000-3818e5a733c16918d3c189cb636a79ab-253877808
MP_PUBLIC_KEY_TEST   = APP_USR-be0ae120-6434-4c17-ac56-a4a20f72763f
MP_CLIENT_ID         = 8297526384109437
MP_CLIENT_SECRET     = 0vKLAZaQJbvGODcwavsargMbTwv6qag2
MP_WEBHOOK_SECRET    = 0d7aba4595715d0829e7986f05f8af9e3ae0616495c479c8df6b103c8ae48f4e
```

⚠ Both sets start with `APP_USR-` — Mercado Pago uses that prefix for both test and prod credentials nowadays. Pablo confirms set 2 (image) is **TEST**. Set 1 in notes.md was **PROD**.

### Action

Update Render env vars:

```
MP_ACCESS_TOKEN_TEST   ← APP_USR-8297526384109437-052000-...
MP_PUBLIC_KEY_TEST     ← APP_USR-be0ae120-6434-...
MP_ACCESS_TOKEN_PROD   ← APP_USR-8916044066265172-052000-...
MP_PUBLIC_KEY_PROD     ← APP_USR-8da7a967-40ce-...
MP_WEBHOOK_SECRET      ← 0d7aba4595715d0829e7986f...
```

Code in `apps/api/src/routes/payments.ts` already prefers PROD over TEST. To switch to TEST while debugging, temporarily unset `MP_ACCESS_TOKEN_PROD` on Render OR add a `MP_USE_TEST=1` flag.

**Estimated effort:** 5 min (paste in Render dashboard)

---

## 3) Product images — admin upload UI

**Current:** Product images hard-coded in `apps/mobile/src/lib/data.ts` (e.g. `/products/album-soft.webp`). To change a photo, dev edits the file.

**Pablo wants:** Manual upload from admin so he can swap product photos any time.

### Approach

- Add `image_url` field to Supabase `products` table.
- Admin product edit page gets an image-upload field.
- Uploads go to Supabase Storage bucket `product-images`.
- Mobile fetches product image URL from API (no more hard-coded paths).

### Caveats

- Existing mobile uses `useProductsStore` which fetches from `/api/products`. If that already returns `image_url`, just wire admin upload. Verify.
- If not, need a small schema migration.

### Files

- Admin: new product image upload component (drop-zone)
- Supabase: storage bucket policy (public read, admin write)
- API: `PATCH /api/products/:id` accept image_url update
- Mobile: products-store already reads from API — should automatically pick up new URLs

**Estimated effort:** 3 hrs

---

## 4) Subtle "earn 5%" + "complete album" ads scattered

**Pablo wants:** More CTAs throughout the app — but subtle, not aggressive.

### Where to add

| Screen | CTA |
|--------|-----|
| **Album — sticky bottom banner** when scrolled | "You're missing X stickers — Complete album →" (taps to `/shop/album`) |
| **Stats — bottom strip below progress card** | "Invite friends, earn 5% on every purchase →" (taps to Profile/Referral tab) |
| **Trade (Swap) — empty state when no matches** | "Out of swaps? Invite a friend and get credit →" |
| **Settings — between sections** | "Refer a friend, earn 5%" small card |
| **Checkout — under order summary** | "Have a referral code?" expandable input |

Rule: max 1 CTA per screen, never popup. Subtle = inline cards/banners, not modals.

### Files

- Each tab screen (`index.tsx`, `stats.tsx`, `swap.tsx`)
- `app/checkout/index.tsx`

**Estimated effort:** 2 hrs

---

## 5) Stars catalog — collapse per-player

**Current:** 80 SKUs shown as 80 cards (4 cards per player × 20 players).

**Pablo wants:** 20 cards (1 per player). Tap a player → expand to show 4 rarity options to pick from.

### UX

- Grid of 20 player cards (name, country, tier badge)
- Tap → bottom sheet (or detail page) showing:
   - Big player photo / name
   - 4 rarity choices: Base / Bronze / Silver / Gold
   - Each shows price + stock status
   - Tap rarity → adds that specific SKU to cart

### Files

- `apps/mobile/src/app/shop/stars.tsx` — rewrite grid to 20 cards
- `apps/mobile/src/app/shop/star/[slug].tsx` — NEW detail page with 4 rarity buttons
- OR bottom-sheet variant if we want to stay on the catalog page

**Estimated effort:** 2 hrs

---

## 6) Stars page — top buttons broken

**Pablo:** "the buttons at the top on that page are broken a little bit so if needed fix"

### Issue

Two ScrollView horizontal chip rows stacked (tier filter + rarity filter). Possibly:
- Chips wrap weirdly when active
- Overlap with header
- Touch targets too small

### Fix

- Combine into single filter row with section dividers
- Or move rarity filter to inside the per-player detail (per change #5 → rarity becomes irrelevant on the catalog page)
- Verify on real device after change #5 lands

**Estimated effort:** 30 min (rolls into #5)

---

## 7) Scan page — remove "fallback"

**Current:** Button labeled "Copy code (fallback)".

**Pablo:** Just "Copy code".

### Files

- `apps/mobile/src/app/(tabs)/swap.tsx` — find the text, drop the parenthetical

**Estimated effort:** 1 min

---

## 8) Pickup at store — show address + post-pay code

**Pablo's store address:**

```
Miguel Lerdo de Tejada 2081 — casa Anomalistyc
Col. Americana, Lafayette
44150 Guadalajara, Jal.
```

### Changes

- When zone = `pickup` in checkout, show an info card with the address + a "How to find us" line
- After successful payment, redirect to `/orden/:orderNumber` which displays a **pickup code** (6-digit number) the customer shows at the counter
- Generate code server-side, store on order

### Files

- `apps/mobile/src/app/checkout/index.tsx` — pickup address card
- `apps/mobile/src/lib/delivery.ts` — add `STORE_ADDRESS` constant
- `apps/api/src/routes/orders.ts` — generate `pickup_code` on order create when delivery=pickup
- `apps/mobile/src/app/orden/[orderNumber]/index.tsx` — display code prominently

**Estimated effort:** 2 hrs

---

## 9) Address form for local delivery — split fields + Google Maps autocomplete

**Current:** Single textarea for full address.

**Pablo wants:** Separate fields for street / number / colonia / neighborhood / zip / city, with Google Maps API autocomplete on street.

### Approach

- New address form component with these fields:
   - Street (Google Places autocomplete)
   - Exterior number
   - Interior number (optional)
   - Colonia
   - Municipio / Alcaldía
   - Zip code (CP)
   - City
   - References / cross-streets (textarea, optional)
- Google Places API key required (Pablo to provide — `EXPO_PUBLIC_GOOGLE_PLACES_KEY`)
- Persist full structured address on order

### Caveats

- Google Maps Places API costs money after free tier. ~ $0.017 per autocomplete request. At 1k orders/month → $17/mo. Negligible.
- Need to enable: Places API + Maps SDK in Google Cloud project.

### Files

- `apps/mobile/src/components/AddressForm.tsx` — NEW
- `apps/mobile/src/app/checkout/index.tsx` — swap textarea for AddressForm
- `apps/mobile/src/lib/google-places.ts` — NEW (fetch autocomplete suggestions)
- `apps/api/src/routes/orders.ts` — accept structured address
- DB: add columns to `orders` (street, ext_number, int_number, colonia, municipio, zip, city, references)

**Estimated effort:** 4 hrs + Pablo provides Google API key

---

## 10) Payment "ERROR when paying" — debug

**Pablo got error during checkout.** Need exact error message — can be:

- a) STUB URL (MP creds not picked up by Render) — front-end opens `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=STUB-...` which is invalid
- b) Webhook secret mismatch
- c) CORS / cookie issue
- d) Validation failure server-side

### Diagnostic steps

1. Verify Render picked up MP_ACCESS_TOKEN_PROD/TEST envs (curl preference endpoint, check `init_point` no longer starts with `STUB-`)
2. Render logs: look for `MP preference (stub)` log message → means stub still active
3. Render logs: look for `MP preference create failed` → real MP API rejection
4. Mobile logs: what error text does Pablo see exactly?

### Fix paths

- If stub still active → env var name typo. Match exactly: `MP_ACCESS_TOKEN_TEST` or `MP_ACCESS_TOKEN_PROD`
- If MP rejects → check `back_urls` (must be HTTPS, valid URLs), check `external_reference` (string), check item.unit_price (must be number)
- If amount mismatch → ensure subtotal in cents vs MXN, double-check welcome/referral credit math

**Estimated effort:** 1-2 hrs (depends on root cause)

---

## Total effort estimate

| Phase | Effort |
|-------|--------|
| 1. Profile tab | 2 hrs |
| 2. MP TEST env (you do) | 5 min |
| 3. Admin product image upload | 3 hrs |
| 4. Subtle 5% / complete-album CTAs | 2 hrs |
| 5. Stars collapse per-player | 2 hrs |
| 6. Stars top buttons (rolls into 5) | 0 |
| 7. "Copy code" rename | 1 min |
| 8. Pickup address + code | 2 hrs |
| 9. Address form + Google Maps | 4 hrs |
| 10. Payment error debug | 1-2 hrs |
| **Total** | **~17 hrs** |

## Suggested order

Quick wins first → user can keep testing:

1. **#7 Copy code rename** (1 min)
2. **#2 MP TEST env vars** (you paste into Render)
3. **#10 Payment debug** (depends on Pablo's exact error — get the message first)
4. **#1 Profile tab** (visible win)
5. **#5 + #6 Stars collapse + fix top buttons** (visible win)
6. **#7 Pickup address card**
7. **#4 Subtle CTAs scattered**
8. **#9 Address form + Google Maps** (needs API key from Pablo)
9. **#3 Admin product image upload** (less urgent — Pablo can wait)

## Open questions for Pablo before executing

1. **Profile tab** — Profile + Referral combined, or two tabs?
2. **Pickup code** — 4-digit or 6-digit? Sent via email too, or app-only?
3. **Google Maps API** — does Pablo already have a Google Cloud account? Otherwise I set up + send him the bill / he reimburses ($0-20/mo first months).
4. **Payment error** — screenshot or exact text of the error he saw?
5. **Existing products in DB** — should image upload replace the file system entirely, or be optional (file system fallback)?
6. **CTAs scattered** — wants me to also add to admin onboarding emails? Or app-only?

---

## What I do not change in this round (per Pablo's "subtle" rule)

- No popups
- No interstitials
- No forced banners blocking content
- Max 1 CTA per screen
- All CTAs dismissable

---

Reply with **Go** or which items to skip/reorder, then I execute.
