# Cromos 26 — Pablo's Launch Playbook

Four manual tasks. Each one is a copy-paste checklist. Knock them out in this order; total time ~90 minutes spread over a day or two.

---

## Task 1 — Mercado Pago credentials (the big blocker)

**Time:** 30–45 min, plus waiting on identity verification if not already green.

### Step A — Verify the business account
- Open https://www.mercadopago.com.mx and log in with the business account that will receive payouts.
- Go to **Settings → Personal data / Datos de tu cuenta**.
- Confirm all three are green: RFC, bank account (CLABE), identity verification.
- If anything is yellow/red, finish that flow first. Until everything is green, MP holds payouts and the live credentials won't process real charges cleanly.

### Step B — Create the application
- Open https://www.mercadopago.com.mx/developers/panel.
- Click **Tus integraciones → Crear aplicación**.
- Fill in:
  - Nombre: **Cromos 26**
  - Solución: **Pagos online (Checkout Pro)**
  - Producto: **Pagos online**
  - Industria: **Coleccionables / Retail**
- Save.

### Step C — Copy credentials
Inside the new application → sidebar → **Credenciales**.

**TEST (safe to share over WhatsApp):**
```
MP_ACCESS_TOKEN_TEST = TEST-...
MP_PUBLIC_KEY_TEST   = TEST-...
```

**PROD (Signal / 1Password only — never plain WhatsApp or email):**
```
MP_ACCESS_TOKEN_PROD = APP_USR-...
MP_PUBLIC_KEY_PROD   = APP_USR-...
```

### Step D — Webhook
Same application → sidebar → **Webhooks** (or "Notificaciones").

- URL: `https://zona-mundial.onrender.com/api/webhooks/mercadopago`
- Events: tick **payment** (created + updated) and **merchant_order**.
- Save. MP shows the **signing secret** ONCE. Copy it immediately:
```
MP_WEBHOOK_SECRET = <long string>
```
If you miss it: delete the webhook and recreate.

### Step E — Send Branko the bundle
Over Signal:
```
MP_ACCESS_TOKEN_TEST=...
MP_PUBLIC_KEY_TEST=...
MP_ACCESS_TOKEN_PROD=...
MP_PUBLIC_KEY_PROD=...
MP_WEBHOOK_SECRET=...
```

✅ Done when Branko confirms the values are in Render.

---

## Task 2 — EAS Production plan ($19 USD)

**Time:** 5 min.

- Open https://expo.dev/login.
- Sign in:
  - Email: `stulanik@gmail.com`
  - Password: `Mundial2026.`
- Top-right account icon → **Settings → Billing**.
- Pick **Production plan — $19/mo**.
- Add **your** card. Invoice email can stay as stulanik@gmail.com; the charge goes to your card.
- Tell Branko it's live so he can kick the AAB + IPA builds.

🔒 Calendar reminder for **30 days from today**: log back in, **remove the card**, and either downgrade or cancel. Otherwise you get rebilled.

---

## Task 3 — Google Play service account JSON

**Time:** 10 min.

- Open https://play.google.com/console.
- Log in with the account that paid the $25 developer fee.
- Left sidebar → **Setup → API access**.
- Click **Create new service account**. This opens Google Cloud in a new tab.
- In Google Cloud:
  - Service account name: `cromos26-eas-submit`
  - Skip the optional fields, click Done.
- Back in Play Console, find the new service account in the list and click **Grant access**.
- Role: **Release Manager**. Save.
- Click the service account name → **Keys → Add key → Create new key → JSON**.
- A file downloads: `cromos26-eas-submit-xxxxx.json`.
- Send it to Branko over **Signal or 1Password** (it's a private key — treat like a password).

---

## Task 4 — TestFlight check (Apple)

**Time:** 5 min.

- Open https://appstoreconnect.apple.com/.
- Sign in with your Apple Developer account.
- Apps → **Cromos 26** → **TestFlight** tab.
- Find **Build #7**.
- If status is **Ready to Test** → done, move on.
- If status is **Processing** → wait, check again in an hour.
- If status is **Missing Compliance** → click the build, answer the encryption questions (almost always "No, uses only standard encryption"), save.

Then:
- TestFlight → **Internal Testing**.
- **Create New Group** → name it "Cromos 26 — Pre-Launch".
- Add testers by Apple ID email: yourself, Branko (`stulanik@gmail.com`), and 5–10 trusted friends.
- They'll get a TestFlight invite email; tell them to install TestFlight first.

---

## After all four are done

Send Branko one message:
> All four done. MP creds + webhook secret on Signal. EAS upgraded. Service account JSON on Signal. TestFlight #7 is Ready to Test, internal group created.

He'll then:
1. Plug MP creds into Render.
2. Trigger production AAB (~25 min) and IPA (~25 min) on EAS.
3. Submit AAB to Play Console Internal Testing.
4. Push IPA from TestFlight to App Store Review.

**Realistic timeline from "Pablo finishes this playbook" to "app live on both stores": 4–7 days** (Apple review takes 1–2 days, Google is usually faster).

---

## Don't forget after launch

- [ ] Cancel EAS Production plan (set the reminder now).
- [ ] Run `eas project:transfer` with Branko to move ownership off stulanik@gmail.com.
- [ ] Change the `Mundial2026.` password to something from a password manager.
- [ ] Forward Branko the **Legend names list** (Q3) and **Coca-Cola brand kit + real count** (Q4) when you have them.
- [ ] Decide on a custom domain (cromos26.com ~$12/yr) if you want to ditch the vercel.app URL.
