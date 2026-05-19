import type { Metadata } from 'next'
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Cromos 26 — Track. Trade. Triumph.',
  description:
    'The 2026 FIFA World Cup sticker album, reimagined. Track your collection, swap doubles via QR with friends, and order packs in-app.',
  icons: { icon: '/logo.jpg', apple: '/logo.jpg' },
  openGraph: {
    title: 'Cromos 26 — Track. Trade. Triumph.',
    description:
      'The 2026 World Cup sticker album, reimagined. Track. Trade. Triumph.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Cromos 26' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cromos 26 — Track. Trade. Triumph.',
    description: 'The 2026 World Cup sticker album, reimagined.',
    images: ['/og.png'],
  },
}

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const STEPS = [
  {
    n: '01',
    title: 'Mark your stickers',
    body: 'Tap each sticker as you stick it in your physical album. The grid fills up, the missing ones surface to the top.',
    img: '/step-album.png',
    rotate: '-3deg',
  },
  {
    n: '02',
    title: 'Generate a QR',
    body: 'Your extras and your needs encoded into one QR. Hold it up. A friend scans. Matches appear instantly.',
    img: '/step-qr-swap.png',
    rotate: '2deg',
  },
  {
    n: '03',
    title: 'Order a pack',
    body: 'Out of stickers at midnight? Delivery, pickup, or gift to a friend. Mercado Pago handles the card. We never see it.',
    img: '/step-pack-order.png',
    rotate: '-2deg',
  },
]

const FEATURES = [
  {
    eyebrow: 'The album',
    title: 'Every sticker, every team, in your pocket.',
    body:
      'Owned, missing, duplicates — three states. One tap. Filter by team, region, or special set. See the gaps. Close the gaps.',
    img: '/feature-album.jpeg',
    align: 'right' as const,
  },
  {
    eyebrow: 'The swap',
    title: 'Find the trade in three seconds.',
    body:
      'Hold up your QR. A camera scans. The app shows exactly which of your doubles plug exactly which of their gaps. Both win. No spreadsheets, no chats, no waiting.',
    img: '/feature-swap.jpeg',
    align: 'left' as const,
  },
  {
    eyebrow: 'The store',
    title: 'Packs at midnight, packs as gifts.',
    body:
      'Delivery to your door. Pickup at the store. Or send a pack to a friend with a personal note. Three modes, one tap each.',
    img: '/feature-store.jpeg',
    align: 'right' as const,
  },
  {
    eyebrow: 'The stats',
    title: 'Numbers that motivate, not nag.',
    body:
      'Completion percentage. Missing-sticker count. Which teams you are closest to finishing. Weekly progress. Match-day reminders for when rare stickers tend to surface.',
    img: '/feature-stats.jpeg',
    align: 'left' as const,
  },
]

const TESTIMONIALS = [
  {
    quote:
      'I finished my 2022 album with three different chat groups. With Cromos 26, I would have finished it with one app.',
    name: 'Adriana M.',
    role: 'Beta tester · Mexico City',
    tape: '#FFD100',
    rotate: '-1.5deg',
  },
  {
    quote:
      'The QR swap is the trick. You stop chatting. You start trading. Five-second matches.',
    name: 'Diego R.',
    role: 'Beta tester · Guadalajara',
    tape: '#CE1126',
    rotate: '1deg',
  },
  {
    quote:
      'My kid stopped asking me for pesos for packs. He just opens the app and shows me what he needs.',
    name: 'Carla S.',
    role: 'Beta tester · Monterrey',
    tape: '#006341',
    rotate: '-0.5deg',
  },
]

