'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google'
import { api, storeRT, storeAT } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'

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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, accessToken, refreshToken } = await api.auth.login(email, password)
      storeAT(accessToken)
      storeRT(refreshToken)
      setUser(user)
      router.replace('/admin')
    } catch (err) {
      if (err instanceof TypeError && /fetch/i.test(err.message)) {
        setError('Cannot reach the API. Is the backend running on http://localhost:4000?')
      } else {
        setError(err instanceof Error ? err.message : 'Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`${fraunces.variable} ${manrope.variable} ${mono.variable} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF6EE] px-4 py-12 text-[#0B1F15]`}
      style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
    >
      {/* halftone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, #0B1F15 1px, transparent 1.5px)',
          backgroundSize: '14px 14px',
        }}
      />
      {/* gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(0,99,65,0.6) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(255,209,0,0.55) 0%, transparent 65%)' }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Brand header */}
        <div className="mb-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0B1F15]/55 transition-colors hover:text-[#006341]" style={{ fontFamily: 'var(--font-mono)' }}>
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            Back to site
          </Link>

          <div className="mb-4 inline-flex items-center gap-3">
            <span
              className="grid h-12 w-12 place-items-center rounded-full bg-[#006341] text-2xl font-bold text-[#FFD100]"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              C
            </span>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 30, "opsz" 30' }}
            >
              Cromos 26
            </span>
          </div>

          <h1
            className="text-[clamp(2.5rem,6vw,3.5rem)] font-black leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces)', fontVariationSettings: '"SOFT" 70, "opsz" 100' }}
          >
            <span className="block">Staff</span>
            <span className="block italic text-[#006341]">sign in.</span>
          </h1>
          <p className="mt-3 text-sm text-[#0B1F15]/60">
            Authorized operators only. Customers, please use the mobile app.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border-4 border-[#0B1F15] bg-white p-7 shadow-[8px_8px_0_0_#006341]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-[#0B1F15]/60"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@cromos26.com"
                required
                autoFocus
                className="w-full rounded-lg border-2 border-[#0B1F15]/15 bg-[#FAF6EE] px-4 py-3 text-base outline-none transition-all placeholder:text-[#0B1F15]/30 focus:border-[#006341] focus:bg-white"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B1F15]/60"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Password
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-xs font-semibold text-[#006341] underline-offset-4 transition-colors hover:text-[#0B1F15] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-[#0B1F15]/15 bg-[#FAF6EE] px-4 py-3 pr-12 text-base outline-none transition-all focus:border-[#006341] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#0B1F15]/45 transition-colors hover:bg-[#0B1F15]/5 hover:text-[#0B1F15]"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-3 rounded-lg border-2 border-[#CE1126]/30 bg-[#CE1126]/8 px-4 py-3 text-sm text-[#CE1126]"
                style={{ background: 'rgba(206,17,38,0.08)' }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#0B1F15] px-7 py-4 text-base font-bold text-[#FAF6EE] shadow-[6px_6px_0_0_#006341] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#006341] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0_0_#006341]"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FAF6EE]/30 border-t-[#FAF6EE]" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <p
          className="mt-6 text-center text-[10px] uppercase tracking-[0.25em] text-[#0B1F15]/30"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          © 2026 Cromos 26 · Zona Mundial
        </p>
      </div>
    </div>
  )
}
