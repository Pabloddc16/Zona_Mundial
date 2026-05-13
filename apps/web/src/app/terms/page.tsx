import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Pablo App',
  description: 'Terms governing use of the Pablo App mobile app and website.',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose prose-sm text-tinta">
      <Link href="/" className="text-verde text-sm font-medium mb-6 block">← Back</Link>

      <h1 className="text-2xl font-black text-tinta">Terms of Service</h1>
      <p className="text-gray-500 text-sm">Last updated: May 12, 2026</p>

      <h2>1. Who we are</h2>
      <p>
        Pablo App is an independent sticker collection tracker and store. We are not
        affiliated with, endorsed by, or sponsored by FIFA, Panini, or any other organization.
        All third-party trademarks are property of their respective owners.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 13 years old to use this app. You are responsible for keeping
        your password safe. We may suspend accounts that abuse the service, send spam, or
        violate these terms.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Use the app for fraud or to harass other users</li>
        <li>Scrape or automate the API without permission</li>
        <li>Attempt to circumvent security or rate limits</li>
        <li>Resell our service or wrap it in your own product</li>
        <li>Upload illegal content or trade counterfeit items</li>
      </ul>

      <h2>4. Trades between users</h2>
      <p>
        The app provides QR codes and matching tools to help collectors find each other. We
        do not facilitate the physical exchange, escrow funds, or verify the items being
        traded. Trades happen directly between users at their own risk. We are not liable
        for losses, fraud, or disputes arising from a trade.
      </p>

      <h2>5. Purchases</h2>
      <p>
        Physical sticker packs and albums are sold by us at the prices shown in the app.
        Orders are subject to availability. We may cancel and refund an order if we cannot
        fulfill it. Returns are accepted within 14 days of delivery for unopened packaging.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        Sticker imagery you mark in your album represents physical stickers you own. Tracking
        your collection is your personal record. We do not redistribute copyrighted artwork
        through the app. If you believe content violates your IP rights, email us at
        stulanik@gmail.com.
      </p>

      <h2>7. Termination</h2>
      <p>
        You can delete your account at any time from Settings. We may terminate accounts
        that violate these terms with notice when reasonably possible.
      </p>

      <h2>8. No warranty</h2>
      <p>
        The app is provided &quot;as is&quot; without warranty. We do our best to keep it running but
        do not guarantee uninterrupted service. You use the app at your own risk.
      </p>

      <h2>9. Liability</h2>
      <p>
        To the extent permitted by law, our total liability is limited to the amount you
        paid us in the 12 months before the claim, or USD $50, whichever is higher.
      </p>

      <h2>10. Changes to terms</h2>
      <p>
        We may update these terms. Continued use after a change means you accept the new
        terms. Significant changes will be announced in-app.
      </p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of Mexico.</p>

      <h2>12. Contact</h2>
      <p>stulanik@gmail.com</p>
    </div>
  )
}
