'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sticker } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await api.auth.login(email, password)
      setUser(user)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-deep)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <Sticker className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white/90">Pablo Admin</h1>
          <p className="mt-1 text-sm text-white/50">Inicia sesión para continuar</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Correo</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/75">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
