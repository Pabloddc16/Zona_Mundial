# Pablo's Feedback — What We Have, What's Missing, What Needs Building

Audit of `PABLO_CONTENT/` (May 20, 2026) — files Pablo dropped, what they unlock, and the remaining gaps.

---

## 1) What Pablo provided

### A. Mercado Pago credentials — TWO sets (need clarification)

**Set 1** (from `notes.md`):
```
Public key:    APP_USR-8da7a967-40ce-4b8a-8f2f-e4cd2c19f1ca
Access token:  APP_USR-8916044066265172-052000-3815ba3a703636985d3b94a3c8119cf8-3372300942
Webhook code:  0d7aba4595715d0829e7986f05f8af9e3ae0616495c479c8df6b103c8ae48f4e
```

**Set 2** (from `WhatsApp Image 2026-05-20 at 06.32.37.jpeg`):
```
Public key:     APP_USR-be0ae120-6434-4c17-ac56-a4a20f72763f
Access token:   APP_USR-8297526384109437-052000-3818e5a733c16918d3c189cb636a79ab-253877808
Client ID:      8297526384109437
Client Secret:  0vKLAZaQJbvGODcwavsargMbTwv6qag2
```

⚠ **Ambiguity:** both sets are `APP_USR-...` prefix (production format). Either:
- Pablo created two separate apps (one for test, one for prod), OR
- One pair is wrong and needs to be regenerated

**ASK PABLO** which set is TEST vs PROD, or whether one should be discarded.

**ACTION:** wire these into `apps/api/.env.local` and Render env once labeled. Webhook secret goes into `MP_WEBHOOK_SECRET`.

### B. Reply-to-Branko answers (Q1–Q6 locked)

From `reply-to-branko.md`:

| Question | Final answer |
|----------|-------------|
| Q1 Welcome credit | **$100 MXN** off first order ✅ |
| Q2 Referral rewards | Inviter **5% of invitee's first purchase**, paid on actual purchase (not signup). Invitee **$100 MXN** off when first order ≥ **$1,000 MXN**. |
| Q3 Legend names | Pablo has the 20 names — **sending in a separate message** ⏳ |
| Q4 Coca-Cola | Partnership signed. Real count + brand kit + redemption channel **coming separately** ⏳ |
| Q5 Cash on pickup | **NO** — card only everywhere via Mercado Pago. Kill cash option entirely. |
| Q6 Master checklist | Ship with placeholder labels — patch real names later via admin |

### C. Store product order (from `notes.md`)

Exactly 7 products in this order:
1. Soft album (Album pasta blanda)
2. Single sticker pack (sobre)
3. Album pasta dura
4. Caja
5. Set Completo
6. Sobre cerrado de Coca-Cola
7. Set completo de Coca-Cola

### D. Real product images (7 WhatsApp images, May 20)

| Image | Product |
|-------|---------|
| `07.03.20.jpeg` | Soft album cover (green Mexican-style) |
| `07.03.20 (1).jpeg` | Sealed pack ("sobre") |
| `07.03.20 (2).jpeg` | Hard cover album |
| `07.03.20 (3).jpeg` | Caja (box of packs) |
| `07.03.21.jpeg` | Album with stickers spilling out (set completo visual) |
| `07.03.21 (1).jpeg` | Coca-Cola pack (red) |
| `07.03.21 (2).jpeg` | Coca-Cola complete set with player cards (Lautaro Martinez, Valverde, Santi Giménez, Magalhães, Lerma) |

### E. Big design spec — `ajustes-app-album-mundial26.pdf` (12 pages)

Pablo wrote a detailed 7-point change list **for App 1 only** (user-side, not admin/driver). Total estimated effort: **~10-11 hours**.

#### Change 1 — Sticker tap behavior (CRITICAL)

**Now:** tap = +1, long press = open edit modal.
**Pablo wants:**

