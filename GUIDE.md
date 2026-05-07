# Pablo App — Developer Guide

Complete reference for running, testing, and deploying the rewritten monorepo.

---

## What Was Built

The original two projects (a 3,476-line `server.js` monolith + 4,229-line vanilla-JS SPA) were replaced with a modern monorepo:

```
pablo_app/
├── apps/
│   ├── api/        Fastify + TypeScript REST API            → port 4000
│   ├── admin/      Next.js 14 admin dashboard               → port 3001
│   ├── web/        Next.js 14 consumer web (PWA)            → port 3002
│   └── mobile/     Expo SDK 52 iOS + Android app
└── packages/
    ├── db/         Supabase client + schema SQL
    ├── types/      Shared TypeScript interfaces
    ├── ui/         Shared component stubs
    └── validators/ Shared Zod schemas
```

**Stack:** pnpm workspaces · Turborepo · TypeScript strict · Supabase (Postgres + Auth) · Fastify · Next.js 14 App Router · Expo Router 4 · Zustand · TanStack Query · Tailwind · Playwright E2E

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | `nvm install 20` |
| pnpm | 9.x | `npm i -g pnpm@9` |
| Expo CLI + EAS | latest | `npm i -g expo-cli eas-cli` |
| Android Studio | latest | For Android emulator (optional) |
| Xcode | ≥ 15 | Mac only — for iOS simulator (optional) |

---

## API Keys You Need

### Required — app won't start without these

**Supabase** — free tier works fine.

