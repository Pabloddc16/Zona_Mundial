import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Cromos 26',
  description: 'How Cromos 26 collects, uses, and protects your data.',
}

const css: React.CSSProperties = {
  background: '#FAF6EE',
  color: '#0B1F15',
  minHeight: '100vh',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  lineHeight: 1.55,
}

export default function PrivacyPage() {
  return (
    <div style={css}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        <a href="/" style={{ color: '#006341', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Back</a>

        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '24px 0 8px' }}>Privacy Policy</h1>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>Last updated: May 15, 2026</p>

        <h2 style={h2}>Who we are</h2>
        <p>
          Cromos 26 (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this mobile app and website. We are an
          independent collector tools provider. We are not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any other sticker manufacturer. All trademarks are property of their respective owners.
        </p>
        <p>For privacy questions: <a href="mailto:stulanik@gmail.com" style={a}>stulanik@gmail.com</a></p>

        <h2 style={h2}>What data we collect</h2>
        <ul style={ul}>
          <li><b>Account data:</b> email, password (hashed by Supabase Auth), optional username.</li>
          <li><b>Album state:</b> which stickers you own / need / have duplicates of. Stored per-user so you can use the app on multiple devices.</li>
          <li><b>Orders:</b> if you buy physical sticker packs, we collect delivery name, phone, address, and the order line items.</li>
          <li><b>Technical data:</b> device type, OS version, crash logs, IP address (for rate limiting and abuse prevention).</li>
          <li><b>Authentication tokens:</b> stored encrypted on your device (Keychain on iOS, EncryptedSharedPreferences on Android).</li>
        </ul>

        <h2 style={h2}>Why we collect it</h2>
        <ul style={ul}>
          <li>To run your account and let you sign back in.</li>
          <li>To sync your album across devices.</li>
          <li>To match you with other users for sticker trades (only your username and aggregated extras/needed counts are shared, never your email or address).</li>
          <li>To process and ship orders you place.</li>
          <li>To diagnose crashes and improve the app.</li>
        </ul>

        <h2 style={h2}>Third parties we share data with</h2>
        <ul style={ul}>
          <li><b>Supabase</b> (EU) — database + authentication infrastructure.</li>
          <li><b>Render</b> (US) — API server hosting.</li>
          <li><b>Vercel</b> (US) — web app + admin panel hosting.</li>
          <li><b>Expo / EAS</b> (US) — mobile build pipeline.</li>
          <li><b>Mercado Pago</b> (LatAm) — payment processing for online orders (handles card data; we never store card numbers).</li>
        </ul>
        <p>
          We never sell your data, and we don&apos;t use it for advertising. We don&apos;t share data with FIFA, Panini, or any third-party advertiser.
        </p>

        <h2 style={h2}>How long we keep it</h2>
        <p>
          Account + album: as long as your account exists. If you delete your account (Settings → Delete account in the app), we permanently wipe all your data within 30 days. Orders: kept for 5 years for tax compliance, then deleted.
        </p>

        <h2 style={h2}>Your rights</h2>
        <ul style={ul}>
          <li><b>Access:</b> request a copy of your data by emailing us.</li>
          <li><b>Correction:</b> change your username/email from inside the app.</li>
          <li><b>Deletion:</b> use the in-app &quot;Delete account&quot; button in Settings, or email us. Deletion is immediate and irreversible.</li>
          <li><b>Portability:</b> request export of your album in JSON via email.</li>
        </ul>

        <h2 style={h2}>Children</h2>
        <p>
          The app is intended for users 13 and older. We do not knowingly collect data from children under 13. If you believe a child has created an account, email us and we will delete it.
        </p>

        <h2 style={h2}>Changes</h2>
        <p>
          We may update this policy. The &quot;Last updated&quot; date above will change when we do. Significant changes will be announced in-app.
        </p>

        <h2 style={h2}>Contact</h2>
        <p>
          <a href="mailto:stulanik@gmail.com" style={a}>stulanik@gmail.com</a>
        </p>

        <hr style={{ margin: '48px 0 24px', border: 'none', borderTop: '1px solid #e5e7eb' }} />
        <p style={{ fontSize: 12, color: '#888' }}>
          <a href="/terms" style={a}>Terms of Service</a>
        </p>
      </div>
    </div>
  )
}

const h2: React.CSSProperties = { fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 10 }
const a: React.CSSProperties = { color: '#006341', textDecoration: 'underline' }
const ul: React.CSSProperties = { paddingLeft: 24, margin: '12px 0' }
