import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cromos 26 — Sticker Album for the 2026 World Cup',
  description:
    'Track your World Cup sticker collection, swap with friends via QR, and order new packs in-app.',
}

const page: React.CSSProperties = {
  background: '#FAF6EE',
  color: '#0B1F15',
  minHeight: '100vh',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  lineHeight: 1.55,
}

const hero: React.CSSProperties = {
  background:
    'linear-gradient(135deg, #006341 0%, #004d31 50%, #003d24 100%)',
  color: '#FAF6EE',
  padding: '64px 20px 80px',
  textAlign: 'center',
}

const heroInner: React.CSSProperties = { maxWidth: 720, margin: '0 auto' }

const ribbon: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(255,209,0,0.15)',
  color: '#FFD100',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  padding: '6px 14px',
  borderRadius: 999,
  marginBottom: 24,
  border: '1px solid rgba(255,209,0,0.25)',
}

const h1: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 900,
  margin: '0 0 16px',
  lineHeight: 1.05,
  letterSpacing: -1,
}

const sub: React.CSSProperties = {
  fontSize: 18,
  opacity: 0.85,
  margin: '0 0 32px',
  maxWidth: 540,
  marginLeft: 'auto',
  marginRight: 'auto',
}

const badgeRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
  flexWrap: 'wrap',
}

const badge: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#FAF6EE',
  fontSize: 13,
  fontWeight: 600,
  padding: '10px 16px',
  borderRadius: 12,
}

const section: React.CSSProperties = { padding: '64px 20px', maxWidth: 980, margin: '0 auto' }
const sectionTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: '0 0 32px',
  textAlign: 'center',
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 20,
}

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 24,
}

const cardIcon: React.CSSProperties = {
  fontSize: 28,
  marginBottom: 12,
  display: 'inline-block',
}

const cardTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 800,
  margin: '0 0 8px',
  color: '#0B1F15',
}

const cardText: React.CSSProperties = {
  fontSize: 14,
  color: '#525252',
  margin: 0,
  lineHeight: 1.5,
}

const faqWrap: React.CSSProperties = {
  background: '#FFFFFF',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  padding: '64px 20px',
}

const faqInner: React.CSSProperties = { maxWidth: 720, margin: '0 auto' }

const faqItem: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  padding: '20px 0',
}

const faqQ: React.CSSProperties = { fontSize: 16, fontWeight: 700, margin: '0 0 8px' }
const faqA: React.CSSProperties = { fontSize: 14, color: '#525252', margin: 0 }

const footer: React.CSSProperties = {
  background: '#0B1F15',
  color: '#9ca3af',
  padding: '40px 20px',
  textAlign: 'center',
  fontSize: 13,
}

const footerLink: React.CSSProperties = {
  color: '#FFD100',
  textDecoration: 'none',
  margin: '0 8px',
}

const disclaimer: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  marginTop: 24,
  maxWidth: 640,
  marginLeft: 'auto',
  marginRight: 'auto',
  lineHeight: 1.6,
}

export default function LandingPage() {
  return (
    <div style={page}>
      <section style={hero}>
        <div style={heroInner}>
          <span style={ribbon}>World Cup 2026 · Sticker Album</span>
          <h1 style={h1}>Cromos 26</h1>
          <p style={sub}>
            Track your sticker collection, find swaps with friends via QR code, and order new packs straight from your phone.
          </p>
          <div style={badgeRow}>
            <div style={badge}>📱 Coming soon on App Store</div>
            <div style={badge}>🤖 Coming soon on Google Play</div>
          </div>
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>What it does</h2>
        <div style={grid}>
          <div style={card}>
            <span style={cardIcon}>📒</span>
            <h3 style={cardTitle}>Track your album</h3>
            <p style={cardText}>
              Tap any sticker to mark it owned, needed, or a duplicate. Your album syncs across all your devices automatically.
            </p>
          </div>
          <div style={card}>
            <span style={cardIcon}>🔄</span>
            <h3 style={cardTitle}>Swap with friends</h3>
            <p style={cardText}>
              Generate a QR code of your extras. Hold it up to a friend&apos;s camera. Instantly see the perfect swap.
            </p>
          </div>
          <div style={card}>
            <span style={cardIcon}>📦</span>
            <h3 style={cardTitle}>Order packs in-app</h3>
            <p style={cardText}>
              Three modes — Delivery, Pickup, or Gift to a friend. Pay securely with Mercado Pago. We never see your card.
            </p>
          </div>
          <div style={card}>
            <span style={cardIcon}>📊</span>
            <h3 style={cardTitle}>Stats &amp; progress</h3>
            <p style={cardText}>
              Completion percentage, missing-sticker count, weekly progress, team-by-team breakdown.
            </p>
          </div>
        </div>
      </section>

      <section style={faqWrap}>
        <div style={faqInner}>
          <h2 style={{ ...sectionTitle, marginBottom: 16 }}>FAQ</h2>

          <div style={faqItem}>
            <p style={faqQ}>Is Cromos 26 free?</p>
            <p style={faqA}>
              Yes. The app is free to download and use. You only pay if you order physical sticker packs.
            </p>
          </div>

          <div style={faqItem}>
            <p style={faqQ}>Does it work without internet?</p>
            <p style={faqA}>
              Your album is cached on your device, so you can mark stickers offline. The app syncs the next time you have signal.
            </p>
          </div>

          <div style={faqItem}>
            <p style={faqQ}>Is this an official FIFA or Panini app?</p>
            <p style={faqA}>
              No. Cromos 26 is an independent collector tool. We are not affiliated with FIFA, Panini, or any official tournament organization.
            </p>
          </div>

          <div style={faqItem}>
            <p style={faqQ}>How do I delete my account?</p>
            <p style={faqA}>
              Open the app, go to Settings → Account → Delete account. Or visit our{' '}
              <a href="/delete-account" style={{ color: '#006341', textDecoration: 'underline' }}>
                deletion page
              </a>{' '}
              for instructions.
            </p>
          </div>

          <div style={faqItem}>
            <p style={faqQ}>How do you handle my data?</p>
            <p style={faqA}>
              We collect the minimum needed for the app to work. We never sell your data and we never use it for advertising. See our{' '}
              <a href="/privacy" style={{ color: '#006341', textDecoration: 'underline' }}>
                Privacy Policy
              </a>{' '}
              for full details.
            </p>
          </div>
        </div>
      </section>

      <footer style={footer}>
        <div>
          <a href="/privacy" style={footerLink}>Privacy</a>·
          <a href="/terms" style={footerLink}>Terms</a>·
          <a href="/delete-account" style={footerLink}>Delete Account</a>·
          <a href="mailto:Pabloddc16@gmail.com" style={footerLink}>Contact</a>·
          <a href="/admin" style={footerLink}>Staff Login</a>
        </div>
        <p style={{ marginTop: 16, fontSize: 12 }}>© 2026 Cromos 26 · All rights reserved.</p>
        <p style={disclaimer}>
          Cromos 26 is an independent collector tool. It is not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any other organization. All third-party trademarks are property of their respective owners.
        </p>
      </footer>
    </div>
  )
}
