# Pablo App — Project Brief & Proposal

## Overview

Your existing codebase consists of two separate applications built for the Mundial 2026 Panini sticker card business:

1. **Admin Dashboard** — manages orders, inventory, deliveries, POS, customers, and financials
2. **Consumer App** — lets users track their sticker album, buy products, and trade stickers via QR

Both applications are functional at a basic level but require a full professional rewrite to be production-ready, scalable, and available as native mobile apps on iOS and Android.

---

## What the Rewrite Delivers

### Applications (4 total)

| App | Platform | Who uses it |
|-----|----------|-------------|
| **API** | Server (cloud) | Powers all apps — single shared backend |
| **Admin Dashboard** | Web (browser) | You and your team — orders, inventory, analytics |
| **Consumer Web App** | Web (browser + PWA) | Your customers |
| **Mobile App** | iOS + Android | Your customers (native app store app) |

### Key improvements over current state

- **Single database** — both apps currently use separate disconnected databases; rewrite connects everything
- **Proper login system** — current app has security gaps; rewrite uses industry-standard auth (Supabase Auth) with 2FA, OAuth, password reset
- **Mobile apps** — native iOS and Android apps (currently web-only)
- **Global payments** — adding Stripe for international customers alongside existing Mercado Pago for LATAM
- **Missing features completed** — returns/refunds (currently broken), invoice generation, user management, deliverer GPS tracking, push notifications
- **Security fixes** — payment webhook validation, CSRF protection, proper role permissions

---

## Timeline

The project is broken into 5 phases:

| Phase | What gets built | Duration |
|-------|----------------|----------|
| **0 — Foundation** | Project structure, database migration, shared code | 2 weeks |
| **1 — Backend API** | New server — all endpoints, security fixes, missing features | 4 weeks |
| **2 — Admin Dashboard** | Full admin rewrite in React — all 12 screens | 5 weeks |
| **3 — Consumer Web App** | Full consumer app rewrite | 3 weeks |
| **4 — Mobile App** | iOS + Android app via Expo/React Native | 6 weeks |
| **5 — QA & App Store** | Testing, polish, App Store + Google Play submission | 3 weeks |
| **Total** | | **~23 weeks (~6 months)** |

> These estimates assume full-time work (40 hrs/week). Part-time (20 hrs/week) doubles the timeline to ~12 months.

### App Store timelines (outside our control)

Once the mobile app is submitted:

- **Apple App Store**: 24–48 hours average review time. Apple Developer account required ($99/year, paid by client).
- **Google Play Store**: 3–7 days average review time. Google Play Developer account required ($25 one-time, paid by client).
- If rejected: +3–7 days per revision round. For a card collecting/sticker app (no gambling, no adult content), rejection is unlikely.

**Realistic date from submission to live in stores: 1–2 weeks.**

---

## What's Needed From You

To start work, the following are required:

- [ ] Access to existing repositories (GitHub or zip)
- [ ] Supabase project (free tier works to start — you create it, share credentials)
- [ ] Stripe account (for global payments)
- [ ] Mercado Pago credentials (already have, need to share)
- [ ] Apple Developer account ($99/year) — needed before mobile phase
- [ ] Google Play Developer account ($25 one-time) — needed before mobile phase
- [ ] Domain name(s) for web apps (if you have them)
- [ ] Any brand assets — logo, color preferences, imagery

---

## Questions for You

Please answer the following so we can finalize the agreement and start work.

---

### Project Scope

**1. Priority order — which do you need first?**
- [ ] Admin dashboard (internal tool — your team)
- [ ] Consumer web app (customers)
- [ ] Mobile app (iOS + Android)
- [ ] All at the same time

**2. Are there features not currently in either app that you want added?**
*(e.g. loyalty program, referral rewards UI, specific reports, integrations with other tools)*

_______________________________________________
_______________________________________________

**3. Do you want the CFDI (Mexican invoice) feature included, or can that be deferred to a later phase?**
- [ ] Include it (adds ~1 week to Phase 1)
- [ ] Defer it — not needed yet

**4. My Panini (custom printed cards) — do you have a print vendor already, or does that workflow need to be figured out?**
- [ ] Yes, I have a print vendor (please share their API/contact)
- [ ] No, still figuring that out — defer for now

---

### Payment Structure

**5. How would you like to structure payment?**

- [ ] **Fixed price per phase** — we agree a price for each phase before it starts; you pay on delivery
- [ ] **Hourly rate** — I track hours, invoice weekly or bi-weekly
- [ ] **Revenue percentage** — I take X% of app revenue for Y months/years
- [ ] **Hybrid** — combination (e.g. reduced hourly + smaller percentage)

**6. If revenue percentage — please clarify:**

What percentage are you offering? _______________

On which revenue streams?
- [ ] Consumer app orders (sticker packs, albums, products)
- [ ] My Panini custom cards
- [ ] Wholesale sales
- [ ] All revenue
- [ ] Other: _______________

For how long? _______________

Is there a cap (maximum total payout)? _______________

**7. If fixed price or hourly — what is your budget range for the full project?**
*(This helps scope priorities if budget is limited)*

_______________________________________________

**8. Payment schedule preference:**
- [ ] Pay per phase (pay when phase is delivered)
- [ ] Monthly retainer
- [ ] 50% upfront, 50% on completion
- [ ] Milestone-based (we define milestones together)

---

### Logistics

**9. How do you prefer to communicate and track progress?**
- [ ] WhatsApp / Telegram updates
- [ ] Weekly video call
- [ ] GitHub issues / project board
- [ ] Email updates
- [ ] Other: _______________

**10. Do you need a formal contract / NDA, or is a written agreement over message sufficient?**
- [ ] Formal contract required
- [ ] Written agreement over message is fine

**11. Who else is involved on your side?** *(designer, other developers, business partner who needs to approve things)*

_______________________________________________
_______________________________________________

---

## Notes

- All code will be written by me and owned by you upon full payment.
- Existing code will be preserved — the rewrite will be done in a new repository alongside the originals, not replacing them until ready.
- Any third-party service costs (Supabase, Vercel, Render, Expo EAS, Sentry, Stripe fees, Apple/Google accounts) are paid by you directly — they are not included in my fee.

---

*Please fill in what you can and send back. Happy to jump on a call to go through anything that needs discussion.*
