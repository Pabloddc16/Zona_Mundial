# Pablo App — Full Rewrite & Mobile Expansion Plan

## Context

Two projects exist under `/home/branko/Documents/Projects/pablo_app`, both written by a non-technical person for a Panini World Cup 2026 sticker card business:

1. **`admin-mundial-2026`** — admin dashboard + REST API (Node.js/Express, vanilla JS frontend, ~3500-line `server.js` monolith, ~5000-line `app.js` monolith)
2. **`Mundial2026`** — consumer PWA (Vite SPA, localStorage state, Mercado Pago payments, QR swap system)

Both work at a basic level but have critical problems: unconnected databases, missing features (returns=stub, CFDI=schema-only, user mgmt UI broken), security gaps (no CSRF, no MP webhook signing, weak ACLs), non-maintainable monolithic files, no mobile apps, no shared auth, and no global payment support.

**Goal**: Full rewrite into a modern, maintainable stack. Single monorepo. Shared backend API. Web admin, consumer web app, iOS + Android mobile apps. Deployed globally. Ready for App Store/Play Store.
asdasd
---

## Target Architecture

```
pablo-app/ (monorepo — pnpm workspaces)
├── apps/
│   ├── api/          Node.js + TypeScript + Fastify + Supabase
│   ├── admin/        Next.js 14 (App Router) — admin dashboard
│   ├── web/          Next.js 14 (App Router) — consumer web app
│   └── mobile/       Expo (React Native) — iOS + Android
└── packages/
    ├── types/        Shared TypeScript types/interfaces
    ├── ui/           Shared component library (shadcn/ui base)
    ├── db/           Supabase client + generated types + queries
    └── validators/   Shared Zod schemas (already used in both projects)
```

**Shared services:**
- **Database**: Supabase PostgreSQL (schema already exists in `db/schema.sql`)
- **Auth**: Supabase Auth (replaces custom session system + anonymous localStorage)
- **Realtime**: Supabase Realtime (already used for swaps)
- **Storage**: Supabase Storage (for My Panini photos)
- **Payments**: Stripe (global) + Mercado Pago (LATAM fallback — already integrated in both apps)
- **Email**: Resend (replaces Nodemailer — simpler, better deliverability)
- **Error tracking**: Sentry (already in both apps)
- **Push notifications**: Expo Push + web push API

---

## Current State Assessment

### What exists and is good (keep/port)

| Asset | Location | Status |
|-------|----------|--------|
| PostgreSQL schema (18 tables) | `admin-mundial-2026/db/schema.sql` | Port as-is, minor additions |
| Zod validators | `Mundial2026/server/schemas.js` | Expand and move to `packages/validators` |
| Business logic (`calc.js`) | `admin-mundial-2026/lib/calc.js` | Port to TS, keep tests |
| Sticker catalog data | `Mundial2026/src/data.js` | Port to shared package |
| Product seed data | `admin-mundial-2026/data/products.json` | Keep as DB seed |
| Design spec + color system | `Mundial2026/DESIGN.md` | Use as design bible |
| Integration tests | `admin-mundial-2026/tests/` | Port to new stack |
| Supabase migration script | `admin-mundial-2026/scripts/migrate-to-supabase.js` | Fix and use |
| Backup system (B2) | `admin-mundial-2026/lib/backup-runner.js` | Port to new API |
| Auth flow logic | `admin-mundial-2026/lib/auth.js` | Replace with Supabase Auth |

### What needs full rewrite

| Problem | File | Why |
|---------|------|-----|
| API monolith | `admin-mundial-2026/server.js` (3476 lines) | No controllers, no modules, untestable |
| Admin UI monolith | `admin-mundial-2026/public/app.js` (4949 lines) | No components, no state mgmt |
| Consumer app monolith | `Mundial2026/src/main.js` (4229 lines) | Same problem |
| Custom session auth | `admin-mundial-2026/lib/auth.js` | Fragile, no refresh tokens, no OAuth |
| JSON file persistence | `admin-mundial-2026/data/*.json` | Not scalable, no concurrency safety |
| Unsigned webhook | `Mundial2026/server/routes/webhook.js` | Security hole — can be forged |
| Stub returns endpoint | `admin-mundial-2026/server.js:readReturns()` | Always returns `[]` |
| No mobile apps | — | iOS + Android needed |

### Missing features to build

- Returns/refunds full implementation
- CFDI Mexican invoice generation
- User management UI (admin)
- My Panini print vendor integration
- Push notifications (order updates)
- Referral UI + payout tracking
- Deliverer GPS live tracking
- Audit log viewer in admin
- Global payments (Stripe international)
- Cross-device album sync (requires auth)
- Scheduled email reports

---

## Tech Stack

