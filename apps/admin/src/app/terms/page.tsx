import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Cromos 26',
  description: 'Terms governing use of the Cromos 26 app and website.',
}

const css: React.CSSProperties = {
  background: '#FAF6EE',
  color: '#0B1F15',
  minHeight: '100vh',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  lineHeight: 1.55,
}

const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 10 }
const a: React.CSSProperties = { color: '#006341', textDecoration: 'underline' }
const ul: React.CSSProperties = { paddingLeft: 24, margin: '12px 0' }

export default function TermsPage() {
  return (
    <div style={css}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        <a href="/" style={{ color: '#006341', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Back</a>

        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '24px 0 8px' }}>Terms of Service</h1>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>Last updated: May 15, 2026</p>

        <h2 style={h2}>1. Who we are</h2>
        <p>
          Cromos 26 is an independent sticker collection tracker and store. We are not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any other organization. All third-party trademarks are property of their respective owners.
        </p>

        <h2 style={h2}>2. Your account</h2>
        <p>
          You must be at least 13 years old to use this app. You are responsible for keeping your password safe. We may suspend accounts that abuse the service, send spam, or violate these terms.
        </p>

        <h2 style={h2}>3. Acceptable use</h2>
        <p>You agree NOT to:</p>
        <ul style={ul}>
          <li>Use the app for fraud or to harass other users</li>
          <li>Scrape or automate the API without permission</li>
          <li>Attempt to circumvent security or rate limits</li>
          <li>Resell our service or wrap it in your own product</li>
          <li>Upload illegal content or trade counterfeit items</li>
        </ul>

        <h2 style={h2}>4. Trades between users</h2>
        <p>
          The app provides QR codes and matching tools to help collectors find each other. We do not facilitate the physical exchange, escrow funds, or verify the items being traded. Trades happen directly between users at their own risk. We are not liable for losses, fraud, or disputes arising from a trade.
        </p>

        <h2 style={h2}>5. Purchases</h2>
        <p>
          Physical sticker packs and albums are sold by us at the prices shown in the app. Orders are subject to availability. We may cancel and refund an order if we cannot fulfill it. Returns are accepted within 14 days of delivery for unopened packaging. Payments are processed by Mercado Pago — we never see or store your card number.
        </p>

        <h2 style={h2}>6. Intellectual property</h2>
        <p>
          Sticker imagery you mark in your album represents physical stickers you own. Tracking your collection is your personal record. We do not redistribute copyrighted artwork through the app. If you believe content violates your IP rights, email us at <a href="mailto:stulanik@gmail.com" style={a}>stulanik@gmail.com</a>.
        </p>

        <h2 style={h2}>7. Termination</h2>
        <p>
          You can delete your account at any time from Settings inside the app. We may terminate accounts that violate these terms with notice when reasonably possible.
        </p>

        <h2 style={h2}>8. No warranty</h2>
        <p>
          The app is provided &quot;as is&quot; without warranty. We do our best to keep it running but do not guarantee uninterrupted service. You use the app at your own risk.
        </p>

        <h2 style={h2}>9. Liability</h2>
        <p>
          To the extent permitted by law, our total liability is limited to the amount you paid us in the 12 months before the claim, or USD $50, whichever is higher.
        </p>

        <h2 style={h2}>10. Changes to terms</h2>
        <p>
          We may update these terms. Continued use after a change means you accept the new terms. Significant changes will be announced in-app.
        </p>

        <h2 style={h2}>11. Governing law</h2>
        <p>These terms are governed by the laws of Mexico.</p>

        <h2 style={h2}>12. Contact</h2>
        <p><a href="mailto:stulanik@gmail.com" style={a}>stulanik@gmail.com</a></p>

        <hr style={{ margin: '48px 0 24px', border: 'none', borderTop: '1px solid #e5e7eb' }} />
        <p style={{ fontSize: 12, color: '#888' }}>
          <a href="/privacy" style={a}>Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
