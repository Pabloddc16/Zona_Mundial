# Questions for Pablo — Round 3

Send these in order. Top 3 are most important.

---

## #1 — Auth flow (decides scope of next sprint)

For the app login flow, which option do you want?

- **A)** Email + password only (what we have today)
- **B)** Email + password + Google + Apple (recommended — Apple requires "Sign in with Apple" if we offer Google)
- **C)** All of the above + Facebook

And the welcome screen — should users be able to skip it and browse the album without signing in, or do we force login first?

---

## #2 — Payment error retry (test mode)

Earlier you got an error when paying. Can you:

1. Retry checkout now (we just switched to test Mercado Pago keys)
2. If it fails again, screenshot the exact error message and send

That way I can pinpoint whether it's a credentials issue or a code bug.

---

## #3 — Pickup code

For Pickup-at-store orders, do you want a **4-digit** or **6-digit** pickup code? Currently generating 6 digits. Send the code only in the app after payment, or email/SMS it too?

---

## #4 — Coca-Cola brand kit

Did the Coca-Cola brand kit arrive yet? I need:

1. Official logo as transparent PNG (SVG preferred)
2. Exact color palette (HEX or Pantone codes)
3. Typography if any
4. Brand usage guidelines (min logo padding, allowed backgrounds, etc)

So the album promo section and "Coca-Cola set" button stay on-brand.

---

## #5 — Coca-Cola exact sticker count

How many stickers are in the Coca-Cola promo? I have **24** as a placeholder but the real number changes the album total and the "complete Coca-Cola" page.

---

## #6 — Coca-Cola redemption channel

How do users get Coca-Cola stickers?

- **A)** Only in special Coca-Cola packs sold at OXXO
- **B)** Also appear randomly in regular Panini packs
- **C)** Separate promotion (bottle-cap redemption, etc)

This changes how we surface the section in the app.

---

## #7 — 6 country rosters

For the 6 new album countries (**BIH, SWE, TUR, CZE, IRQ, COD**) I need the official Panini rosters — the 18-20 players per team in the **exact order** they appear in the physical album. Until I get them I'm using placeholders ("Player 1, Player 2…") and will swap them when you send the list.

---

## #8 — Real Star player names

For the "Stars" album section I have 20 players with these short names:

> Messi / Cristiano / Haaland / Yamal / Vinicius / Modric / Salah / Bellingham / Mbappé / Hakimi / Son / Valverde / Doku / A. Davies / L. Díaz / Caicedo / Wirtz / R. Jiménez / Gakpo / Pulisic

Confirm these are the final 20? And if Panini lists any of them with a different display name (e.g. "Cristiano Ronaldo" vs "Cristiano") send me the official spelling.

---

## #9 — Stickers per team

Is it really **20 stickers per national team**, or does it vary (some 18, some 22)? If you can snap a photo of how one team looks in the physical album I can finalize the catalog accurately.

---

## #10 — STAR ORO $2,500 price

Quick check on the Stars pricing: your matrix has **STAR-ORO at $2,500 MXN**. Unusual because the STAR tier usually doesn't reach ORO (GOAT and CRACK do, but STAR normally caps at PLATA). Confirm STAR-ORO SKUs really exist, or was it a typo? Leaving it in the code for now, just need confirmation.

---

## #11 — Mi Panini photo flow

For the "Create your custom sticker" feature ($200), how do we produce them?

- **A)** Automatic filter (app generates the sticker in 5 seconds from your selfie)
- **B)** Human-designed (we hand-design it and ship in 24h)

The two options have very different costs and turnaround times.

---

## #12 — Referral credit redemption rules

Three rules to nail down:

1. Can credit apply to the **whole cart** or only certain product categories?
2. Is there a **minimum balance** to redeem (e.g. need at least $50 accumulated before you can use it)?
3. **Expiration** — does the credit expire (3 months, 1 year, never)?

---

## Send back

Reply with the option letter (A/B/C) where applicable, or short text for the rest. Once these land we can ship the final pre-launch build.
