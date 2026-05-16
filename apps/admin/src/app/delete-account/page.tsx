import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete Account — Cromos 26',
  description: 'How to delete your Cromos 26 account and associated data.',
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
const box: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginTop: 16,
}

export default function DeleteAccountPage() {
  return (
    <div style={css}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        <a href="/" style={{ color: '#006341', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Back</a>

        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '24px 0 8px' }}>Delete your account</h1>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>Cromos 26 — account and data removal request</p>

        <h2 style={h2}>Option 1 — Delete from inside the app (fastest)</h2>
        <ol style={ul}>
          <li>Open the Cromos 26 app on your phone.</li>
          <li>Sign in with the account you want to delete.</li>
          <li>Go to <b>Settings</b> (bottom tab) → <b>Account</b>.</li>
          <li>Tap <b>Delete account</b>.</li>
          <li>Confirm. Deletion is immediate and irreversible.</li>
        </ol>

        <h2 style={h2}>Option 2 — Request deletion by email</h2>
        <p>If you can&apos;t sign in, or you no longer have the app installed, email us:</p>
        <div style={box}>
          <p style={{ margin: 0, fontSize: 16 }}>
            <a href="mailto:stulanik@gmail.com?subject=Delete%20my%20Cromos%2026%20account" style={a}>
              stulanik@gmail.com
            </a>
          </p>
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: '#666' }}>
            Subject line: <i>Delete my Cromos 26 account</i>
            <br />
            Include the email address you registered with so we can find your account.
          </p>
        </div>
        <p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
          We will process the request within 7 days and confirm by reply.
        </p>

        <h2 style={h2}>What gets deleted</h2>
        <ul style={ul}>
          <li>Your account (email, hashed password, username)</li>
          <li>Your album state (owned / needed / duplicate stickers)</li>
          <li>Your trade QR history</li>
          <li>Device tokens and authentication sessions</li>
          <li>Crash logs tied to your account</li>
        </ul>

        <h2 style={h2}>What we keep (and why)</h2>
        <ul style={ul}>
          <li>
            <b>Order records</b> — if you bought physical sticker packs, we keep the invoice (name, address, items, amount) for <b>5 years</b> as required by Mexican tax law (CFF Art. 30).
          </li>
          <li>
            <b>Aggregated, anonymized analytics</b> — counts of total users, total packs sold, etc. These contain no information that identifies you.
          </li>
        </ul>

        <h2 style={h2}>Timing</h2>
        <p>
          In-app deletion is <b>immediate</b>. Email-requested deletion is processed within <b>7 days</b>. Backups containing your data are rotated out within <b>30 days</b> of deletion.
        </p>

        <h2 style={h2}>Questions</h2>
        <p>
          <a href="mailto:stulanik@gmail.com" style={a}>stulanik@gmail.com</a>
        </p>

        <hr style={{ margin: '48px 0 24px', border: 'none', borderTop: '1px solid #e5e7eb' }} />
        <p style={{ fontSize: 12, color: '#888' }}>
          <a href="/privacy" style={a}>Privacy Policy</a> · <a href="/terms" style={a}>Terms of Service</a>
        </p>
      </div>
    </div>
  )
}
