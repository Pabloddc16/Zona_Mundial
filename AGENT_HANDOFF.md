# Cromos 26 — Agent Handoff

Status snapshot for an agent (Claude Code or similar) picking up work on a different device. Read end-to-end before starting.

**Last updated:** 2026-05-16
**Working directory:** `/home/branko/Documents/Projects/Zona_Mundial` (or wherever cloned on new device)
**Repo:** `git@github.com:Pabloddc16/Zona_Mundial.git` — main branch
**User:** Branko (developer) for Pablo (business owner / app product). Branko types prompts. Pablo's app, Pablo's money on stores.

---

## What this product is

**Cromos 26** — a 2026 FIFA World Cup sticker album tracker + commerce app. NOT just a store. It is a social card-trading app:

- Track which stickers you own / need / have doubles of
- Find other users to swap with via QR codes (offer / receipt protocol)
- Order physical sticker packs through the in-app store
- Optional referral system

**Disclaimer required everywhere:** independent collector tool, NOT affiliated with FIFA / Panini. Trademark disclaimer must appear in login, register, and settings screens.

---

## Stack

### Monorepo (pnpm workspaces)

| App | Path | Stack | Host |
|-----|------|-------|------|
| **admin** | `apps/admin` | Next.js 15 App Router, Tailwind, React Query | Vercel (`zona-mundial.vercel.app`), auto-deploys on `git push origin main` |
| **api** | `apps/api` | Fastify, TypeScript, Supabase JS, Node 20 | Render (`zona-mundial.onrender.com`), auto-deploys on push. **Free tier — 30-60s cold start.** |
| **mobile** | `apps/mobile` | Expo SDK 55, React Native 0.83, React 19, expo-router | EAS Build + EAS Update (OTA). App ID `com.pabloapp.mundial2026` |
| **web** | `apps/web` | Next.js (consumer site, currently unused for store listing) | Not deployed |
| **customer-web** | `apps/customer-web` | Vite reference repo | **EXCLUDED from workspace** via `!apps/customer-web` in `pnpm-workspace.yaml` — its sharp@0.34 dep had no arm64 prebuild, broke iOS builds |

### Shared packages

- `packages/db` — Supabase client (service role with **explicit Authorization header**, see Known Issues)
- `packages/types` — shared TS types
- `packages/validators` — Zod schemas

### Database

- **Supabase** project, EU region
- Auth: `auth.users` table managed by Supabase Auth
- Mirror: `public.users` (id FK to auth.users, role, username)
- Inventory: movements ledger + `stock` materialized view
- Album: `album_stickers` (user_id FK to auth.users with `ON DELETE CASCADE`)

### Payments

