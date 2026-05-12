# Mobile App — Polish & Feature Plan

Source of truth for everything still missing on `apps/mobile` (Expo
React Native). Updated as work lands. Reference design comes from
[Pabloddc16/Mundial2026](https://github.com/Pabloddc16/Mundial2026)
(vanilla Vite app, 1627 CSS lines, 4766 main.js lines, 17 screens).

---

## Status legend

- ✅ done
- 🟡 in progress / partial
- ⬜ not started
- 🟢 blocked-clear (waiting on something external)

---

## Phase 0 — Foundation (✅ done)

- ✅ Expo SDK 55, React 19, RN 0.83 on Node 20 (nvm)
- ✅ EAS project linked (`732ed138-…`), preview profile builds APK
- ✅ EAS Update channels wired (development / preview / production)
- ✅ Dev client APK profile in eas.json
- ✅ `expo-updates`, `expo-dev-client`, `expo-camera`, `expo-secure-store`,
  `expo-local-authentication`, `expo-notifications` installed
- ✅ Production API URL baked into preview build
  (`EXPO_PUBLIC_API_URL=https://zona-mundial.onrender.com`)
- ✅ Design tokens ported → `src/lib/theme.ts` (COLORS, SPACING, RADIUS,
  FONT, SHADOW)
- ✅ Album tab restyled with new tokens
- ✅ Translated to English: tabs nav, album, store, cart, swap (partial)
- ✅ API single-source-of-truth: products GET aggregates from movements
  stock view, dashboard inventory value uses movements view

---

## Phase 1 — Auth (⬜ next)

Unblocks checkout, order tracking, album backend sync, trade matching.
**Pick this first.**

### 1.1 Backend
- ✅ `POST /api/auth/register` — public customer signup
- ⬜ Verify customer role accepted by `POST /api/orders` (already
  in code, test end-to-end)
- ⬜ `GET /api/auth/me` returns customer profile correctly

### 1.2 Mobile API client + storage
- ⬜ `src/lib/auth-storage.ts` — wrapper over expo-secure-store for AT/RT
- ⬜ `src/lib/api.ts` — refactor with Bearer header, refresh token cycle,
  401 retry. Mirror pattern from `apps/admin/src/lib/api.ts`:
  - JWT expiry pre-check before each request
  - cross-tab/cross-app safe RT rotation handling
  - never wipe tokens on network errors
- ⬜ Zustand `auth-store.ts` — current user, hydrated from SecureStore

### 1.3 Screens (use new theme tokens)
- ⬜ `src/app/(auth)/_layout.tsx` — stack
- ⬜ `src/app/(auth)/login.tsx` — email + password, "create account" link
- ⬜ `src/app/(auth)/register.tsx` — email + password + username
- ⬜ `src/app/(auth)/forgot-password.tsx` — request reset

### 1.4 Root layout gating
- ⬜ `src/app/_layout.tsx` — redirect to /(auth)/login if no token,
  else load app
- ⬜ Profile tab / settings: show username, logout button

### 1.5 Checkout + order tracking
- ⬜ Checkout sends Bearer token, succeeds for `customer` role
- ⬜ Order screen reads `/api/orders/:orderNumber` with auth

---

## Phase 2 — QR (⬜)

Headline feature. Reference compresses payload via lz-string then encodes
as QR. We can copy that algorithm directly from
`apps/customer-web/src/swap-qr.js`.

### 2.1 Deps
- ⬜ `pnpm add react-native-qrcode-svg react-native-svg lz-string @types/lz-string`
- expo-camera already installed; SDK 55's `CameraView` has built-in
  barcode scanning, no extra dep needed

### 2.2 Code
- ⬜ Port `swap-qr.js` (encodeOffer / encodeReceipt / decodePayload) to
  `src/lib/swap-qr.ts` (TypeScript, no DOM deps)
- ⬜ Update `(tabs)/swap.tsx`:
  - Generate tab: render `<QRCode value={encoded} />` next to chip list
  - Scan tab: replace TextInput paste with `<CameraView
    barcodeScannerSettings={{ barCodeTypes: ['qr'] }}
    onBarcodeScanned={(r) => decodePayload(r.data)} />`
  - Show match results (theyHave/iHave) in card grid
- ⬜ Camera permission request UI (expo-camera `useCameraPermissions`)

### 2.3 Backend (real-time match, optional v2)
- ⬜ Decide: keep peer-to-peer QR (no backend) OR add backend match.
  Reference uses Supabase realtime `swaps` table — could mirror.
  Defer until QR P2P shipped + working.

---

## Phase 3 — Visual polish (⬜)

Apply theme tokens + reference layout patterns to remaining screens.

- ⬜ `(tabs)/tienda.tsx` — store grid, category pills, large-radius cards
- ⬜ `(tabs)/carrito.tsx` — cart rows, summary card, INK CTA button
- ⬜ `(tabs)/stats.tsx` — SVG progress chart (port `statsChartSVG` from
  reference main.js), badge cards
- ⬜ `(tabs)/swap.tsx` — full restyle once QR lands
- ⬜ `album/[groupId]/index.tsx` — sticker grid 4-col, owned/needed state
  with reference's circle markers
- ⬜ `producto/[id]/index.tsx` — product detail, sticky add-to-cart CTA
- ⬜ `checkout/index.tsx` — form layout, address autocomplete
- ⬜ `orden/[orderNumber]/index.tsx` — status timeline, item list
- ⬜ `_layout.tsx` — top bar component (reference has consistent
  `topBar()` with title + optional back + optional settings icon)

---

## Phase 4 — Album backend sync (⬜)

Currently each phone has its own copy. Needed for: multi-device, trade
matching, social features.

### 4.1 DB
- ⬜ New table `album_stickers`:
  - user_id (FK auth.users)
  - group_id text
  - sticker_n int
  - owned int
  - needed int
  - updated_at
  - PK (user_id, group_id, sticker_n)

### 4.2 API
- ⬜ `GET /api/album` → entire current user's album state as
  `Record<groupId, Record<n, {owned, needed}>>`
- ⬜ `PUT /api/album/sticker` body `{ group_id, n, owned, needed }`
  upserts a single row

### 4.3 Mobile
- ⬜ Refactor `useAlbumStore`: keep optimistic local state, mirror every
  mutation to API. AsyncStorage stays as offline cache.
- ⬜ On login: fetch server state, merge with local
- ⬜ Offline queue: if API call fails, retry on reconnect

---

## Phase 5 — Trade matching backend (⬜)

Beyond peer QR: find any other user with matching extras/needed globally.

### 5.1 DB
- ⬜ `trades` table for offer/accept lifecycle (later)

### 5.2 API
- ⬜ `GET /api/trades/matches` → other users whose extras overlap with
  my needed AND whose needed overlaps with my extras. Returns top N
  by mutual-overlap count.

### 5.3 Mobile
- ⬜ Trade tab refactor: matches list view, contact button (in-app msg or
  WhatsApp deep link)

---

## Phase 6 — Quality of life (⬜)

- ⬜ Translation cleanup:
  - `src/lib/data.ts` — category labels, tier names
  - `orden/[orderNumber]/index.tsx`
  - swap.tsx remaining strings
- ⬜ Stats SVG chart
- ⬜ Top bar component
- ⬜ Settings screen (notifications toggle, account info, logout)
- ⬜ App icon + splash (currently stripped because asset files missing)
- ⬜ Push notifications (expo-notifications already installed) — for
  trade match alerts
- ⬜ Biometric unlock (expo-local-authentication already installed,
  toggle in settings)
- ⬜ Sentry crash reporting wired

---

## Phase 7 — Distribution (⬜)

### Android (Play Store)
- ⬜ Fill app icon + adaptive icon (drop files in `src/assets/`,
  re-add to app.json)
- ⬜ `eas build --profile production --platform android` → AAB
- ⬜ Pay $25 one-time Google Play Developer fee
- ⬜ Create app on Play Console, fill listing, upload screenshots
- ⬜ `eas submit --platform android` → Internal Testing
- ⬜ Promote: Internal → Closed → Open → Production

### iOS (App Store)
- 🟢 Buy Apple Developer Program ($99/yr) — user said they have/can buy
- ⬜ Get Apple Team ID + ASC App ID, fill in `eas.json`
  (placeholders `FILL_IN_…`)
- ⬜ `eas build --profile production --platform ios` → IPA
- ⬜ Create app on App Store Connect, fill listing
- ⬜ `eas submit --platform ios` → TestFlight
- ⬜ Add colleague's Apple ID as tester
- ⬜ Submit for App Store review

---

## Dev workflow reminders

- **JS-only changes after first APK install**: `eas update --branch preview`
  → phone picks up on next launch.
- **Native changes** (new packages, plugin config): `eas build --profile
  preview --platform android` → install new APK.
- **Live dev with hot reload**: install development APK once → `pnpm dev`
  in `apps/mobile` → paste tunnel URL in dev client.
- **Node version**: always `source /usr/share/nvm/init-nvm.sh && nvm use 20`
  before running expo / eas commands.

---

## Open questions / decisions pending

- 🟢 Apple Dev account: user said "we have or can buy easily" — defer
  until iOS build needed.
- ⬜ Customer guest checkout vs always-authed: plan assumes always-authed
  (per user "we want users to have accounts").
- ⬜ Push notif strategy: trade matches only, or also order status updates?
- ⬜ Backend trade matching algorithm scope: any-user-globally vs
  same-city only (privacy / spam tradeoff).