1. Go to [supabase.com](https://supabase.com) → New project
2. **Settings → API** → copy `Project URL` and the `service_role` secret key
3. **Settings → API** → also copy the `anon` public key (needed for admin frontend)
4. Run the schema: **SQL Editor** → paste `packages/db/sql/schema.sql` → Run

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   ← the long secret one (NOT anon)
```

### Optional — features degrade gracefully without these

| Variable | Feature | Where to get |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Wholesale payment links | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation | Run `stripe listen --forward-to localhost:4000/api/webhooks/stripe` |
| `MP_ACCESS_TOKEN` | Mercado Pago payments | [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers) → Your integrations |
| `MP_WEBHOOK_SECRET` | MP webhook validation | MP dashboard → Your app → Webhooks |
| `RESEND_API_KEY` | Order confirmation emails | [resend.com](https://resend.com) — free 3,000/month |
| `SENTRY_DSN` | Error tracking | [sentry.io](https://sentry.io) — free tier |
| `B2_KEY_ID` + `B2_APPLICATION_KEY` + `B2_BUCKET_NAME` | DB backups to Backblaze | [backblaze.com](https://backblaze.com) |

---

## Initial Setup

```bash
# 1. Install all dependencies
cd pablo_app
pnpm install

# 2. Set up API env
cp apps/api/.env.example apps/api/.env
# Open apps/api/.env — fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# All other vars are optional for local dev

# 3. Set up Admin env
cp apps/admin/.env.local.example apps/admin/.env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL=http://localhost:4000 is already set

# 4. Create the database schema
# Go to Supabase → SQL Editor
# Paste the contents of: packages/db/sql/schema.sql
# Click Run (safe to run multiple times — all CREATE TABLE IF NOT EXISTS)

# 5. Create your first admin user
# Supabase → Authentication → Add user → fill email + password
# Copy the user's UUID from the users list
# Then run in SQL Editor:
INSERT INTO users (id, username, email, role, active)
VALUES ('<paste-uuid-here>', 'admin', 'your@email.com', 'admin', true);
```

---

## Running Locally

### All apps at once (recommended)

```bash
pnpm dev
```

Starts everything in parallel via Turborepo. Open:

| App | URL |
|-----|-----|
| API | http://localhost:4000 |
| Admin dashboard | http://localhost:3001 |
| Consumer web app | http://localhost:3002 |

### Individual apps

```bash
pnpm --filter @pablo/api dev        # API only
pnpm --filter @pablo/admin dev      # Admin only
pnpm --filter @pablo/web dev        # Web only
pnpm --filter @pablo/mobile dev     # Expo dev server (shows QR code)
```

### Health check — verify API is running

```bash
curl http://localhost:4000/health
# {"ok":true,"ts":"2026-05-07T..."}
```

---

## Using Each App

### Admin dashboard — `http://localhost:3001`

Login with the Supabase user you created. What you can do:

- **Dashboard** — live revenue KPIs, gross profit, daily cash flow chart, CxC mayoreo
- **Órdenes** — full order lifecycle (create, update status, assign deliverer, QR generation)
- **POS** — point-of-sale terminal for in-person sales
- **Productos** — CRUD + stock adjustments
- **Clientes** — customer lookup, order history, lifetime value
- **Repartidores** — delivery staff management
- **Mayoristas** — wholesale accounts, credit balance, payment tracking, Stripe payment links
- **Gastos** — expense log with date/category filter
- **Devoluciones** — returns and refunds
- **Usuarios** — user account CRUD (admin role only)

### Consumer web app — `http://localhost:3002`

No login required. State saved locally in browser.

- **Álbum** — tap any team/section card → see all 18 stickers → tap "Tengo" (green = owned) or "Busco" (yellow = needed)
- **Tienda** — browse 21 products, filter by category, add to cart (quick-add or go to product detail)
- **Carrito** — adjust quantities, see total with shipping, continue to checkout
- **Checkout** — fill name/phone/address/payment → submits real order to API → redirects to confirmation
- **Stats** — % complete, group breakdown, progress timeline chart
- **Swap** — generates base64 code of your extras/needed list → paste someone else's code → see exact matches

### Mobile app (Expo Go — fastest way to test)

```bash
# Install Expo Go on your phone from App Store / Play Store
pnpm --filter @pablo/mobile dev
```

Scan the QR code with:
- **Android:** Expo Go app
- **iPhone:** Camera app (iOS 16+)

Same features as web + native haptic feedback on every sticker tap + push notification permission request on launch.

**Important:** MMKV (fast native storage) requires a real native build to work. In Expo Go it will crash on launch unless you swap to AsyncStorage. For proper testing, build a development client:

```bash
eas build --profile development --platform ios    # or android
```

Or to test on iOS simulator without EAS:
```bash
pnpm --filter @pablo/mobile exec expo run:ios
```

---

## Testing

### Unit tests (API — 29 tests)

```bash
pnpm --filter @pablo/api test
```

Covers all calc helpers (`itemsSubtotal`, `computeDiscount`, `saleTotal`, `deriveSaleStatus`, etc.) plus webhook security (both Stripe and Mercado Pago reject requests without valid signature headers).

### Typecheck all packages

```bash
pnpm turbo typecheck
# Runs tsc --noEmit on api + admin + web + mobile
# All must pass — TypeScript strict + exactOptionalPropertyTypes
```

### E2E tests — Playwright (web app)

**API is mocked** — no real Supabase or API server needed. Playwright intercepts `POST /api/orders` and returns a fake order.

```bash
# Auto-starts web dev server, runs all specs
pnpm --filter @pablo/web test:e2e

# See the browser (non-headless)
pnpm --filter @pablo/web exec playwright test --headed

# Run one spec file
pnpm --filter @pablo/web exec playwright test tests/e2e/checkout.spec.ts

# Debug mode (step through)
pnpm --filter @pablo/web exec playwright test --debug
```

What's tested:
- `album.spec.ts` — navigate to MEX group, mark sticker owned/needed, tab filters (Me falta / Tengo extra)
- `shop.spec.ts` — category filter, add to cart, product detail qty picker, empty cart state
- `checkout.spec.ts` — full golden path (add item → cart → checkout form → confirmation page), validation errors for missing name/phone/address

---

## API Endpoints Reference

Base: `http://localhost:4000`

Most `/api/*` routes require the `sb-token` cookie (set on login) or `Authorization: Bearer <token>` header.

```
GET    /health                         No auth

POST   /api/auth/login                 { email, password }
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/orders                     ?status= &deliveryType= &page= &limit=
POST   /api/orders                     Create order (no auth — public endpoint for web checkout)
GET    /api/orders/:orderNumber
PATCH  /api/orders/:orderNumber
DELETE /api/orders/:orderNumber

GET    /api/products
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

GET    /api/customers
GET    /api/sales
POST   /api/sales
GET    /api/expenses
POST   /api/expenses
PATCH  /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/wholesalers
POST   /api/wholesalers
GET    /api/wholesalers/:id/sales
POST   /api/wholesalers/:id/sales

GET    /api/dashboard                  Full KPI object
GET    /api/dashboard/orders-summary   Kanban counts

GET    /api/deliverers
POST   /api/deliverers
PATCH  /api/deliverers/:id

GET    /api/returns
POST   /api/returns
PATCH  /api/returns/:id

GET    /api/users                      Admin only
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

POST   /api/webhooks/stripe            Requires stripe-signature header
POST   /api/webhooks/mercadopago       Requires x-signature header
```

---

## Common Problems

### `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`
API crashed before starting. Copy `.env.example` → `.env` and fill both values.

### Admin shows blank screen or infinite spinner
- Check API is running on port 4000
- Check `NEXT_PUBLIC_API_URL=http://localhost:4000` in `apps/admin/.env.local`
- Open browser devtools → Network tab → look for failed requests

### Login returns 401 even with correct password
User exists in Supabase Auth but not in the `users` table. Run in Supabase SQL Editor:
```sql
INSERT INTO users (id, username, email, role, active)
VALUES ('<uuid-from-auth-users-list>', 'admin', 'your@email.com', 'admin', true)
ON CONFLICT (id) DO NOTHING;
```

### Mobile app crashes immediately
MMKV native module not linked. Two options:
1. Use `expo run:ios` / `expo run:android` (builds native app locally)
2. Build dev client: `eas build --profile development --platform ios`

### `pnpm` not found
```bash
npm install -g pnpm@9
```

### Expo QR not scanning
Make sure your phone and dev machine are on the same WiFi network.

### Stickers not persisting between page refreshes (web)
Normal — localStorage is used. Check devtools → Application → Local Storage → `pablo-album-v1`.

---

## Building for Production

### API — deploy to Render (free tier works)

```bash
pnpm --filter @pablo/api build
# Output: apps/api/dist/index.js
```

In Render dashboard:
- Build command: `pnpm install && pnpm --filter @pablo/api build`
- Start command: `node apps/api/dist/index.js`
- Add all env vars from `apps/api/.env.example`
- Set `NODE_ENV=production`

### Admin + Web — deploy to Vercel

Connect GitHub repo to Vercel. Create two projects:

**Admin:**
- Root directory: `apps/admin`
- Framework: Next.js
- Build: `pnpm build` (auto-detected)
- Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Web:**
- Root directory: `apps/web`
- Framework: Next.js
- Env vars: `NEXT_PUBLIC_API_URL`

### Mobile — App Store + Google Play

**One-time EAS setup:**
```bash
eas login          # create free account at expo.dev
eas init           # links app to your Expo account
```

**Before first submission:**
1. Design app icon (1024×1024 PNG) → save as `apps/mobile/src/assets/icon.png`
2. Design splash screen → save as `apps/mobile/src/assets/splash.png`
3. Fill in `apps/mobile/eas.json`:
   - `ascAppId` — App Store Connect → your app → App ID
   - `appleTeamId` — [developer.apple.com/account](https://developer.apple.com/account)
   - Place `google-service-account.json` in `apps/mobile/` for Play Store auto-submit

**Build:**
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

**Submit:**
```bash
eas submit --platform ios --latest     # uploads to TestFlight
eas submit --platform android --latest # uploads to Play Store internal track
```

**Accounts needed:**
- Apple Developer: $99/year at [developer.apple.com](https://developer.apple.com)
- Google Play: $25 one-time at [play.google.com/console](https://play.google.com/console)

**Review times:**
- iOS: 24–48h average (can be longer for first submission)
- Android: 3–7 days for first submission

---

## Project File Map — Key Files

```
apps/api/src/
├── index.ts              Server entry — plugins + route registration
├── plugins/auth.ts       Supabase JWT verification middleware
├── plugins/audit.ts      Auto-logs all mutations to audit table
├── routes/orders.ts      Order CRUD + QR generation + Stripe link
├── routes/wholesalers.ts Wholesale + credit + Stripe payment links
├── routes/dashboard.ts   KPI aggregation (revenue, profit, daily cashflow)
├── routes/webhooks/stripe.ts       Validates stripe-signature
├── routes/webhooks/mercadopago.ts  Validates x-signature
└── lib/calc.ts           Pure math — 29 unit tests, zero dependencies

apps/admin/src/
├── app/(dashboard)/      11 admin screens
├── components/ui/        Button, Badge, Dialog, DataTable, Input, Select
└── lib/api.ts            Typed fetch client for all API endpoints

apps/web/src/
├── app/album/            Sticker album (group grid + sticker detail)
├── app/tienda/           Product catalog + detail pages
├── app/carrito/          Cart
├── app/checkout/         Order form → POST to API
├── app/orden/[n]/        Order confirmation
├── app/stats/            Progress stats + SVG chart
├── app/swap/             Swap code generator + matcher
├── app/privacidad/       Privacy policy (required for App Store)
├── app/terminos/         Terms of service (required for App Store)
└── lib/
    ├── album-store.ts    Zustand persist — sticker state + timeline
    ├── cart-store.ts     Zustand persist — cart
    └── data.ts           Full catalog: 500 stickers, 28 groups, 21 products

apps/mobile/src/
├── app/(tabs)/index.tsx  Album tab
├── app/(tabs)/tienda.tsx Shop tab
├── app/(tabs)/stats.tsx  Stats tab
├── app/(tabs)/swap.tsx   Swap tab
├── app/(tabs)/carrito.tsx Cart tab
├── app/album/[groupId]/  Sticker grid with haptics
├── app/checkout/         Native form
├── app/orden/[n]/        Order confirmation
└── lib/album-store.ts    Same as web but MMKV-backed

packages/db/sql/schema.sql    18-table Postgres schema (idempotent)
apps/mobile/eas.json          EAS build profiles (dev/preview/production)
.github/workflows/ci.yml      3-job CI: typecheck → E2E → build
```

---

## Environment Variables — Complete List

### `apps/api/.env`

```bash
# Required
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Strongly recommended
SESSION_SECRET=<run: openssl rand -hex 32>
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
NODE_ENV=development

# Payment processing (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=your-secret

# Email (optional)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Error tracking (optional)
SENTRY_DSN=https://...@sentry.io/...

# Backups (optional)
B2_KEY_ID=...
B2_APPLICATION_KEY=...
B2_BUCKET_NAME=pablo-backups

# Server
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=debug
```

### `apps/admin/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   ← anon key, NOT service_role
```

### `apps/web` — no `.env` file needed locally

In production add:
```bash
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

### `apps/mobile/.env` (create this file)

```bash
# Use your local machine IP, not localhost (phone can't reach localhost)
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000

# In production:
# EXPO_PUBLIC_API_URL=https://your-api.onrender.com
```

Find your local IP: `ip addr show` (Linux) or `ifconfig | grep inet` (Mac)

---

## What's Not Finished (known gaps)

These exist in the plan but were not implemented — need real credentials or business decisions first:

| Feature | Status | What's needed |
|---------|--------|--------------|
| Supabase RLS policies | Schema has no row-level security | Add policies: anon can only INSERT orders, not SELECT all data |
| CFDI invoice generation | Endpoint stub exists | Wire up a CFDI service (e.g. Facturapi) |
| My Panini custom cards | Not built | Image upload + Supabase Storage |
| Deliverer GPS live tracking | Schema has `lat/lng` columns | Supabase Realtime channel + map component |
| Cross-device album sync | Hooks in place | Supabase Auth login + sync logic |
| Push notifications backend | Frontend registers token | API endpoint to send Expo push messages |
| App icons | Referenced but missing | Design 1024×1024 PNG before App Store submit |
| Production CORS | Hardcoded localhost | Set `CORS_ORIGIN` to real domain in prod env |
