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

  // POST /api/auth/register — public customer signup (mobile app)
  fastify.post('/register', async (req, reply) => {
    const body = req.body as { email?: string; password?: string; username?: string; referralCode?: string }
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const username = String(body?.username ?? '').trim() || email.split('@')[0]
    const referralCode = String(body?.referralCode ?? '').trim().toLowerCase() || null

    req.log.info({ email, username, hasPassword: !!password }, 'register attempt')

    if (!email) return reply.badRequest('Email is required')
    if (!password) return reply.badRequest('Password is required')
    if (password.length < 8) return reply.badRequest('Password must be at least 8 characters')
    if (!/.+@.+\..+/.test(email)) return reply.badRequest('Invalid email format')

    const supabase = getClient()

    // 1) Create the Supabase auth user. If they already exist, recover gracefully.
    let authUserId: string | null = null
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authErr || !authData?.user) {
      const msg = authErr?.message ?? ''
      const alreadyExists = /already (registered|exists)|duplicate|already been registered/i.test(msg)
      if (alreadyExists) {
        // Look up the existing auth user so we can either repair their public.users row or
        // tell them clearly to sign in.
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
        const found = list?.users.find((u) => (u.email ?? '').toLowerCase() === email)
        if (!found) {
          req.log.warn({ email, authErr: msg, step: 'createUser-notfound' }, 'register failed')
          return reply.badRequest('Email already registered. Try signing in instead.')
        }
        authUserId = found.id
        // Check whether public.users row exists; if yes, refuse — they have a real account.
        const { data: pubRow } = await supabase.from('users').select('id').eq('id', authUserId).single()
        if (pubRow) return reply.badRequest('Email already registered. Try signing in instead.')
        // Otherwise fall through — auth exists but public.users missing, we'll repair it.
        req.log.info({ email, authUserId }, 'register: repairing orphan auth user')
      } else {
        req.log.warn({ email, authErr: msg, step: 'createUser' }, 'register failed')
        return reply.badRequest(msg || 'Could not create account')
      }
    } else {
      authUserId = authData.user.id
    }

    if (!authUserId) return reply.internalServerError('register: missing auth user id')

    // Look up inviter by referral_code if provided. Don't fail signup if invalid.
    let referredById: string | null = null
    if (referralCode) {
      const { data: inviter } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle()
      if (inviter?.id && inviter.id !== authUserId) {
        referredById = inviter.id
      } else {
        req.log.warn({ referralCode }, 'register: unknown or self-referral code, ignoring')
      }
    }

    // Generate a short shareable referral code for the new user. Username slug
    // is the obvious anchor, but collisions are possible — fall back to random.
    const baseCode = (username ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'cromos'
    let referralCodeForUser = baseCode
    const { data: existingCode } = await supabase
      .from('users').select('id').eq('referral_code', baseCode).maybeSingle()
    if (existingCode) {
      referralCodeForUser = `${baseCode}${Math.floor(1000 + Math.random() * 9000)}`
    }

    // 2) Insert (or upsert) the public.users row.
    const { error: rowErr } = await supabase.from('users').upsert({
      id: authUserId,
      username,
      email,
      role: 'customer',
      active: true,
      referral_code: referralCodeForUser,
      referred_by_id: referredById,
    }, { onConflict: 'id' })
    if (rowErr) {
      req.log.warn({ email, rowErr: rowErr.message, step: 'usersUpsert' }, 'register failed')
      // Don't roll back the auth user — they may be trying again. Surface a usable message.
      const msg = /duplicate key.*username/i.test(rowErr.message)
        ? 'That username is already taken. Try a different one.'
        : rowErr.message
      return reply.badRequest(msg)
    }

    // 3) Auto sign-in so the client receives tokens.
    const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr || !sessionData.session) {
      req.log.warn({ email, signInErr: signInErr?.message, step: 'autoSignIn' }, 'register: auto sign-in skipped')
      return reply.code(201).send({ ok: true, message: 'Account created. Please sign in.' })
    }

    return reply.code(201).send({
      user: { id: authUserId, email, username, role: 'customer' },
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    })
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

  // DELETE /api/auth/account — Apple Guideline 5.1.1(v): users must be able
  // to delete their account from within the app. Wipes auth.users (which
  // cascades to album_stickers via FK ON DELETE CASCADE) and public.users.
  fastify.delete('/account', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user!.id
    const supabase = getClient()

    // 1. Remove the public.users row (so admin lists no longer show them)
    const { error: pubErr } = await supabase.from('users').delete().eq('id', userId)
    if (pubErr) req.log.warn({ err: pubErr.message, userId }, 'public.users delete failed')

    // 2. Remove Supabase auth user — invalidates all sessions automatically
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
    if (authErr) return reply.internalServerError(`Auth delete failed: ${authErr.message}`)

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