| Action | Result |
|--------|--------|
| 1 tap | 0 → 1 (mark completed) |
| 2 taps | 1 → 2 (add 1 repetida) |
| 3 taps | 2 → 3 (another repetida) |
| N taps | keeps adding |
| Long press (~500ms) | subtract 1 (minimum 0) |

**Tech:**
- Remove `onLongPress` opening `StickerEditModal`
- Long press calls `setCount(id, Math.max(0, current - 1))`
- Delete `StickerEditModal` component
- Haptics: light on tap, medium on successful long press, heavy if long press at 0
- Visual states stay: count=0 grey opaque, count=1 white + green check, count≥2 white + gold "+N" badge top-right (N = count - 1)

#### Change 2 — "Compartir repetidas" share button

- Header of Álbum tab, right side, Lucide `Share2` icon
- Coexists with Settings icon (point 3) — Settings on the far right, Share to its left
- Generates this exact text format:
   ```
   Mi Álbum Mundial 26 — Lista
   USA · Méx · Can 26

   Repetidas
   FWC 🏆: 1
   FWC 🌎: 7
   FWC 📜: 12, 18
   MEX 🇲🇽: 4, 11, 13, 15, 16, 17
   RSA 🇿🇦: 1, 6, 7, 10, 11, 17, 19
   KOR 🇰🇷: 2, 3, 7, 8, 10, 13, 15, 17, 19
   CAN 🇨🇦: 4, 12, 15, 18
   ...

   Descarga la app
   https://[PENDING — confirm domain]/descargar
   ```
- Rules:
   - Only sections with repetidas (count ≥ 2)
   - One section per line, format `CÓDIGO BANDERA: N1, N2, N3...`
   - Just the sticker number, NO country prefix (e.g. `4, 11, 13` not `MEX04, MEX11, MEX13`)
   - Comma + space separator
   - Blank line between "Repetidas" block and "Descarga la app"
- Behavior: try `navigator.share` (native sheet), fallback = copy to clipboard + toast "Lista copiada"
- New helper: `src/lib/share.ts` exporting `generateRepetidasShareText()`

#### Change 3 — Settings gear icon in header

- Shows on Home, Álbum, Stats, QR
- **DOES NOT** show on Tienda
- Lucide `Settings` icon, 20×20, color `#0B1F15`, opacity 0.6
- Circular button 40×40, no background
- Tap → scale animation → opens `/settings`

`/settings` is a **page** (not a tab), with:
- Edit name / nacionalidad
- Notifications toggle
- Language preferences (placeholder)
- "About the app" (version, credits)
- "Cerrar sesión" (placeholder — no auth yet)

#### Change 4 — "Refiere y gana" replaces the old Settings tab

Renamed from "referral profile" to **"Refiere y gana"** (more inviting). Card lives on Home, below "Te faltan X stickers" CTA, above "Acciones rápidas".

**Card design:**
- Background: gradient green → gold (`#006341 → #FFD100`)
- Icon: 🎁 or Lucide `Gift`
- Title: `Invita a un amigo, ganas $50`
- Subtitle: `Por cada amigo que complete su primera compra, ganas $50 de crédito.`
- Button: `Mi código` → navigates to `/referral`

⚠ Copy says **$50** but reply-to-branko says 5% of invitee purchase. Mismatch. **ASK PABLO** which is final.

**`/referral` page:**
- Back arrow + "Refiere y gana"
- Big QR encoding `https://[domain]/?ref=PABLO-A7K`
- "Tu código: PABLO-A7K"
- Copy link + Share WA buttons
- Stats block: amigos invitados, créditos ganados, créditos disponibles

#### Change 5 — Official album section list

Album is renamed **"USA · Méx · Can 26"**.

**FWC sections (3):**
| ID | Emoji | Name |
|----|-------|------|
| `FWC-T` | 🏆 | FWC Trofeo |
| `FWC-W` | 🌎 | FWC Mundo |
| `FWC-H` | 📜 | FWC Historia |