| Layer | Tech | Reason |
|-------|------|--------|
| Monorepo | pnpm workspaces + Turborepo | Shared deps, parallel builds |
| Backend | Node.js + Fastify + TypeScript | Fast, schema-driven, keeps existing ecosystem |
| DB client | Supabase JS client + `supabase gen types typescript` | Already in both projects, CLI generates full TypeScript types from schema — no ORM needed |
| Auth | Supabase Auth | Handles sessions, OAuth, magic links, RLS |
| Database | Supabase PostgreSQL | Already partially set up, schema exists |
| Admin web | Next.js 14 (App Router) + shadcn/ui | SSR, great DX, Radix-based accessible components |
| Consumer web | Next.js 14 (App Router) | SSR for SEO, API routes for BFF |
| Mobile | Expo SDK 52 + Expo Router | React Native for iOS/Android, single codebase |
| State mgmt | TanStack Query (server) + Zustand (client) | Best-in-class, already popular in RN ecosystem |
| Validation | Zod (shared package) | Already in both projects |
| Payments | Stripe + Mercado Pago | Stripe global, MP for LATAM |
| Push notifs | Expo Push + Supabase Edge Functions | Unified for web + mobile |
| Uploads | Supabase Storage | My Panini photos, product images |
| Email | Resend | Simpler than Nodemailer, better logs |
| Error tracking | Sentry | Already in both apps, keep |
| CI/CD | GitHub Actions | Already in admin project |
| Deployment | Vercel (web apps) + Render (API) + Expo EAS (mobile) | Each optimal for its target |

---

## Phase Breakdown

### Phase 0 — Setup & Foundation (Week 1-2)
**Goal**: Monorepo scaffold, shared packages, DB migration

- [ ] Create monorepo with pnpm workspaces + Turborepo
- [ ] Create `packages/types`, `packages/validators`, `packages/db`, `packages/ui`
- [ ] Port Zod schemas from both projects into `packages/validators`
- [ ] Port sticker catalog (`data.js`) + product data into `packages/db/seeds`
- [ ] Run `migrate-to-supabase.js` (fix the stub) — migrate all JSON data to Supabase
- [ ] Run `supabase gen types typescript` — generate typed client from existing `schema.sql`
- [ ] Add missing columns to `schema.sql` for new features (returns, invoices, push tokens)
- [ ] Add Supabase Auth tables + RLS policies
- [ ] Configure Turborepo pipeline (build, test, typecheck)
- [ ] Set up GitHub Actions CI for monorepo

**Critical files**: `admin-mundial-2026/db/schema.sql`, `admin-mundial-2026/scripts/migrate-to-supabase.js`

---

### Phase 1 — Backend API Rewrite (Week 3-7)
**Goal**: Replace 3476-line `server.js` monolith with modular Fastify API

Structure:
```
apps/api/src/
├── routes/
│   ├── auth.ts         (from lib/auth.js — replace with Supabase Auth hooks)
│   ├── orders.ts       (from server.js orders section)
│   ├── sales.ts        (from server.js POS section)
│   ├── products.ts     (from server.js products section)
│   ├── customers.ts
│   ├── deliverers.ts
│   ├── wholesalers.ts
│   ├── expenses.ts
│   ├── returns.ts      (NEW — full implementation, currently stub)
│   ├── invoices.ts     (NEW — CFDI generation)
│   ├── dashboard.ts
│   ├── users.ts        (NEW — full CRUD, fix broken UI)
│   └── webhooks/
│       ├── stripe.ts   (add signature validation)
│       └── mercadopago.ts (add X-Signature validation — currently unsigned)
├── plugins/
│   ├── auth.ts         (Supabase JWT verification middleware)
│   ├── audit.ts        (audit log plugin — wraps all mutations)
│   └── ratelimit.ts
├── services/
│   ├── notifications.ts (Expo Push + web push)
│   ├── email.ts        (Resend)
│   └── storage.ts      (Supabase Storage for photos)
└── lib/
    ├── calc.ts         (ported from lib/calc.js — keep all tests)
    └── pagination.ts   (ported from lib/pagination.js)
```

**Key fixes in this phase:**
- Webhook signature validation (Stripe + Mercado Pago)
- Proper role-based ACL middleware (not just attribute-hiding)
- CSRF protection (Fastify CSRF plugin)
- Fix `readReturns()` stub — full implementation
- CFDI invoice endpoint (minimal: generate PDF, XML generation is a separate service)
- User management CRUD (currently broken in admin UI)

**Estimated: 4 weeks solo dev**

---

### Phase 2 — Admin Dashboard Rewrite (Week 8-13)
**Goal**: Replace 4949-line `app.js` monolith with React component tree

