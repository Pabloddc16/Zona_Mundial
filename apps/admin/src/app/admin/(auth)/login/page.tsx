'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, storeRT, storeAT } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trophy, Eye, EyeOff, AlertCircle } from 'lucide-react'

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
      setError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4" style={{ background: 'var(--surface-deep)' }}>
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.77 0.163 70 / 0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.62 0.20 260 / 0.10) 0%, transparent 70%)' }} />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.77 0.163 70 / 0.04) 0%, transparent 60%)' }} />
      </div>

      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative w-full max-w-[400px]">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center">
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, oklch(0.77 0.163 70), oklch(0.65 0.18 50))', boxShadow: '0 0 40px oklch(0.77 0.163 70 / 0.35), 0 8px 24px oklch(0 0 0 / 0.4)' }} />
            <Trophy className="relative h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Pablo Admin
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            World Cup 2026 — Control Panel
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 64px oklch(0 0 0 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
                className="h-10"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--amber)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--amber-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--amber)')}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm" style={{ background: 'oklch(0.63 0.225 27 / 0.10)', border: '1px solid oklch(0.63 0.225 27 / 0.25)', color: 'oklch(0.75 0.18 27)' }}>
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="h-10 w-full font-semibold"
              size="default"
              type="submit"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'oklch(1 0 0 / 0.20)' }}>
          © 2026 Pablo Admin · Zona Mundial
        </p>
      </div>
    </div>
  )
}