- **Mercado Pago** Checkout Pro (planned, awaiting Pablo's credentials)
- Webhook endpoint not built yet
- Will need: `MP_ACCESS_TOKEN_PROD`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` in Render env

---

## Key external accounts & IDs

| Service | Identifier | Notes |
|---------|-----------|-------|
| Supabase | (project ref in admin/.env, api Render env) | Service role key never exposed client-side |
| Render | service: `zona-mundial.onrender.com` | Free tier hibernation |
| Vercel | `zona-mundial.vercel.app` | Admin app deploys here |
| EAS / Expo | account `brankostula` (stulanik@gmail.com), project ID `732ed138-a83a-41dc-8886-4f8217289d4f`, owner `brankostula` | Free plan — Android build quota exhausted, resets **2026-06-01** |
| Apple Developer | Team ID `7D7NLMWLYL`, ASC App ID `6769002053`, bundle `com.pabloapp.mundial2026` | $99/yr active |
| Google Play Console | $25 one-time paid | Package `com.pabloapp.mundial2026`. Contact email may be `Pabloddc16@gmail.com` (Pablo's) — see notes.md line 17 |
| Mercado Pago | Pablo will provide | Not yet integrated |
| GitHub | `github.com/Pabloddc16/Zona_Mundial` | SSH remote |

Don't leak the service role key. Branko's Gmail = `stulanik@gmail.com`. Pablo's Gmail = `Pabloddc16@gmail.com`.

---

## Recent work shipped

(Commit log for grounding — check `git log --oneline -30` for current state.)

- Mobile app rewrite: 5-tab layout (Album / Store / Stats / Trade / Settings), reference-driven UI, Ionicons throughout (no emojis), English copy
- Album screen: circular sticker badges (cream/gold unowned, slate strikethrough owned, blue +N for duplicates), section collapse via chevron, share/lock/dropdown header
- Store screen: cart top-left, Cards quick-filter top-right, Uber-Eats-style 3-mode buttons (Delivery / Pickup / Gift), stabilized category pills (fixed 36px height, no reflow)
- Swap screen: camera permission card with green icon circle, QR offer/receipt protocol via `lz-string` with `M26:` / `M26Z:` prefixes
- Referral screen at `/referral` with QR + copy buttons + share API
- Auth hardening: cached user in SecureStore for instant cold-start render, `loadFromToken` fast-paths
- Account deletion: in-app (Settings → Account → Delete) + public web page at `/delete-account`
- Public legal pages: `/privacy`, `/terms`, `/delete-account` in admin app (inline styles, outside auth groups)
- Admin login moved to `/admin/login`, dashboard root at `/admin` — **in progress** (see Pending below)
- API: manual joins replace PostgREST nested embeds for stock/purchases/recipes/conversions (fixes intermittent FK hint failures on materialized views)
- API: `/register` repairs orphan auth.users by upserting public.users, English error copy
- iOS production build #7 succeeded, submitted to TestFlight (in review when last checked)
- Apple compliance: `ITSAppUsesNonExemptEncryption: false` set
- OTA: `fallbackToCacheTimeout: 8000` so first launch waits up to 8s for new JS

---

## Pending work (priority order)

### 1. Google Play Console submission

State: store listing 90% done. Waiting on:

- [ ] **App icon** — 512×512 PNG, no alpha (use Gemini "Nano Banana" with the prompt in `notes.md` or session history)
- [ ] **Phone screenshots** — minimum 2, 1080×1920 portrait, from Android device or emulator
- [ ] **Tablet screenshots** — opt out of tablet device category in Play Console → Setup → Advanced settings → Release types
- [ ] **Production AAB build** — `eas build --profile production --platform android` (blocked: EAS free quota exhausted until 2026-06-01)
- [ ] **Service account JSON** — Play Console → Setup → API access → create service account → grant Release Manager → download JSON → save to `apps/mobile/google-service-account.json` (gitignored already? double-check) → referenced in `eas.json` submit config
- [ ] **Upload AAB** to Internal Testing track in Play Console
- [ ] **Add testers** by email list, share opt-in URL
- [ ] **Submit for review**

Already filled in Play Console (verify these are still ✓):
- Privacy policy URL → `https://zona-mundial.vercel.app/privacy`
- Account deletion URL → `https://zona-mundial.vercel.app/delete-account` (live after push of commit adding the page)
- Content rating questionnaire — auto-rated low (no violence, no sex, no gambling)
- Target audience — 13-17 + 18+ only (no under-13)
- Data safety — Personal info (name, email, user IDs, address, phone), App activity (interactions), Device IDs. All Collected (not Shared). All Required. Purposes: App functionality + Account management for most; Analytics + Fraud prevention for Device IDs. **Never tick Advertising.**
- App access — demo creds: `play-review@cromos26.com` / `apple-review@cromos26.com` (seeded in API)
- Ads → No ads
- App category → Sports (Apps, not Games)
- Short description + full description → see `notes.md` or session history
- Feature graphic → 1024×500 (pending Nano Banana generate)

### 2. Apple TestFlight

- [ ] Confirm build #7 finished processing (App Store Connect → TestFlight)
- [ ] Create Internal or External Testing group
- [ ] Add testers (Pablo, Branko, Pablo's colleagues)
- [ ] Once Pablo wants store launch: build for App Store production, submit metadata, screenshots, App Review Information with demo creds

### 3. Admin app move to `/admin/*` (incomplete)

Started this session, **NOT COMMITTED YET**. State:

- Moved `apps/admin/src/app/(auth)/` → `apps/admin/src/app/admin/(auth)/`
- Moved `apps/admin/src/app/(dashboard)/` → `apps/admin/src/app/admin/(dashboard)/`
- Updated sidebar hrefs (all prefixed `/admin/...`)
- Updated `isActive` logic for `/admin` root
- Updated login redirect after success → `/admin`
- Updated dashboard layout unauth catch → `/admin/login`
- Updated forgot/reset password page links → `/admin/login`
- Updated `conversions/page.tsx` inline link `/inventory` → `/admin/inventory`

Still to do for this move:
- [ ] Create new public landing page at `apps/admin/src/app/page.tsx`
- [ ] Test admin login still works at `/admin/login`
- [ ] Test sidebar nav inside `/admin/*` routes
- [ ] Commit + push so Vercel deploys; verify `zona-mundial.vercel.app/` is the landing and `/admin` is the admin login redirect

Landing page should include:
- Hero with "Cromos 26" + tagline
- 3-4 feature cards (Track album / Swap with QR / Order packs / Stats)
- "Coming soon" or links to Play Store and App Store badges (placeholders fine for now)
- FAQ section
- Footer with Privacy / Terms / Delete-account / Contact email
- Green theme matching mobile (#006341 primary)

### 4. Mercado Pago integration

Wait for Pablo to deliver credentials. Then:

- [ ] Add env vars to Render: `MP_ACCESS_TOKEN_PROD`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
- [ ] Build `POST /api/payments/mp/preference` in api (creates Checkout Pro preference, returns init_point URL)
- [ ] Wire mobile checkout to open preference URL via `expo-web-browser`
- [ ] Build `POST /api/payments/mp/webhook` to verify signature + mark order paid
- [ ] Test sandbox flow end-to-end before going live

### 5. Optional / nice-to-have

- Referral signup capture endpoint (currently link only routes to home)
- Backend trade matching (currently QR-only, no server-side discovery)
- Push notifications via Expo (config already in `app.json`, just needs to send)
- Production build of Android AAB after Jun 1 quota reset (or $19/mo upgrade)

---

## Critical gotchas (do not repeat past mistakes)

1. **Don't add `apps/customer-web` back to workspace.** Its `sharp@0.34` has no arm64 prebuild. iOS builds fail at "Install dependencies." Excluded via `!apps/customer-web` in `pnpm-workspace.yaml`.

2. **Service role auth in `packages/db`.** Must set `global.headers.Authorization: Bearer <service_role>` explicitly. Supabase JS v2.105+ leaks user JWTs from `auth.getUser(token)` calls into subsequent `.from()` calls, making PostgREST treat the service client as `authenticated` not `service_role`. Without the explicit header, admin endpoints return "Invalid session." Use `.maybeSingle()` not `.single()` in auth plugin.

3. **PostgREST FK joins fail on materialized views.** For `stock`, `purchases`, `recipes`, `conversions` — do manual two-step fetches in api routes. Don't trust nested `select('*, related(*)')` for these.

4. **`parseError()` in api clients** (mobile + admin) must prefer `body.message` over `body.error`. Fastify shape is `{statusCode, error: 'Bad Request', message: 'actual reason'}` — picking `error` shows generic "Bad Request" instead of the real cause.

5. **EAS Update vs EAS Build.** Use `eas update --branch production` for JS-only changes. New build only needed when native deps change (camera plugin, secure-store, expo-clipboard added, etc.). User exhausted free quota with too many preview rebuilds — be deliberate.

6. **`expo-updates` first launch.** Default behavior loads cached JS, downloads in background — user sees new UI only on second launch. `fallbackToCacheTimeout: 8000` in `app.json` mitigates by waiting 8s for fetch on cold start. Only applies to **future** builds (already built APKs won't pick this up).

7. **Mobile app cold-start spinner.** Without cached user, `auth-store.loadFromToken` calls `/me` on launch; Render free tier 30-60s cold start = infinite spinner. Fixed by caching user in SecureStore (`getCachedUser` / `setCachedUser`) — render cached user immediately, refresh in background.

8. **POS stock check.** Don't re-add `products.stock < quantity` guard — that column is permanently 0 since the movements migration. `recordMovements` validates against the `stock` materialized view.

9. **Recipes can't have 0 lines.** API rejects empty recipes and rolls back the recipe row if `recipe_lines` insert fails. Past bug swallowed lines silently.

10. **Demo accounts seeded for reviewers:**
    - `apple-review@cromos26.com`
    - `play-review@cromos26.com`
    Both via Supabase Auth with role `customer`. Passwords in your encrypted notes / Pablo's docs — DO NOT hardcode in this file. If lost, regenerate via admin panel or `auth.admin.createUser`.

11. **Trademark.** Never use real team crests, real player photos, FIFA/Panini logos, real World Cup branding in:
    - App icon
    - Feature graphic
    - Screenshots (UI shows generic sticker representations only)
    - Marketing copy
    Sticker labels in `apps/mobile/src/lib/data.ts` are generic ("Player N", "Team photo", "Crest") — keep them generic.

12. **Privacy / Terms / Delete-account pages** are at the **root** of admin app (not inside auth or dashboard groups) so they're publicly accessible. Inline styled (don't depend on admin's dark theme). Don't move them into a route group.

13. **Don't run `git add -A` blindly.** `notes.md` may contain Pablo's email / credentials notes. `app.json` at repo root is an EAS-managed file. Stage specific paths.

14. **OTA channel matches build profile.** `preview` builds use `preview` channel, `production` builds use `production` channel. Cross-pushing OTA to wrong channel does nothing visible.

---

## Common commands

### Mobile

```bash
cd apps/mobile

# Start dev (Expo Go or development client)
pnpm dev

# OTA update (preferred for JS-only changes)
eas update --branch production --message "describe the change"
eas update --branch preview --message "preview update"

# New build (only when native deps change)
eas build --profile preview --platform android        # APK for sideload
eas build --profile production --platform android     # AAB for Play
eas build --profile production --platform ios         # IPA for App Store

# Check quota
eas build:list --limit 30

# View specific build
eas build:view <build-id>

# Submit (after AAB built)
eas submit --platform android --profile production
eas submit --platform ios --profile production

# Credentials
eas credentials
```

### Admin

```bash
cd apps/admin
pnpm dev       # localhost:3000
pnpm build     # production build
```

### API

```bash
cd apps/api
pnpm dev       # localhost:4000
pnpm build
```

### DB (Supabase)

```bash
# Run SQL on linked project
supabase db query "select 1"

# Generate types
supabase gen types typescript --linked

# Migrations
supabase migration new <name>
supabase db push
```

### Root

```bash
pnpm install              # install all workspace deps
pnpm -r typecheck         # typecheck everywhere
pnpm -r test              # run all tests
git log --oneline -20     # recent history
```

---

## Style / behavioral notes

- **Branko prefers terse output.** Caveman mode is often active. Don't pad responses. State results.
- **Don't push without explicit ask.** `git push` is an authorized-once-per-prompt action, not session-wide.
- **Don't run `eas build` without explicit ask.** It costs quota.
- **Don't commit `apps/admin/tsconfig.tsbuildinfo`** (it's noise, but git tracks it as modified always).
- **Avoid emojis in app UI.** Use `@expo/vector-icons` (Ionicons). Past feedback: "icons not emojis."
- **Mobile copy is English.** Spanish translations were removed. Don't reintroduce ES strings.
- **Theme tokens live in `apps/mobile/src/lib/theme.ts`** (`COLORS`, `SPACING`, `RADIUS`, `FONT`, `SHADOW`). Don't hardcode colors in components.
- **Admin uses dark theme** with custom CSS variables in `globals.css`. Don't apply admin theme to public legal pages — those use inline styles for cream/green branded look.
- **Memory system is enabled.** Read `MEMORY.md` in `/home/branko/.claude/projects/-home-branko-Documents-Projects-Zona-Mundial/memory/` for prior context. Write new memories sparingly (user prefs, project facts, never code patterns).

---

## Architecture diagrams

### Auth flow

```
Mobile app                          API (Render)               Supabase
   │                                   │                          │
   │── POST /api/auth/register ───────►│                          │
   │                                   │── supabase.auth.signUp ►│
   │                                   │◄────── auth.users row ───│
   │                                   │── upsert public.users ──►│
   │◄── {user, access, refresh} ──────│                          │
   │                                                              │
   │── GET /api/me ── Bearer JWT ─────►│                          │
   │                                   │── supabase.auth.getUser(token)
   │                                   │── join public.users ────►│
   │◄── {user with role/username} ────│                          │
```

### Swap QR protocol

```
Alice                                       Bob
  │                                          │
  │── encodeOffer({extras, needed}) ─►       │
  │   → "M26Z:<lz-compressed-base64>"        │
  │── display QR ────────────────────►       │
  │                                          │
  │                          scan QR ◄─── Bob's camera
  │                                          │── decodePayload(qr)
  │                                          │   → {type:'offer', extras, needed}
  │                                          │── compute matches
  │                                          │   intersect(Alice.extras, Bob.needed)
  │                                          │   intersect(Bob.extras, Alice.needed)
  │                                          │── encodeReceipt({proposed_swaps})
  │                          show receipt QR │   → "M26:..."
  │── scan receipt ◄─────────────────────────│
  │── show proposed swap                     │
  │── physical handoff                       │
```

---

## Where things live (quick map)

```
apps/mobile/
├─ app.json                          ← Expo + EAS config, app name, bundle ID, plugins
├─ eas.json                          ← Build profiles, submit config
├─ src/
│  ├─ app/
│  │  ├─ (tabs)/
│  │  │  ├─ _layout.tsx              ← 5 tab nav (Album/Store/Stats/Trade/Settings)
│  │  │  ├─ index.tsx                ← Album screen
│  │  │  ├─ tienda.tsx               ← Store screen
│  │  │  ├─ stats.tsx
│  │  │  ├─ swap.tsx                 ← QR scan + offer
│  │  │  └─ settings.tsx
│  │  ├─ producto/[id].tsx           ← Product detail
│  │  ├─ carrito.tsx                 ← Cart (hidden tab)
│  │  └─ referral.tsx                ← Invite friends
│  └─ lib/
│     ├─ theme.ts                    ← Design tokens
│     ├─ data.ts                     ← Static catalog + sticker labels (English)
│     ├─ auth-store.ts
│     ├─ auth-storage.ts             ← SecureStore wrappers + cached user
│     ├─ swap-qr.ts                  ← encodeOffer / encodeReceipt / decodePayload
│     └─ api.ts                      ← Fastify-style error handling

apps/admin/src/app/
├─ layout.tsx                        ← Root layout (Providers)
├─ providers.tsx
├─ privacy/page.tsx                  ← Public privacy policy
├─ terms/page.tsx                    ← Public terms
├─ delete-account/page.tsx           ← Public account deletion instructions
└─ admin/                            ← NEW: admin moved here
   ├─ (auth)/
   │  ├─ login/page.tsx
   │  ├─ forgot-password/page.tsx
   │  └─ reset-password/page.tsx
   └─ (dashboard)/
      ├─ layout.tsx                  ← Sidebar + auth guard
      ├─ page.tsx                    ← /admin home (sales dashboard)
      ├─ orders/page.tsx
      ├─ pos/page.tsx
      └─ ... (products, customers, inventory, etc.)

apps/api/src/
├─ index.ts
├─ plugins/
│  └─ auth.ts                        ← JWT verify, role guard
├─ routes/
│  ├─ auth.ts                        ← /register, /login, /me, /logout, /delete-account
│  ├─ products.ts
│  ├─ orders.ts
│  ├─ purchases.ts                   ← Manual joins (PostgREST FK fails on mat views)
│  ├─ recipes.ts                     ← Rejects 0-line recipes, rolls back on partial insert
│  ├─ conversions.ts                 ← /start /finish /cancel with status-aware errors
│  ├─ sales.ts                       ← POS, no legacy stock check
│  ├─ album.ts                       ← GET state, PUT sticker, POST bulk
│  └─ trades.ts                      ← GET /matches
└─ lib/
   └─ movements.ts                   ← recordMovements + stock view check

packages/db/src/index.ts             ← Service role client with explicit Authorization header
```

---

## When in doubt

- Check `notes.md` (Branko's running notes — may have credentials or recent state)
- Check `MEMORY.md` index in user's auto-memory dir
- Check `git log` and `git status`
- Ask Branko in chat — he's reachable
- Don't push to `main`, don't run `eas build`, don't run destructive SQL without explicit ask

Good luck. Don't break TestFlight.
