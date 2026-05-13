import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateUserSchema } from '@pablo/validators'

const VALID_ROLES = ['admin', 'capturista', 'repartidor']

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/users
  fastify.get('/', { preHandler: fastify.requireRole('admin') }, async (_req, reply) => {
    const { data, error } = await getClient()
      .from('users').select('id, username, email, role, active, created_at').order('created_at')
    if (error) return reply.internalServerError(error.message)
    return data ?? []
  })

  // POST /api/users — creates Supabase Auth user + users table row
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const parsed = CreateUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { username, email, password, role } = parsed.data
    if (password.length < 8) return reply.badRequest('La contraseña debe tener al menos 8 caracteres')
    if (!VALID_ROLES.includes(role)) return reply.badRequest(`Rol inválido. Válidos: ${VALID_ROLES.join(', ')}`)

    const supabase = getClient()

    const { data: dup } = await supabase.from('users').select('id').eq('username', username).single()
    if (dup) return reply.conflict('El username ya existe')

    const createAttrs: { password: string; email_confirm: boolean; email?: string } = { password, email_confirm: true }
    if (email) createAttrs.email = email
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser(createAttrs)
    if (authErr || !authData.user) {
      req.log.warn({ email, username, authErr: authErr?.message, step: 'createUser' }, 'user create failed')
      return reply.internalServerError(authErr?.message ?? 'Error al crear usuario')
    }

    const { data: userRow, error: rowErr } = await supabase.from('users').insert({
      id: authData.user.id,
      username,
      email,
      role,
      active: true,
      created_at: new Date().toISOString(),
    }).select('id, username, email, role, active, created_at').single()

    if (rowErr) {
      req.log.warn({ email, username, rowErr: rowErr.message, step: 'usersInsert' }, 'user create failed')
      await supabase.auth.admin.deleteUser(authData.user.id)
      return reply.internalServerError(rowErr.message)
    }

    reply.code(201)
    return userRow
  })

  // PATCH /api/users/:id
  fastify.patch('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const supabase = getClient()

    const { data: target } = await supabase.from('users').select('*').eq('id', id).single()
    if (!target) return reply.notFound('Usuario no encontrado')

    const updates: Record<string, unknown> = {}

    if (body['role'] !== undefined) {
      const newRole = String(body['role'])
      if (!VALID_ROLES.includes(newRole)) return reply.badRequest(`Rol inválido. Válidos: ${VALID_ROLES.join(', ')}`)
      if (target.role === 'admin' && newRole !== 'admin') {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
          .eq('role', 'admin').eq('active', true).neq('id', id)
        if ((count ?? 0) === 0) return reply.badRequest('No puedes degradar al último admin activo')
      }
      updates['role'] = newRole
    }

    if (body['active'] !== undefined) {
      const newActive = Boolean(body['active'])
      if (!newActive && target.role === 'admin') {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
          .eq('role', 'admin').eq('active', true).neq('id', id)
        if ((count ?? 0) === 0) return reply.badRequest('No puedes desactivar al último admin activo')
      }
      updates['active'] = newActive
    }

    if (body['email'] !== undefined) {
      const newEmail = String(body['email']).trim()
      updates['email'] = newEmail
      await supabase.auth.admin.updateUserById(id, { email: newEmail })
    }

    if (body['password'] !== undefined) {
      const pw = String(body['password'])
      if (pw.length < 8) return reply.badRequest('La contraseña debe tener al menos 8 caracteres')
      await supabase.auth.admin.updateUserById(id, { password: pw })
    }

    if (Object.keys(updates).length === 0) return reply.badRequest('Nada que actualizar')

    const { data, error } = await supabase.from('users').update(updates).eq('id', id)
      .select('id, username, email, role, active, created_at').single()
    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/users/:id
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()

    if (req.user?.id === id) return reply.badRequest('No puedes eliminar tu propio usuario')

    const { data: target } = await supabase.from('users').select('*').eq('id', id).single()
    if (!target) return reply.notFound('Usuario no encontrado')

    if (target.role === 'admin') {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
        .eq('role', 'admin').eq('active', true).neq('id', id)
      if ((count ?? 0) === 0) return reply.badRequest('No puedes eliminar al último admin activo')
    }

    await supabase.auth.admin.deleteUser(id)
    await supabase.from('users').delete().eq('id', id)
    return { ok: true }
  })
}

export default usersRoutes
