# Cromos 26 — Launch Checklist for Pablo

> Everything we still need from you to ship the app on **Apple App Store** and **Google Play Store**.
>
> Section by section. Tick each one as you finish it. Send me anything I need over Signal / 1Password / encrypted email — not over plain WhatsApp or email.

---

## 1) What's already done (so you know where we are)

- ✅ Sticker album upgraded to **994 total stickers** (48 teams × 18 + 80 Legends + 24 Coca-Cola + 26 special pages)
- ✅ Rare stickers (foil, bronze, silver, gold, special) now have **distinct premium visuals** in the app
- ✅ Checkout flow rebuilt to match the old Mundial26 reference — with your delivery rules:
   - Local Guadalajara: free over $1,000 MXN, else $100
   - Mexico nationwide: free over $2,500 MXN, else $200
   - Pickup at store: free, cash allowed
- ✅ Backend Mercado Pago endpoints **ready** (in TEST stub mode — flips to live when you send creds)
- ✅ Public landing page at https://zona-mundial.vercel.app/
- ✅ Privacy / Terms / Delete-account public pages (Play Store requires these)
- ✅ Admin panel redesigned and moved to `/admin`
- ✅ Local test data + admin user seeded (`admin@cromos26.com` / `Test1234!`)

---

## 2) Mercado Pago — credentials (BIGGEST BLOCKER)

The app can't take payments without these. Steps:

### A. Make sure your MP business account is verified

- Go to https://www.mercadopago.com.mx → log in with the business account that will receive payouts
- Settings → check that RFC, bank account, identity verification are **all green**
- Until verified, MP holds payouts and your money is locked

### B. Create the Cromos 26 application

1. https://www.mercadopago.com.mx/developers/panel
2. **Tus integraciones** → **Crear aplicación**
3. Form:
   - Nombre: `Cromos 26`
   - Solución: **Pagos online (Checkout Pro)**
   - Producto: **Pagos online**
   - Industria: **Coleccionables / Retail**

### C. Get the credentials

Inside the new application, sidebar → **Credenciales**:

**Test (sandbox — safe to share)**

```
MP_ACCESS_TOKEN_TEST = TEST-...
MP_PUBLIC_KEY_TEST   = TEST-...
```

Send via WhatsApp or email — no risk, MP rejects real charges with these.

**Production (LIVE — handle carefully)**

```
MP_ACCESS_TOKEN_PROD = APP_USR-...
MP_PUBLIC_KEY_PROD   = APP_USR-...
```

⚠ These charge real cards. Send via Signal / 1Password / encrypted note — **never plain WhatsApp or email**. If leaked, regenerate immediately from the same panel.

### D. Configure the webhook

Same application → sidebar → **Webhooks** (or "Notificaciones"):

- **URL:** `https://zona-mundial.onrender.com/api/webhooks/mercadopago`
- **Eventos (tick both):**
  - `payment` (created, updated)
  - `merchant_order`
- Save → MP shows a **firma del webhook** / signing secret one time only. Copy it:

```
MP_WEBHOOK_SECRET = <the long string MP shows>
```

Send this too. If you miss it, delete the webhook and recreate it.

### E. Final bundle to send me

```
MP_ACCESS_TOKEN_TEST=...
MP_PUBLIC_KEY_TEST=...
MP_ACCESS_TOKEN_PROD=...
MP_PUBLIC_KEY_PROD=...
MP_WEBHOOK_SECRET=...
```

When I have these I paste them into Render's environment, redeploy, and the app starts accepting real payments.

---

## 3) EAS (Expo) build account — $19 USD on your account

Free tier on my personal Expo account is used up. Resets June 1, but we can't ship until we build the final production AAB / IPA. **Goal: everything billed under your account, nothing attached to my personal account.**

### Recommended path — you own the Expo account

#### A. Create your own Expo account

1. https://expo.dev/signup → use your business email (e.g. `pablo@cromos26.com` or `Pabloddc16@gmail.com`)
2. Verify email
3. Pick a username — suggest `cromos26` or `pabloddc16`
4. **Share the password with me via Signal / 1Password.** I'll log in to set up the project + builds. (You can change the password after launch.)

#### B. Upgrade to Production plan

I can do this for you once I'm logged in — pay $19/mo on your card. Or you do it yourself:
1. Account settings → **Billing**
2. Pick **Production** ($19 USD / month)
3. Add your card

