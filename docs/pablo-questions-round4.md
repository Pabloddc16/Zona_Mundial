# Questions for Pablo — Round 4

Follow-ups after Round 3 answers. Top 2 unblock the next sprint.

---

## #1 — Auth: Google + Apple OAuth credentials

You picked B (email + Google + Apple) and forced login. To build it I need credentials from your accounts:

**Google Cloud Console**
1. https://console.cloud.google.com → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** three times:
   - **Android** — package: `com.pabloapp.mundial2026`, SHA-1: `D9:B2:04:FF:2F:CA:9C:93:B3:8E:54:18:8A:75:3F:AF:EF:20:7A:EB`
   - **iOS** — bundle ID: `com.pabloapp.mundial2026`
   - **Web** — for backend code-exchange flow, redirect URI: `https://zona-mundial.onrender.com/api/auth/google/callback`
3. Send me the 3 client IDs (Android, iOS, Web) + Web client secret

**Apple Developer**
1. https://developer.apple.com → Identifiers
2. Enable **Sign in with Apple** capability on the existing App ID `com.pabloapp.mundial2026`
3. Create a **Services ID** with identifier `com.pabloapp.mundial2026.signin`
4. Add a **Key** with Sign in with Apple capability — download the `.p8` file
5. Send me: Team ID (already have: `7D7NLMWLYL`), Key ID, the `.p8` file content, and the Services ID

Until both land I can't ship the auth sprint.

---

## #2 — Force-login: how strict?

Two interpretations of "force login first":

- **A) Hard gate** — user can't open the album at all without signing in. Welcome → sign-up/sign-in → app.
- **B) Soft gate** — user lands on welcome → can tap "Continue as guest" → browses album read-only, but the moment they try to mark a sticker, add to cart, or open Profile, they're forced to sign in.

A converts harder, B converts softer but users sample value first. Which one?

---

## #3 — Mi Panini auto-filter — which service?

You picked A (5-second auto filter for the $200 custom-sticker feature). Now I need to pick a generator. Trade-offs:

| Option | Speed | Cost per sticker | Quality |
|--------|-------|------------------|---------|
| **A) Expo native image manipulation** (crop + frame overlay) | <1 sec | $0 | Basic — selfie inside a Panini frame template, no AI face restyling |
| **B) Replicate API** (Stable Diffusion-based stylization) | 5-15 sec | ~$0.05 | Decent — AI restyles face to "Panini sticker art" |
| **C) Stability AI / Google Imagen** | 5-10 sec | ~$0.04 | Premium — best polish but needs Pablo's account |
| **D) Custom-trained model on Replicate** | 5 sec | ~$0.10 + training $50-100 | Most on-brand — needs reference sticker dataset Pablo provides |

At $200/sticker price the per-unit cost (≤$0.10) is rounding error. Pick A if you want it shipped this month, B/C if you want the wow factor, D if you want long-term brand consistency.

---

## #4 — Pickup email — sender address

Pickup-at-store orders email a 6-digit code (you confirmed in R3). What "From" address?

- **A)** `noreply@cromos26.com` (cleanest, needs DNS records once domain registered)
- **B)** `pedidos@zonamundial.mx` (when the new domain goes live)
- **C)** Pablo's existing Gmail or business email (works today, less professional)

Email sender impacts deliverability. Custom domain (A or B) needs SPF + DKIM records — about 5 minutes of DNS work once I have the domain.

---

## Still pending from Round 3 (no action needed — Pablo's already on these)

- Payment error retest with new TEST keys → screenshot if it fails
- Coca-Cola brand kit (logo SVG + HEX palette + typography + guidelines) — promised this week
- Coca-Cola exact sticker count — promised this week
- Bottle-cap redemption channel confirmation
- Photos of physical album for 6 new countries (BIH/SWE/TUR/CZE/IRQ/COD) with player order
- Photo of one section from physical album to confirm 18 vs 20 stickers

---

## Send back

Reply with the option letter (A/B/C/D) where applicable, or the credentials/files where I asked for them. #1 and #2 are the highest priority — they unblock the auth sprint.