**42 country sections** (3-letter codes + flags):
```
MEX 🇲🇽   RSA 🇿🇦   KOR 🇰🇷   CAN 🇨🇦   QAT 🇶🇦
SUI 🇨🇭   BRA 🇧🇷   MAR 🇲🇦   HAI 🇭🇹   SCO 🏴
USA 🇺🇸   PAR 🇵🇾   AUS 🇦🇺   GER 🇩🇪   CUW 🇨🇼
CIV 🇨🇮   ECU 🇪🇨   NED 🇳🇱   JPN 🇯🇵   TUN 🇹🇳
BEL 🇧🇪   EGY 🇪🇬   IRN 🇮🇷   NZL 🇳🇿   ESP 🇪🇸
CPV 🇨🇻   KSA 🇸🇦   URU 🇺🇾   FRA 🇫🇷   SEN 🇸🇳
NOR 🇳🇴   ARG 🇦🇷   ALG 🇩🇿   AUT 🇦🇹   JOR 🇯🇴
POR 🇵🇹   UZB 🇺🇿   COL 🇨🇴   ENG 🏴   CRO 🇭🇷
GHA 🇬🇭   PAN 🇵🇦
```

⚠ **Mundial 26 has 48 qualifiers — 6 still pending.** Pablo will confirm the last 6 once playoffs finish.

**Stickers per section:** default **20** (numbered 1-20). Some may be 18-22 — confirm when Pablo has the physical album.

#### Change 6 — Tienda tab complete redesign (4 hero cards)

Drop the existing 4 subtabs (Completar álbum / My Panini / Catálogo / Packs). Replace with **4 card-sized hero sections**, scrolled vertically.

**Header:**
- "Tienda" (small top) + "Mundial 26 Shop" (large display)
- Cart icon top-right with count badge
- **NO Settings icon** here

**Section 1 — 📸 Mi Panini (HERO)**
- Full-width card, first thing user sees
- Visual: animation/illustration of selfie → arrow → sticker with Panini frame
- Background: green/gold gradient with subtle "26" motif
- Title: `Crea tu sticker personalizada`
- Subtitle: `Tu cara en una carta estilo Panini oficial. $200.`
- Button: `Crear mi Panini` (rounded-full, cream on green)
- Action: opens `/shop/my-panini` — camera/gallery → editor (crop, background) → preview with frame → add to cart

**Section 2 — ⭐ Extra Stickers**
- Full-width card
- Visual: mosaic/collage of 4-6 special stickers (legendaries, gold, limited)
- Background: red → gold gradient
- Title: `Obtén tus stickers favoritas`
- Subtitle: `Legendarias, doradas y ediciones limitadas.`
- Button: `Explorar extras`
- Action: `/shop/extras` — filtered catalog view, rarity in `("hard", "legend")`
- Sub-filters: Legendarias · Doradas · Jugadores top · Edición limitada

**Section 3 — 📖 Llena tu álbum (DYNAMIC)**
- Card reacts to user's album state
- Background: green with gold circular motif
- Big headline: `Te faltan {N} stickers`
- Progress bar: `[███████░░░] 73%`
- Total cost to complete: `$X pesos`
- CTA: `Completar álbum`
- Action: `/shop/album` with 4 internal tabs:
   1. **Faltantes** — list of missing stickers, sorted by rarity
   2. **Recomendadas** — sections that are almost complete (smart suggestion)
   3. **Comprar intercambio** — stickers that appear frequently in swaps
   4. **Packs sugeridos** — packs that economically fill the gap
- Empty state: if album 100% complete → "¡Álbum completo! 🏆" + secondary CTA "Reservar para 2030"