Charges land on your statement, not mine.

#### C. Transfer the existing project to your account

The Cromos 26 EAS project currently lives under my `brankostula` account. Once you're set up, I email Expo support:

- https://expo.dev/contact
- "Please transfer EAS project `732ed138-a83a-41dc-8886-4f8217289d4f` from `brankostula` to `<your new account>`. Current owner consents."
- They migrate the project, build history, OTA channels, and signing credentials in one operation. ~24-48h turnaround.

After transfer, **app.json** `owner` field changes from `brankostula` to your username — one-line edit, I handle.

#### D. I keep developer access via your account

Once the project is yours, you can either:
- Share the password long-term and I work as you, OR
- **Invite me as a team member** — Account → Teams → invite `stulanik@gmail.com` as Developer. Cleaner separation, you keep your password private.

### Backup path — if transfer takes too long and we need to ship NOW

You pay $19 on my existing `brankostula` account (send card via Signal, I add it), I build, we transfer the project after the launch. Same total cost — $19 — only difference is the first invoice shows on my account. Reimburse however you prefer.

### Tell me when ready

The moment account is created + password shared, I trigger the first production build (~25 min on EAS servers). After both stores accept submission, **cancel the $19 plan next month** → total spend $19.

---

## 4) Google Play — service account JSON

Required so I can submit Android builds straight from my machine to Play Console.

### Steps (you do this once)

