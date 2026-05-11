import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', async (req, reply) => {
    const body = req.body as { email?: string; password?: string }
    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    if (!email || !password) return reply.badRequest('email y password requeridos')

    const supabase = getClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) return reply.unauthorized(error?.message ?? 'Credenciales inválidas')

    const { data: userRow } = await supabase
      .from('users').select('role, username, active').eq('id', data.user.id).single()

    if (userRow?.active === false) return reply.forbidden('Usuario desactivado')

    reply
      .setCookie('sb-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.session.expires_in,
      })
      .code(200)

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRow?.role ?? 'admin',
        username: userRow?.username ?? data.user.email,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  })

  // POST /api/auth/refresh
  fastify.post('/refresh', async (req, reply) => {
    const body = req.body as { refreshToken?: string }
    const refreshToken = String(body?.refreshToken ?? '')
    if (!refreshToken) return reply.badRequest('refreshToken required')

    const { data, error } = await getClient().auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session) return reply.unauthorized('Session expired, please log in again')

    reply.setCookie('sb-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.session.expires_in,
    })

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (_req, reply) => {
    reply.clearCookie('sb-token', { path: '/' })
    return { ok: true }
  })

  // GET /api/auth/me
  fastify.get('/me', { preHandler: fastify.authenticate }, async (req, _reply) => {
    const supabase = getClient()
    const { data: userRow } = await supabase
      .from('users').select('*').eq('id', req.user!.id).single()

    let deliverer = null
    if (req.user?.role === 'repartidor') {
      const { data } = await supabase
        .from('deliverers').select('*').eq('username', req.user.username).single()
      deliverer = data
    }

    return {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      username: req.user!.username,
      profile: userRow,
      deliverer,
    }
  })

  // POST /api/auth/request-reset — sends Supabase password reset email
  fastify.post('/request-reset', async (req, reply) => {
    const body = req.body as { email?: string }
    const email = String(body?.email ?? '').trim()
    if (!email) return reply.badRequest('email requerido')

    const resetOpts: { redirectTo?: string } = {}
    if (process.env['PUBLIC_BASE_URL']) resetOpts.redirectTo = `${process.env['PUBLIC_BASE_URL']}/reset-password`

    await getClient().auth.resetPasswordForEmail(email, resetOpts)
    return { ok: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' }
  })

  // POST /api/auth/reset — set new password (called from reset-password page with token)
  fastify.post('/reset', async (req, reply) => {
    const body = req.body as { new_password?: string }
    const newPassword = String(body?.new_password ?? '')
    if (!newPassword) return reply.badRequest('new_password requerido')
    if (newPassword.length < 8) return reply.badRequest('La contraseña debe tener al menos 8 caracteres')

    const { error } = await getClient().auth.updateUser({ password: newPassword })
    if (error) return reply.badRequest(error.message)
    return { ok: true }
  })
}

export default authRoutes
