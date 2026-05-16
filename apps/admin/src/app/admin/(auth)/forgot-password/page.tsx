'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trophy, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4" style={{ background: 'var(--surface-deep)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.77 0.163 70 / 0.10) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.62 0.20 260 / 0.08) 0%, transparent 70%)' }} />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center">
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, oklch(0.77 0.163 70), oklch(0.65 0.18 50))', boxShadow: '0 0 40px oklch(0.77 0.163 70 / 0.35), 0 8px 24px oklch(0 0 0 / 0.4)' }} />
            <Trophy className="relative h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Reset Password</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>We&apos;ll send you a recovery link</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 64px oklch(0 0 0 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.06)' }}>
          {sent ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'oklch(0.72 0.19 145 / 0.12)', border: '1px solid oklch(0.72 0.19 145 / 0.25)' }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: 'oklch(0.72 0.19 145)' }} />
              </div>
              <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Email sent</h2>
              <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                If <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong> exists in the system, you&apos;ll receive a recovery link within a few minutes.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm" style={{ background: 'oklch(0.63 0.225 27 / 0.10)', border: '1px solid oklch(0.63 0.225 27 / 0.25)', color: 'oklch(0.75 0.18 27)' }}>
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button className="h-10 w-full font-semibold" type="submit" disabled={loading || !email}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending...
                  </span>
                ) : 'Send recovery link'}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