```
apps/admin/src/
├── app/                     (Next.js App Router)
│   ├── (auth)/login/        (replaces login.html — 3-pane form)
│   ├── dashboard/
│   ├── orders/
│   ├── pos/                 (point-of-sale)
│   ├── products/
│   ├── customers/
│   ├── deliverers/
│   ├── wholesalers/
│   ├── expenses/
│   ├── returns/             (NEW view)
│   ├── invoices/            (NEW view — CFDI)
│   ├── users/               (NEW — was broken)
│   ├── audit/               (NEW — was schema-only)
│   └── settings/
├── components/
│   ├── tables/              (paginated, filterable, CSV-exportable)
│   ├── charts/              (dashboard KPIs)
│   ├── forms/
│   ├── modals/
│   └── pos/                 (barcode scanner, cart — from pos-extras.js)
└── lib/
    ├── api.ts               (TanStack Query hooks wrapping API)
    └── reports.ts           (PDF/CSV — ported from reports.js)
```

**Screens to build (10 main + new):**
1. Dashboard — KPIs, charts (port from existing)
2. Orders — list, create, status tracking, assign deliverer
3. POS — barcode scanner, cart, payment methods
4. Products — CRUD, stock adjustments, bulk import
5. Customers — unified list, lifetime value, phone lookup
6. Deliverers — mgmt, live GPS (new), route optimization
7. Wholesalers — CRUD, credit tracking, payment schedule
8. Expenses — CRUD, date/category filter
9. Returns — full UI (new, was stub)
10. Invoices/CFDI — PDF download, XML (new)
11. Users — CRUD (was broken)
12. Audit Log — viewer + export (new)

**Estimated: 5 weeks solo dev**

---

### Phase 3 — Consumer Web App Rewrite (Week 14-17)
**Goal**: Replace 4229-line `main.js` with Next.js + proper component tree

```
apps/web/src/
├── app/
│   ├── album/               (sticker grid — HAVE/NEED/SWAP tabs)
│   ├── album/[groupId]/     (section detail)
│   ├── tienda/              (shop — catalog, My Panini, complete album)
│   ├── tienda/[productId]/  (product detail)
│   ├── carrito/             (cart + delivery options)
│   ├── checkout/
│   ├── orden/[orderNumber]/ (success screen)
│   ├── swap/                (live swap negotiation)
│   ├── scan/                (QR scanner — web via ZXing)
│   ├── stats/               (progress charts)
│   └── my-panini/crear/     (custom card creator)
├── components/
│   ├── sticker/             (StickerCard, StickerModal, StickerGrid)
│   ├── cart/
│   ├── swap/                (QR encode/decode — from swap-qr.js)
│   └── my-panini/           (photo upload + card preview)
└── lib/
    ├── state.ts             (Zustand — replaces localStorage SPA state)
    ├── sync.ts              (cross-device sync via Supabase Auth)
    └── supabase.ts          (realtime swaps — ported from supabase.js)
```

**Key improvements over original:**
- Cross-device sync (requires Supabase Auth login — optional but supported)
- Global payments via Stripe (in addition to Mercado Pago)
- Signed webhooks (security fix)
- Next.js SSR for SEO (product pages indexable)
- Push notifications for order status

**Estimated: 3 weeks solo dev**

---

### Phase 4 — Mobile App (Week 18-24)
**Goal**: iOS + Android app via Expo, sharing 80%+ code with web

```
apps/mobile/src/
├── app/                     (Expo Router — file-based)
│   ├── (tabs)/
│   │   ├── index.tsx        (home/dashboard)
│   │   ├── album.tsx        (sticker album — HAVE/NEED/SWAP)
│   │   ├── stats.tsx        (progress)
│   │   ├── tienda.tsx       (shop)
│   │   └── qr.tsx           (QR share + scan)
│   ├── album/[groupId].tsx
│   ├── producto/[id].tsx
│   ├── carrito.tsx
│   ├── checkout.tsx
│   ├── orden/[orderNumber].tsx
│   └── swap.tsx
├── components/              (import from packages/ui where possible)
│   ├── sticker/
│   ├── scanner/             (Expo Camera + ZXing native)
│   └── my-panini/
└── lib/
    ├── notifications.ts     (Expo Push token registration)
    └── haptics.ts           (native haptic feedback on sticker tap)
```

**Mobile-specific features beyond web:**
- Native camera for QR scanning (smoother than web)
- Haptic feedback on sticker mark
- Push notifications (order updates, swap requests)
- Offline support via React Native MMKV (faster than AsyncStorage)
- Biometric auth (Face ID / fingerprint for admin users)
- Deep links (order confirmation → open specific order)

**Estimated: 6 weeks solo dev**

---

### Phase 5 — Integration, Testing & App Store (Week 25-28)
**Goal**: Wire everything together, QA, submit to stores