1. https://play.google.com/console → log in with the account you used to pay the $25 Play developer fee
2. **Setup** → **API access**
3. **Create new service account** → opens Google Cloud
4. Service account name: `cromos26-eas-submit`
5. After it's created, **assign role: Release Manager** (lets the script publish to Internal / Production tracks)
6. Click the service account → **Keys** → **Create new key** → JSON
7. A file downloads: `cromos26-eas-submit-xxxxx.json`
8. Send me that file via Signal / 1Password (it's a private key — treat like a password)

When I have it, I add it to `apps/mobile/google-service-account.json` and `eas submit` works in one command from then on.

---

## 5) Apple App Store — already mostly done

- ✅ Apple Developer Program paid ($99/yr) — Team ID `7D7NLMWLYL` (on your account ✓)
- ✅ App in App Store Connect — App ID `6769002053`
- ✅ Build #7 submitted to TestFlight earlier

### Pending

- ☐ **Check TestFlight status** at https://appstoreconnect.apple.com/
  - App should say **Ready to Test** for Build #7. If still **Processing**, wait it out.
- ☐ **Add testers** — create Internal Testing group, invite yourself + me + 5-10 friends to test before public release
- ☐ When ready for public release, I'll add screenshots, age rating, App Review Information (demo creds) and submit for Apple Review (~1-2 day turnaround)

---

## 6) Questions you haven't answered yet

I'm running with defaults until you confirm. Quick answers unblock real payments + final polish.

### Q1 — Welcome credit amount

Right now: **$100 MXN** off the first order.

Reply: keep $100? Or $50, $150, etc?

### Q2 — Referral rewards

Right now (defaults):
- Inviter gets **$100 MXN** when their friend signs up + buys
- Invitee (the new friend) gets **$50 MXN** off their first order

Reply: keep? Change amounts?

When does the inviter get credited — when friend signs up, or when friend makes first purchase? Currently set to **first purchase** (more common, prevents fake invites).

### Q3 — 20 Legend players (names)

Right now they're placeholders: `Legend 01 · Base / Bronze / Silver / Gold`, `Legend 02 · Base / Bronze / Silver / Gold`, etc.

Reply with the 20 official names if Panini gave you the list. Examples (from past Legends sets):
- Pelé, Maradona, Cruyff, Beckenbauer, Zidane, Ronaldo (R9), Ronaldinho, Messi, Cristiano, Iniesta, Xavi, Modric, Buffon, Yashin, Eusebio, Garrincha, Romario, Roberto Carlos, Cafu, Baggio…

If you don't have the official list yet, I leave the placeholders and we update later.

### Q4 — Coca-Cola promo

I put **24 stickers** in the Coca-Cola section.

- Real count? (Qatar 2022 had ~10-12, the 2026 release might be bigger.)
- Do these come from regular packs or only Coca-Cola promotions / OXXO redemption?
- Is the Coca-Cola partnership signed off? Any logo / colors we need to use to match their brand?

### Q5 — Cash on pickup

Right now: card-only for delivery (paid via Mercado Pago), **cash allowed on pickup**.

Reply: keep cash on pickup? Or card-only everywhere?

### Q6 — Album checklist file (if Panini gave you one)

If Panini sent you a PDF or CSV of all 994 sticker codes (like "MEX01 = Crest", "ARG18 = Player X"), forward it to me. I'll plug the real names into the app instead of `Player 1`, `Player 2` placeholders.

If nothing exists yet, no problem — the structure is correct, only the labels change.

---

## 7) Assets — what we need from you (or what we'll generate)

### Mandatory for stores

| Asset | Size | Status | Needs |
|-------|------|--------|-------|
| App icon | 1024×1024 PNG, no alpha | ⚠ TODO | I can generate via Gemini Nano Banana — confirm the design direction |
| Play Store feature graphic | 1024×500 PNG | ⚠ TODO | Same |
| Phone screenshots (5) | 1080×1920 | ✅ Have | Real screenshots we already used on the website |
| Privacy URL | live | ✅ Done | https://zona-mundial.vercel.app/privacy |
| Delete account URL | live | ✅ Done | https://zona-mundial.vercel.app/delete-account |

### Nice to have

| Asset | Why | Status |
|-------|-----|--------|
| Real product photos (jerseys, balls, trophies) | Boosts store conversion | ⚠ Could use real product shots if you have them — generic icons work for launch |
| Brand banner (we have one, optional) | Marketing materials | ✅ We have one in `/assets/source/` |
| Testimonial photos / quotes | Social proof on landing page | ⚠ Currently using placeholder beta-tester names — replace once real users sign up |

---

## 8) Money summary (what you actually have to pay)

| Item | Amount | When | Why |
|------|--------|------|-----|
| Apple Developer Program | $99 USD / year | Already paid | Required to put any app on iOS |
| Google Play one-time fee | $25 USD | Already paid | Required to publish on Android |
| **EAS Production plan** | **$19 USD / month** | **Pay now** | Build the production app (cancel after launch) |
| Mercado Pago | 0 setup | — | They take a % of each sale, no monthly fee |
| Render hosting (API) | Free tier OK for now | — | Upgrade later when traffic grows ($7/mo for warm server, optional) |
| Supabase (database) | Free tier OK | — | Upgrade later if needed ($25/mo for production tier) |
| Vercel (website) | Free tier OK | — | Stays free unless major traffic |
| Domain (optional) | ~$12 / year | Later | If you want cromos26.com instead of zona-mundial.vercel.app |
| **Estimated total to launch** | **~$19 USD** | This week | Just the EAS build credit |

---

## 9) Launch sequence (after I have your items)

I'll handle these in this order — no further input needed once Items 2-4 above are in my hands:

1. Plug your Mercado Pago credentials into Render
2. Build production Android AAB (~25 min on EAS servers)
3. Build production iOS IPA (~25 min)
4. Upload AAB to Play Console Internal Testing
5. Submit IPA to App Store Connect → TestFlight
6. Add testers to both platforms
7. After 24-48h of testing without bugs: promote to public
   - Play Console: Internal → Closed → Open → Production
   - App Store: TestFlight → Submit for Review → wait Apple review ~1-2 days → live

From "Pablo sent everything" to "app live on both stores": about **4-7 days** total.

---

## 10) Final checklist before you send anything

Tick each one before forwarding:

- ☐ Mercado Pago account verified (RFC + bank + identity all green)
- ☐ MP application "Cromos 26" created
- ☐ TEST credentials copied
- ☐ PROD credentials copied (secure channel ready)
- ☐ Webhook URL added + signing secret copied
- ☐ **Expo account created + Cromos26 organization made**
- ☐ **Production plan $19 paid on the Expo org**
- ☐ **stulanik@gmail.com invited to the org as Developer**
- ☐ Play Console service account JSON downloaded
- ☐ Questions Q1-Q6 answered (or "use defaults" — that works too)
- ☐ TestFlight build #7 status checked

---

## Contact

Ping me when each item lands. I'll start integrating as soon as #2 (Mercado Pago) arrives — that's the biggest blocker. Everything else can be plugged in afterward in any order.

— Branko