const FAQ = [
  {
    q: 'Is Cromos 26 free?',
    a: 'Yes. The app is free to download and free to use. You only pay if you choose to order physical sticker packs from the in-app store.',
  },
  {
    q: 'Is this an official FIFA or Panini app?',
    a: 'No. Cromos 26 is an independent collector tool, not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any official tournament organization. All third-party trademarks remain property of their respective owners.',
  },
  {
    q: 'How does the QR swap work?',
    a: 'Open the Swap tab and tap "My Offer." The app generates a QR encoding your duplicate stickers and your missing ones. A friend scans it with their camera. The app shows them which of their doubles complete your gaps and vice versa. You both hand over physical stickers right there.',
  },
  {
    q: 'Does the app work offline?',
    a: 'The album is cached on your device. You can mark stickers, view your collection, and even prepare your QR offline. The next time you have signal, everything syncs.',
  },
  {
    q: 'Do you ship outside Mexico?',
    a: 'Right now, delivery is Mexico-only. Pickup at our partner stores is also Mexico-only. We are evaluating expansion based on demand — sign up below to be notified when your region opens.',
  },
  {
    q: 'How do you handle my data?',
    a: 'We collect the minimum needed: email, username, and your album state. We never sell your data and never use it for advertising. Payments go through Mercado Pago — we never see your card number. Full details in our Privacy Policy.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. From inside the app: Settings → Account → Delete account. Or visit our Delete Account page. Deletion is immediate, irreversible, and wipes all your collection data within 30 days from backups.',
  },
  {
    q: 'When does Cromos 26 launch?',
    a: 'iOS via TestFlight and Android via Internal Testing in mid-2026. Public launch tracks the official sticker album release.',
  },
  {
    q: 'How can I become a beta tester?',
    a: 'Email us at Pabloddc16@gmail.com with the subject "Beta tester" and which platform you want (iOS or Android). We add testers in batches.',
  },
  {
    q: 'Who runs Cromos 26?',
    a: 'Two collectors based in Mexico who got tired of losing track of which stickers they had. Independent, self-funded, no investors.',
  },
]

