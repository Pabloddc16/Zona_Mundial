# Reply to Branko — Cromos 26 Launch

Hey Branko —

Going down your list. Here are the answers and the plan for the credentials.

## Q1–Q6 answers (locked in)

- **Q1 — Welcome credit:** Keep $100 MXN off the first order. ✅
- **Q2 — Referral rewards:** Change from defaults. Inviter gets **5% of the invitee's first purchase** (paid out when that first purchase actually happens, not on signup — keep the anti-fraud guard). Invitee gets **$100 MXN off when their first order is $1,000 MXN or more** (not a flat $50 on any order).
- **Q3 — Legend names:** I have the official 20 from Panini. Sending you the list in a separate message right after this one.
- **Q4 — Coca-Cola promo:** Partnership is signed. I'll forward you the real sticker count, the brand kit (logo + colors), and the redemption channel (packs vs OXXO) in a separate message. Hold the 24 placeholders until that lands.
- **Q5 — Cash on pickup:** **Card only everywhere.** Kill the cash option on pickup too. Everything routes through Mercado Pago — cleaner books, no register reconciliation.
- **Q6 — Panini master checklist:** I don't have a 994-row CSV from them. Ship with the placeholder labels (Player 1, Player 2…) and we'll patch real names through the admin panel as I get them.

## Credentials & payments — what I'm doing this week

I'm working through the four blockers in this order:

1. **Mercado Pago** — verifying the business account today, then creating the "Cromos 26" app and pulling TEST + PROD + webhook secret. I'll send TEST creds over WhatsApp, PROD + webhook secret over Signal.
2. **EAS production plan** — logging into the stulanik@gmail.com account, putting my card on, upgrading to the $19/mo plan. Will message you the moment it's active so you can kick off the AAB and IPA builds. I'll remove the card after launch.
3. **Google Play service account JSON** — creating the `cromos26-eas-submit` service account, Release Manager role, downloading the JSON, sending it to you over Signal.
4. **TestFlight build #7** — checking status today, setting up the Internal Testing group, inviting you + me + a handful of testers.

## Re: ownership cleanup

Yes to moving everything off your Expo account after launch. Let's do the `eas project:transfer` once the app is live and stable for a week — no rush, but I want my own account holding the keys long-term.

## Anything I'm missing?

If anything in here contradicts what you've already built, flag it before I send the credentials so we don't double back. Otherwise, kicking off Mercado Pago verification now.

— Pablo