- [ ] End-to-end tests (Playwright for web, Detox for mobile)
- [ ] Performance testing (Lighthouse for web, Flipper for mobile)
- [ ] Security audit (webhook signatures, RLS policies, CSRF)
- [ ] Privacy policy + terms of service (required for both stores)
- [ ] App Store screenshots (6.7" iPhone + iPad)
- [ ] Google Play store listing + screenshots
- [ ] Apple Developer account setup ($99/year)
- [ ] Google Play Developer account ($25 one-time)
- [ ] Expo EAS Build for production APK/IPA
- [ ] Submit to TestFlight (internal testing, 1-2 weeks)
- [ ] Submit to App Store Review
- [ ] Submit to Google Play Review
- [ ] Monitor crash reports post-launch

**Estimated: 3 weeks solo dev**

---

## App Store Approval Timeline

| Store | Account setup | First review | If rejected | Notes |
|-------|--------------|--------------|-------------|-------|
| **Apple App Store** | 1-2 days (verification) | 24-48 hours average | +3-7 days per revision | Need $99/year Apple Developer account. Card collecting + sticker tracking = low risk category (likely 4+/9+ age rating). |
| **Google Play** | Same day | 3-7 days | +3-5 days per revision | Need $25 one-time Google Play account. Generally more permissive than Apple. |

**Common rejection reasons to avoid:**
- Missing privacy policy → write one before submitting
- In-app purchases not using Apple's IAP → Mercado Pago/Stripe must route through Apple Pay for digital goods (physical sticker orders are exempt — physical goods exemption applies here)
- Incomplete functionality → all main flows must work before submitting
- Misleading screenshots → use real app UI

**Realistic App Store timeline:** 1-2 weeks from submission to live (assuming no rejections).

---

## Total Timeline (Solo Dev, Full Time)

| Phase | Description | Weeks |
|-------|-------------|-------|
| 0 | Setup, monorepo, DB migration | 2 |
| 1 | Backend API rewrite | 4 |
| 2 | Admin dashboard rewrite | 5 |
| 3 | Consumer web app rewrite | 3 |
| 4 | Mobile app (Expo) | 6 |
| 5 | Integration, QA, app store | 3 |
| **Total** | | **~23 weeks (~6 months)** |

**Part-time (20 hrs/week):** 12-14 months.

**To accelerate:**
- Hire 1 frontend dev → shave 6-8 weeks (parallelize admin + consumer web)
- Use a UI template for admin → shave 2-3 weeks
- Skip CFDI invoicing initially → shave 1 week

---

## Critical Files to Modify

| File | Action |
|------|--------|
| `admin-mundial-2026/db/schema.sql` | Source of truth — port to Drizzle schema |
| `admin-mundial-2026/scripts/migrate-to-supabase.js` | Fix stub → run once to seed prod DB |
| `admin-mundial-2026/lib/calc.js` | Port to TypeScript, keep tests |
| `admin-mundial-2026/lib/pagination.js` | Port to TypeScript, keep tests |
| `Mundial2026/src/data.js` | Move to shared package |
| `Mundial2026/server/schemas.js` | Expand, move to shared validators |
| `Mundial2026/DESIGN.md` | Use as design reference throughout |

---

## Existing Utilities to Reuse

| Utility | Source | Reuse in |
|---------|--------|----------|
| `calc.js` — discount/totals math | `admin-mundial-2026/lib/calc.js` | `packages/validators` |
| `pagination.js` | `admin-mundial-2026/lib/pagination.js` | `apps/api/src/lib` |
| `backup-runner.js` | `admin-mundial-2026/lib/backup-runner.js` | `apps/api/src/services` |
| `reports.js` — PDF/CSV | `admin-mundial-2026/public/reports.js` | `apps/admin/src/lib` |
| `swap-qr.js` — QR encode/decode | `Mundial2026/src/swap-qr.js` | `packages/ui` |
| `supabase.js` — realtime | `Mundial2026/src/supabase.js` | `packages/db` |
| All integration tests | `admin-mundial-2026/tests/` | Port to new API structure |

---

## Verification

After each phase, verify:

**Phase 0**: `pnpm build` passes in monorepo root. Supabase has all 18 tables with seed data.

**Phase 1**: All existing integration tests pass against new Fastify API. `POST /api/webhooks/stripe` rejects requests without valid signature. `GET /api/returns` returns real data (not `[]`).

**Phase 2**: Admin dashboard loads, login works (Supabase Auth), all 10 views render with real data, PDF export works, role-based visibility correct.

**Phase 3**: Consumer web app loads, sticker marking persists across sessions, checkout flow completes with Stripe test card, QR swap works between two browser tabs.

**Phase 4**: `expo run:ios` and `expo run:android` launch without errors. Camera QR scan works on physical device. Push notification received when order status changes. Offline sticker marking works with no network.

**Phase 5**: Lighthouse score ≥ 85 for consumer web. No critical Sentry errors in 24h smoke test. App Store + Play Store submission accepted.