export default function LandingPage() {
  return (
    <div
      className={`${fraunces.variable} ${manrope.variable} ${mono.variable} min-h-screen bg-[#FAF6EE] text-[#0B1F15]`}
      style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
    >
      {/* ── Halftone backdrop overlay ───────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, #0B1F15 1px, transparent 1.5px)',
          backgroundSize: '14px 14px',
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#0B1F15]/10 bg-[#FAF6EE]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <a href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Cromos 26"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0B1F15]/10"
            />
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 30, "opsz" 30' }}
            >
              Cromos 26
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#how" className="transition-colors hover:text-[#006341]">How it works</a>
            <a href="#features" className="transition-colors hover:text-[#006341]">Features</a>
            <a href="#faq" className="transition-colors hover:text-[#006341]">FAQ</a>
            <a
              href="#get"
              className="rounded-full bg-[#0B1F15] px-5 py-2 text-[#FAF6EE] transition-all hover:-translate-y-0.5 hover:bg-[#006341] hover:shadow-lg"
            >
              Get the app
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:pt-24 md:pb-32 md:gap-16">
          {/* Left */}
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0B1F15]/15 bg-white/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#CE1126]" />
              2026 World Cup · USA · Canada · Mexico
            </div>

            <h1
              className="font-serif text-[clamp(3.5rem,8vw,7rem)] font-black leading-[0.92] tracking-tight"
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontVariationSettings: '"SOFT" 80, "opsz" 144',
              }}
            >
              <span className="block">Track.</span>
              <span className="block italic text-[#006341]">Trade.</span>
              <span className="block">Triumph.</span>
            </h1>

            <p className="mt-8 max-w-md text-lg leading-relaxed text-[#0B1F15]/70">
              The 2026 World Cup sticker album, reimagined. Tap to mark your collection. Hold up a QR to swap with anyone. Order packs without leaving the couch.
            </p>

            <div id="get" className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="group relative inline-flex items-center gap-3 rounded-full bg-[#0B1F15] px-7 py-4 text-base font-semibold text-[#FAF6EE] shadow-[6px_6px_0_0_#006341] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#006341]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                App Store
                <span className="text-[#FFD100]">·</span>
                Soon
              </a>
              <a
                href="#"
                className="group relative inline-flex items-center gap-3 rounded-full border-2 border-[#0B1F15] bg-[#FAF6EE] px-7 py-4 text-base font-semibold text-[#0B1F15] shadow-[6px_6px_0_0_#0B1F15] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#0B1F15]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.61 1.81L13.17 12 3.61 22.19c-.39-.21-.65-.62-.65-1.09V2.9c0-.47.26-.88.65-1.09zM14.59 13.42l2.55 2.55-12.51 7.16 9.96-9.71zM21 12c0 .39-.18.78-.55.99l-3.32 1.91-2.74-2.9 2.74-2.9 3.32 1.91c.37.21.55.6.55.99zM4.63.78l12.51 7.16-2.55 2.55L4.63.78z"/></svg>
                Google Play
                <span className="text-[#006341]">·</span>
                Soon
              </a>
            </div>

            {/* Stat strip */}
            <div
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-[#0B1F15]/15 pt-6 text-[10px] uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <div>
                <div className="text-2xl font-bold text-[#0B1F15]" style={{ fontFamily: 'var(--font-fraunces)' }}>670</div>
                <div className="text-[#0B1F15]/55">stickers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0B1F15]" style={{ fontFamily: 'var(--font-fraunces)' }}>48</div>
                <div className="text-[#0B1F15]/55">teams</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0B1F15]" style={{ fontFamily: 'var(--font-fraunces)' }}>3</div>
                <div className="text-[#0B1F15]/55">host cities</div>
              </div>
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 60% 40%, rgba(0,99,65,0.18), transparent 60%)',
              }}
            />
            {/* Gold ribbon FREE */}
            <div
              className="absolute -left-2 top-8 z-20 -rotate-12 rounded-sm bg-[#FFD100] px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#0B1F15] shadow-md"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              FREE · No ads
            </div>

            {/* Phone */}
            <div
              className="relative rotate-[3deg] transition-transform duration-500 hover:rotate-0"
              style={{ filter: 'drop-shadow(20px 30px 40px rgba(11,31,21,0.25))' }}
            >
              <div className="overflow-hidden rounded-[3.5rem] border-[10px] border-[#0B1F15] bg-[#0B1F15]">
                <Image
                  src="/hero-phone.png"
                  alt="Cromos 26 app preview"
                  width={520}
                  height={1080}
                  unoptimized
                  className="block h-auto w-full object-cover"
                  style={{ transform: 'scale(1.08) translateX(12px)' }}
                  priority
                />
              </div>
              {/* Sticker accents */}
              <div className="absolute -right-6 top-1/3 -rotate-6 rounded-full border-4 border-[#FFD100] bg-[#FAF6EE] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0B1F15] shadow-lg">
                NEW
              </div>
              <div className="absolute -left-8 bottom-24 rotate-3 rounded-md bg-[#CE1126] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FAF6EE] shadow-lg">
                #142 RARE
              </div>
            </div>
          </div>
        </div>

        {/* marquee ribbon */}
        <div className="border-y-2 border-[#0B1F15] bg-[#0B1F15] py-3 text-[#FAF6EE]">
          <div
            className="flex animate-[marquee_28s_linear_infinite] gap-12 whitespace-nowrap text-sm font-bold uppercase tracking-[0.3em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="flex items-center gap-12">
                <span>Track every sticker</span>
                <span className="text-[#FFD100]">★</span>
                <span>Trade with anyone</span>
                <span className="text-[#FFD100]">★</span>
                <span>Order packs in-app</span>
                <span className="text-[#FFD100]">★</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="mb-16 max-w-2xl">
          <p
            className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#006341]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            · 01 · How it works
          </p>
          <h2
            className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 60, "opsz" 100' }}
          >
            From <em className="text-[#006341]">empty album</em> to <em className="italic text-[#CE1126]">complete</em> in three moves.
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="group relative"
              style={{ transform: `rotate(${s.rotate})` }}
            >
              <div className="rounded-2xl border-4 border-[#0B1F15] bg-white p-4 shadow-[8px_8px_0_0_#006341] transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-2">
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="text-6xl font-black leading-none text-[#0B1F15]"
                    style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 30' }}
                  >
                    {s.n}
                  </span>
                  <span className="rounded-full border-2 border-[#0B1F15] px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                    Step
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg bg-[#FAF6EE]">
                  <Image src={s.img} alt={s.title} width={640} height={1280} unoptimized className="h-64 w-full object-cover" />
                </div>
                <h3
                  className="mt-6 text-2xl font-bold leading-tight tracking-tight"
                  style={{ fontFamily: 'var(--font-fraunces)' }}
                >
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0B1F15]/70">{s.body}</p>
              </div>
              {/* connector arrow desktop only */}
              {i < STEPS.length - 1 && (
                <div className="absolute -right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rotate-12 items-center justify-center md:flex">
                  <svg viewBox="0 0 24 24" className="h-full w-full text-[#0B1F15]/30" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 bg-[#0B1F15] py-24 text-[#FAF6EE] md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, #FFD100 1px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-20 max-w-2xl">
            <p
              className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#FFD100]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              · 02 · What it does
            </p>
            <h2
              className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 70, "opsz" 100' }}
            >
              Four tools. <em className="italic text-[#FFD100]">One album.</em>
            </h2>
          </div>

          <div className="space-y-32">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`grid items-center gap-12 md:gap-20 ${
                  f.align === 'left'
                    ? 'md:grid-cols-[0.9fr_1.1fr]'
                    : 'md:grid-cols-[1.1fr_0.9fr]'
                }`}
              >
                {/* phone */}
                <div className={f.align === 'left' ? 'md:order-1' : 'md:order-2'}>
                  <div
                    className={`relative inline-block ${
                      f.align === 'left' ? 'rotate-[-3deg]' : 'rotate-[3deg]'
                    }`}
                    style={{ filter: 'drop-shadow(15px 20px 30px rgba(0,0,0,0.4))' }}
                  >
                    <div className="rounded-[2.5rem] border-[8px] border-[#FAF6EE] bg-[#FAF6EE] p-1">
                      <Image
                        src={f.img}
                        alt={f.title}
                        width={720}
                        height={1440}
                        unoptimized
                        className="rounded-[1.8rem]"
                      />
                    </div>
                  </div>
                </div>

                {/* text */}
                <div className={f.align === 'left' ? 'md:order-2' : 'md:order-1'}>
                  <span
                    className="mb-4 inline-block text-7xl font-black leading-none text-[#FFD100]"
                    style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 30' }}
                  >
                    0{i + 1}
                  </span>
                  <p
                    className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#FFD100]/80"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {f.eyebrow}
                  </p>
                  <h3
                    className="mb-6 text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-tight"
                    style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 60' }}
                  >
                    {f.title}
                  </h3>
                  <p className="max-w-md text-lg leading-relaxed text-[#FAF6EE]/75">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING / FREE CALLOUT ──────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="relative overflow-hidden rounded-3xl border-4 border-[#0B1F15] bg-[#006341] p-10 text-[#FAF6EE] shadow-[16px_16px_0_0_#0B1F15] md:p-16">
          {/* gold ribbon */}
          <div
            className="absolute -right-12 top-10 rotate-12 bg-[#FFD100] px-16 py-2 text-sm font-black uppercase tracking-[0.3em] text-[#0B1F15] shadow-md"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            FREE
          </div>

          <div className="relative max-w-2xl">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#FFD100]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              · 03 · How much
            </p>
            <h2
              className="mb-6 text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 70' }}
            >
              The app is <em className="italic text-[#FFD100]">free.</em>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-[#FAF6EE]/85">
              You pay only for physical sticker packs if you order them. No ads. No subscription. No upsells. No data sales. We make money the old-fashioned way — by selling stickers.
            </p>
            <ul className="space-y-2 text-base">
              {['No advertising, ever', 'No subscription tiers', 'No tracking SDKs', 'Delete your account in one tap'].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FFD100] text-[#0B1F15]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="mb-16 max-w-2xl">
          <p
            className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#006341]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            · 04 · From the field
          </p>
          <h2
            className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 60' }}
          >
            What <em className="italic text-[#006341]">collectors</em> are saying.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              className="group relative rounded-2xl border-2 border-[#0B1F15]/15 bg-white p-8 shadow-[8px_8px_0_0_rgba(11,31,21,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_rgba(11,31,21,0.12)]"
              style={{ transform: `rotate(${t.rotate})` }}
            >
              {/* washi tape */}
              <div
                aria-hidden
                className="absolute -top-3 left-1/2 h-7 w-20 -translate-x-1/2 -rotate-3 opacity-90 shadow-sm"
                style={{
                  background: `repeating-linear-gradient(45deg, ${t.tape} 0px, ${t.tape} 6px, rgba(255,255,255,0.4) 6px, rgba(255,255,255,0.4) 10px)`,
                }}
              />
              <svg className="mb-5 h-6 w-6 text-[#006341]" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 6c-3 0-5 2-5 5 0 2 1 4 4 5l-1 4c4-1 7-5 7-9 0-3-2-5-5-5zm9 0c-3 0-5 2-5 5 0 2 1 4 4 5l-1 4c4-1 7-5 7-9 0-3-2-5-5-5z"/></svg>
              <blockquote
                className="mb-6 text-lg leading-snug text-[#0B1F15]"
                style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 60' }}
              >
                {t.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-full bg-[#006341] text-sm font-bold text-[#FAF6EE]"
                  style={{ fontFamily: 'var(--font-fraunces)' }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-[#0B1F15]/55">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative z-10 border-y-4 border-[#0B1F15] bg-[#FAF6EE]">
        <div className="mx-auto max-w-4xl px-6 py-24 md:px-10 md:py-32">
          <div className="mb-16">
            <p
              className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#006341]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              · 05 · Questions
            </p>
            <h2
              className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 60' }}
            >
              Things people <em className="italic text-[#006341]">ask.</em>
            </h2>
          </div>

          <div className="divide-y divide-[#0B1F15]/15">
            {FAQ.map((item, i) => (
              <details key={i} className="group py-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <span className="flex gap-4">
                    <span
                      className="shrink-0 text-sm font-bold text-[#006341]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="text-xl font-bold leading-snug tracking-tight md:text-2xl"
                      style={{ fontFamily: 'var(--font-fraunces)' }}
                    >
                      {item.q}
                    </span>
                  </span>
                  <span className="shrink-0 transition-transform duration-200 group-open:rotate-45">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                </summary>
                <p className="mt-4 pl-10 text-base leading-relaxed text-[#0B1F15]/70">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-center md:px-10">
        <h2
          className="text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.92] tracking-tight"
          style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 80, "opsz" 144' }}
        >
          One album.<br />
          <em className="italic text-[#006341]">One world cup.</em><br />
          One app.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-3 rounded-full bg-[#0B1F15] px-7 py-4 text-base font-semibold text-[#FAF6EE] shadow-[6px_6px_0_0_#006341] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#006341]"
          >
            Notify me on App Store
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-3 rounded-full border-2 border-[#0B1F15] px-7 py-4 text-base font-semibold text-[#0B1F15] shadow-[6px_6px_0_0_#0B1F15] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#0B1F15]"
          >
            Notify me on Google Play
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 bg-[#0B1F15] text-[#FAF6EE]/85">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-4 md:px-10">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Cromos 26"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[#FFD100]/30"
              />
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                Cromos 26
              </span>
            </div>
            <p className="max-w-sm text-sm text-[#FAF6EE]/60">
              An independent sticker album tracker for the 2026 FIFA World Cup. Made in Mexico by two collectors.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#FFD100]" style={{ fontFamily: 'var(--font-mono)' }}>Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-[#FFD100]">Features</a></li>
              <li><a href="#how" className="hover:text-[#FFD100]">How it works</a></li>
              <li><a href="#faq" className="hover:text-[#FFD100]">FAQ</a></li>
              <li><a href="#get" className="hover:text-[#FFD100]">Get the app</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#FFD100]" style={{ fontFamily: 'var(--font-mono)' }}>Legal &amp; Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/privacy" className="hover:text-[#FFD100]">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#FFD100]">Terms of Service</a></li>
              <li><a href="/delete-account" className="hover:text-[#FFD100]">Delete account</a></li>
              <li><a href="mailto:Pabloddc16@gmail.com" className="hover:text-[#FFD100]">Pabloddc16@gmail.com</a></li>
              <li><a href="/admin" className="text-[#FAF6EE]/30 hover:text-[#FAF6EE]/60">Staff login</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#FAF6EE]/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-xs text-[#FAF6EE]/45 md:flex-row md:items-center md:justify-between md:px-10">
            <span style={{ fontFamily: 'var(--font-mono)' }}>© 2026 Cromos 26. All rights reserved.</span>
            <span className="max-w-2xl md:text-right">
              Cromos 26 is an independent collector tool. Not affiliated with, endorsed by, or sponsored by FIFA, Panini, or any official tournament organization. All third-party trademarks are property of their respective owners.
            </span>
          </div>
        </div>
      </footer>

      {/* marquee + reveal keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        details summary::-webkit-details-marker { display: none; }
        details[open] summary svg { color: #006341; }
      `}</style>
    </div>
  )
}
