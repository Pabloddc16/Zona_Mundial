import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Pablo App',
  description: 'How Pablo App collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose prose-sm text-tinta">
      <Link href="/" className="text-verde text-sm font-medium mb-6 block">← Back</Link>

      <h1 className="text-2xl font-black text-tinta">Privacy Policy</h1>
      <p className="text-gray-500 text-sm">Last updated: May 12, 2026</p>

      <h2>Who we are</h2>
      <p>
        Pablo App (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this mobile app and website. We are an independent
        collector tools provider. We are not affiliated with, endorsed by, or sponsored by
        FIFA, Panini, or any other sticker manufacturer. All trademarks are property of their
        respective owners.
      </p>
      <p>For privacy questions: stulanik@gmail.com</p>

      <h2>What data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email, password (hashed), optional username.</li>
        <li><strong>Album state:</strong> which stickers you own / need / have duplicates of. Stored
          per-user so you can use the app on multiple devices.</li>
        <li><strong>Orders:</strong> if you buy physical sticker packs, we collect delivery name,
          phone, address, and the order line items.</li>
        <li><strong>Technical data:</strong> device type, OS version, crash logs, IP address (for
          rate limiting and abuse prevention).</li>
        <li><strong>Authentication tokens:</strong> stored encrypted on your device (Keychain on iOS,
          EncryptedSharedPreferences on Android).</li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To run your account and let you sign back in.</li>
        <li>To sync your album across devices.</li>
        <li>To match you with other users for sticker trades (only your username and
          aggregated extras/needed counts are shared, never your email or address).</li>
        <li>To process and ship orders you place.</li>
        <li>To diagnose crashes and improve the app.</li>
      </ul>

      <h2>Third parties we share data with</h2>
      <ul>
        <li><strong>Supabase</strong> (Frankfurt, EU) — database + authentication infrastructure.</li>
        <li><strong>Render</strong> (US) — API server hosting.</li>
        <li><strong>Vercel</strong> (US) — web app + admin panel hosting.</li>
        <li><strong>Expo / EAS</strong> (US) — mobile build pipeline + optional crash reporting.</li>
      </ul>
      <p>
        We never sell your data, and we don&apos;t use it for advertising. We don&apos;t share data with
        FIFA, Panini, or any third-party advertiser.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account + album: as long as your account exists. If you delete your account
        (Settings → Delete account), we permanently wipe all your data within 30 days.
        Orders: kept for 5 years for tax compliance, then deleted.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><strong>Access:</strong> request a copy of your data by emailing us.</li>
        <li><strong>Correction:</strong> change your username/email from inside the app.</li>
        <li><strong>Deletion:</strong> use the in-app &quot;Delete account&quot; button in Settings, or
          email us. Deletion is immediate and irreversible.</li>
        <li><strong>Portability:</strong> request export of your album in JSON via email.</li>
      </ul>

      <h2>Children</h2>
      <p>
        The app is intended for users 13 and older. We do not knowingly collect data from
        children under 13. If you believe a child has created an account, email us and we
        will delete it.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy. The &quot;Last updated&quot; date above will change when we do.
        Significant changes will be announced in-app.
      </p>

      <h2>Contact</h2>
      <p>stulanik@gmail.com</p>
    </div>
  )
}