**Section 4 — 🏆 Productos del Mundial**
- Two parts:

   **4a — Horizontal category carousel**
   ```
   ◀ [Playeras] [Balones] [Gorras] [Álbumes] [Pines] [Coleccionables] ▶
   ```
   Each card: large image (1:1 or 4:5), category name, count `12 productos`. Tap → filtered view.

   **4b — Product grid (under carousel)**
   - 2 columns, vertical scroll, all products unfiltered
   - Each card: 1:1 image, name, price, quick `+` button (adds to cart direct), full tap → `/shop/product/:id`
   - Optional badges top-left: 🆕 Nuevo · 🔥 Limitado · ⚠ Agotándose (red, if stock < 10) · ✓ Oficial FIFA

**What gets REMOVED from Tienda:**
- ❌ Existing 4 subtabs
- ❌ Pickup/Express/Nacional selector
- ❌ Address form
- ❌ Payment method selector

All delivery + payment **lives only in `/checkout`** now. Tienda = discover + add to cart, nothing else.

#### Change 7 — Move delivery/pickup from Tienda → Checkout

Already partially done in our recent checkout rewrite. Verify nothing leaks back into Tienda after the redesign.

#### Files Pablo lists as affected

| File | Change |
|------|--------|
| `src/components/album/StickerCell.jsx` | Remove modal, add decrement on long press |
| `src/components/album/StickerEditModal.jsx` | **Delete** (no longer used) |
| `src/data/stickers.js` | Replace TEAMS + SPECIAL_SECTIONS with official list |
| `src/pages/AlbumPage.jsx` | Add Share + Settings to header |
| `src/pages/HomePage.jsx` | Add "Refiere y gana" card + Settings header |
| `src/pages/StatsPage.jsx` | Add Settings header |
| `src/pages/QrPage.jsx` | Add Settings header |
| `src/pages/ShopPage.jsx` | **Full rewrite** — 4 hero cards |
| `src/pages/shop/MyPaniniPage.jsx` | **NEW** — photo capture + editor flow |
| `src/pages/shop/ExtrasPage.jsx` | **NEW** — rarity-filtered catalog |
| `src/pages/shop/AlbumFillPage.jsx` | **NEW** — 4 internal tabs |
| `src/pages/shop/ProductsPage.jsx` | **NEW** — carousel + grid |
| `src/pages/shop/ProductDetailPage.jsx` | **NEW** |
| `src/pages/SettingsPage.jsx` | **NEW** placeholder |
| `src/pages/ReferralPage.jsx` | **NEW** (we have a partial one) |
| `src/lib/share.js` | **NEW** — `generateRepetidasShareText()` |
| `src/components/shop/ShopHeroCard.jsx` | **NEW** — reusable hero for 3 of the 4 sections |
| `src/components/shop/ProductCard.jsx` | **NEW** — card with badges |
| `src/components/shop/CategoryCarousel.jsx` | **NEW** |
| `src/App.jsx` | Add routes |

⚠ Note: Pablo's file paths use `.jsx` but our app is React Native (`.tsx`). Map his structure to our routing (`apps/mobile/src/app/...`).

---

## 2) What we have in the codebase that needs changing

### A. Tap behavior (BREAKING vs Pablo's spec)

Our current `apps/mobile/src/app/(tabs)/index.tsx`:
- Tap = toggle owned (0↔1)
- Long press = add duplicate

Pablo wants:
- Tap = +1 (cycle up unlimited)
- Long press = -1 (cycle down, floor 0)

→ **Refactor `handleSticker` + `handleAddDup`** to match.

### B. Album data structure

Our `apps/mobile/src/lib/data.ts`:
- 48 generic teams (Mexico, USA, Canada, Argentina, etc.)
- 4 FWC special sections (FWC Mascots, Balls, Stadiums, Legends 80)
- 24 Coca-Cola promo

Pablo's official structure:
- **42 specific countries** (different code set — CIV, CPV, CUW, JOR, UZB etc. — some we don't have)
- **3 FWC sections**: FWC Trofeo (T), FWC Mundo (W), FWC Historia (H)
- 20 stickers per section default
- Coca-Cola count: TBD

→ **Replace TEAMS array** with Pablo's 42 codes. Drop the 4 generic FWC, add the 3 official.
→ Wait for Pablo's 6 missing codes + Coca-Cola final count + Legends 20 names.

### C. Tienda tab

Our `apps/mobile/src/app/(tabs)/tienda.tsx`:
- Cart icon + Cards quick-filter + 3-mode buttons (Delivery/Pickup/Gift)
- Pill filter row
- 2-column product grid

Pablo wants: 4 hero cards (Mi Panini / Extras / Llena tu álbum / Productos with carousel + grid).

→ **Full rewrite** of `tienda.tsx`. Move delivery/pickup logic out (already in checkout). Create new sub-pages.

### D. Settings

We don't have a dedicated `/settings` page — Settings is currently a tab.

→ **Move Settings to a non-tab page** at `/settings`. Tab gets replaced with what Pablo calls home (or removed entirely if Refiere y gana absorbs the slot).

### E. Cash payment

Our `apps/mobile/src/lib/delivery.ts`:
```ts
export function canPayCash(zone: DeliveryZone): boolean {
  return zone === 'pickup'
}
```

Pablo: **kill cash entirely**, card-only via Mercado Pago.

→ **Remove cash option** from `delivery.ts` and `checkout/index.tsx`.

### F. Referral mechanics

Our `apps/mobile/src/lib/delivery.ts` defaults:
```ts
WELCOME_CREDIT_MXN = 100              // ✅ matches Pablo
REFERRAL_REWARD_INVITER = 100         // ❌ wrong, should be 5%
REFERRAL_REWARD_INVITEE = 50          // ❌ wrong, should be $100 IF order ≥ $1000
```

→ Refactor referral helpers to support percentage-of-purchase + minimum-threshold rules.

### G. Mercado Pago wiring

Our `apps/api/src/routes/payments.ts`:
- Reads `MP_ACCESS_TOKEN_PROD` env var (falls back to stub)
- Webhook expects `MP_WEBHOOK_SECRET`

→ Paste Pablo's keys into `apps/api/.env.local` AND Render production env.
→ Disambiguate which set is TEST (sandbox) vs PROD (live).

---

## 3) What's still missing from Pablo

### Critical (blocks launch)

| Item | Why blocks | Estimated wait |
|------|-----------|----------------|
| **MP TEST vs PROD label clarification** | We have keys but don't know which is which | 1 message |
| **EAS Production plan paid** | Can't build AAB/IPA without it | 1 day (Pablo logs in + pays) |
| **Google Play service account JSON** | Can't auto-submit Android | 10 min |
| **6 missing country codes** | Album incomplete without 48 | Wait for playoffs (March 2026 — past). Pablo says he'll confirm. |

### High priority (polish before launch)

| Item | Why needed |
|------|-----------|
| **20 Legend player names** | Currently `LEG01–LEG20` placeholders |
| **Coca-Cola exact sticker count** | Currently 24 placeholder |
| **Coca-Cola brand kit + colors** | For partnership compliance |
| **Coca-Cola redemption channel** | How users get them (packs vs OXXO) |
| **Final domain decision** | Affects share text + referral link |
| **Refiere y gana mechanics mismatch** | PDF says $50, reply says 5% — pick one |

### Lower priority (can ship without)

| Item |
|------|
| Real player photos per sticker (currently generic icons) |
| Master CSV checklist of all 994 stickers |
| Stadium photos for FWC Mundo section |
| Apple TestFlight #7 status confirmation |
| Final Settings page content list |
| Auth method preference (email vs Google vs phone) |

---

## 4) New images — usage plan

### Mapping to landing page (public website)

| Image | Use case |
|-------|----------|
| `WhatsApp...07.03.20.jpeg` (soft album) | Replace `feature-album.webp` or use as new "products" hero on landing |
| `07.03.20 (1).jpeg` (pack) | Product showcase in landing hero or store category card |
| `07.03.20 (2).jpeg` (hard album) | Product detail screenshot |
| `07.03.20 (3).jpeg` (box) | "Best value" product feature |
| `07.03.21.jpeg` (album + stickers spilling) | **Hero replacement** — much better than current `hero-phone.webp` |
| `07.03.21 (1).jpeg` (Coca-Cola pack) | Coca-Cola promo section visual |
| `07.03.21 (2).jpeg` (Coca-Cola complete set) | Coca-Cola promo section visual (alternate) |

### Mapping to mobile app store screens

These ARE the real Panini products Pablo will sell. Wire each image into the product catalog:

```ts
// apps/mobile/src/lib/data.ts → PRODUCTS array
{
  id: 'ALBUM-SOFT',
  name: 'Álbum pasta blanda',
  image: '/images/products/album-soft.webp',
  position: 1,                                  // per Pablo's order
},
{
  id: 'SOBRE-1',
  name: 'Sobre (1 paquete)',
  image: '/images/products/sobre.webp',
  position: 2,
},
// etc. matching Pablo's order
```

Workflow:
1. Convert all 7 WhatsApp JPEGs to `.webp` (smaller)
2. Move into `apps/admin/public/images/products/` (for the landing) **and** `apps/mobile/assets/products/` (for the app store screen)
3. Reference by path in `data.ts`

---

## 5) Implementation roadmap

Ordered by priority + dependency. Most can run before Pablo's remaining info arrives.

### Phase A — No blockers (do this week)

| # | Task | Effort |
|---|------|--------|
| A1 | Wire the 7 product images into `data.ts` PRODUCTS array, convert to WebP | 1 hr |
| A2 | Change sticker tap behavior (1 tap = +1 unlimited, long press = -1) | 30 min |
| A3 | Delete `StickerEditModal` references | 15 min |
| A4 | Add Share button in Album header + `generateRepetidasShareText()` | 1 hr |
| A5 | Move Settings to header gear icon (Home/Album/Stats/QR — NOT Tienda) | 1 hr |
| A6 | Create `/settings` placeholder page | 30 min |
| A7 | Replace TEAMS array with Pablo's 42 countries + 3 FWC sections | 1 hr |
| A8 | Kill cash payment option in `delivery.ts` + `checkout` | 15 min |
| A9 | Update referral rules: 5% inviter + $100 invitee (if order ≥ $1000) | 1 hr |
| A10 | Build "Refiere y gana" card on Home + dedicated `/referral` page (already partial) | 2 hrs |

**Subtotal: ~9 hrs.** Doable in a day. No external dependencies.

### Phase B — Tienda redesign (large)

| # | Task | Effort |
|---|------|--------|
| B1 | Full rewrite `tienda.tsx` with 4 hero cards | 2 hrs |
| B2 | New page `/shop/my-panini` (camera + editor) | 3 hrs (complex — image manipulation) |
| B3 | New page `/shop/extras` (rarity-filtered catalog) | 1 hr |
| B4 | New page `/shop/album` (4 internal tabs) | 2 hrs |
| B5 | New page `/shop/products` (carousel + grid) | 1.5 hrs |
| B6 | New page `/shop/product/:id` (detail) | 1 hr |
| B7 | New `ShopHeroCard`, `ProductCard`, `CategoryCarousel` components | 1.5 hrs |

**Subtotal: ~12 hrs.** Could split into 2 days.

### Phase C — Backend / payments

| # | Task | Effort |
|---|------|--------|
| C1 | Wire Pablo's MP credentials into Render env vars | 15 min (after Pablo labels them) |
| C2 | Test MP sandbox flow end-to-end with TEST keys | 1 hr |
| C3 | Update webhook secret env var | 5 min |
| C4 | Test PROD flow with small real charge | 30 min |
| C5 | Backend referral table + apply rules server-side | 2 hrs |
| C6 | Build production AAB + IPA via EAS | 1 hr active + ~50 min queue |

**Subtotal: ~5 hrs.** Blocked on Pablo: EAS payment + MP key labels.

### Phase D — Store submission

| # | Task | Effort |
|---|------|--------|
| D1 | Upload AAB to Play Console Internal Testing | 30 min |
| D2 | Submit IPA to TestFlight | 30 min |
| D3 | Add internal testers (both stores) | 15 min |
| D4 | Submit for Apple Review | 15 min |
| D5 | Promote Android to Production (after testing) | 15 min |

**Subtotal: ~2 hrs active + 1-2 days waiting on Apple Review.**

---

## 6) Decisions I need from Pablo before starting

These are quick yes/no answers — get them in one Signal message:

1. **Which MP set is TEST and which is PROD?** Or are both PROD and we still need a TEST pair?
2. **Refiere y gana — $50 flat (PDF) or 5%/$100 conditional (reply)?** Pick one.
3. **Final download domain** — `https://cromos26.com/descargar` or stay on `zona-mundial.vercel.app/descargar`?
4. **Coca-Cola sticker count** — number for now if exact count not ready?
5. **Auth method** — email + password (current) or want Google/phone/anonymous?
6. **Settings page contents** — keep my list (edit profile, notifications, language, about, logout) or different?
7. **Mi Panini ($200) photo-sticker flow** — green-light to build? Big feature, ~3 hrs.

---

## 7) Quick reference — Files I'll touch this week

```
apps/mobile/src/lib/data.ts                 ← Phase A1, A7
apps/mobile/src/lib/delivery.ts             ← Phase A8, A9
apps/mobile/src/lib/share.ts                ← Phase A4 (NEW)
apps/mobile/src/app/(tabs)/index.tsx        ← Phase A2, A3, A4, A5
apps/mobile/src/app/(tabs)/tienda.tsx       ← Phase B1
apps/mobile/src/app/(tabs)/_layout.tsx      ← Phase A5 (drop Settings tab)
apps/mobile/src/app/settings.tsx            ← Phase A6 (NEW)
apps/mobile/src/app/referral.tsx            ← Phase A10 (refine existing)
apps/mobile/src/app/shop/my-panini.tsx      ← Phase B2 (NEW)
apps/mobile/src/app/shop/extras.tsx         ← Phase B3 (NEW)
apps/mobile/src/app/shop/album-fill.tsx     ← Phase B4 (NEW)
apps/mobile/src/app/shop/products.tsx       ← Phase B5 (NEW)
apps/mobile/src/app/shop/product/[id].tsx   ← Phase B6 (NEW)
apps/mobile/src/components/shop/*           ← Phase B7 (NEW)
apps/mobile/assets/products/*.webp          ← Phase A1 (NEW images)

apps/api/.env.local                         ← Phase C1
apps/api/src/routes/payments.ts             ← Phase C2-4 (test, refine)
apps/api/src/routes/referrals.ts            ← Phase C5 (NEW)
```

---

## 8) TL;DR — What I do next without waiting on Pablo

1. Wire 7 product images into the store (Phase A1) — **today**
2. Refactor tap behavior + add Share button (Phase A2–A4) — **today**
3. Settings header icon + placeholder page (Phase A5–A6) — **tomorrow**
4. Update album data: 42 countries + 3 FWC + drop generic teams (Phase A7) — **tomorrow**
5. Update payment rules: no cash + new referral math (Phase A8–A9) — **tomorrow**
6. Refine Refiere y gana card + page (Phase A10) — **tomorrow**
7. Wait for Pablo on MP labels, EAS upgrade, missing 6 countries, Legends names

After that, Phase B (Tienda redesign — 12 hrs) is the next big chunk.
