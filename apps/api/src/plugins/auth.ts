import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { getClient } from '@pablo/db'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      role: string
      username: string
    }
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const token = req.cookies['sb-token'] ?? req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      try {
        const supabase = getClient()
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
          req.log.warn({ authError: error?.message ?? 'no user', step: 'getUser' }, 'auth failed')
          return reply.code(401).send({ error: 'Invalid session' })
        }

        // .maybeSingle() returns null on 0 rows instead of throwing PGRST116
        const { data: userRow, error: rowError } = await supabase
          .from('users').select('role, username, active').eq('id', user.id).maybeSingle()

        if (rowError) {
          // Real DB error (connection, RLS, syntax) — log loudly so we can fix the env
          req.log.error({ userId: user.id, rowError: rowError.message, code: rowError.code, hint: rowError.hint, step: 'usersTable' }, 'auth DB error')
          return reply.code(500).send({ error: 'Auth check failed' })
        }

        if (!userRow) {
          req.log.warn({ userId: user.id, email: user.email, step: 'usersTable' }, 'auth failed: no row in public.users for this auth user')
          return reply.code(401).send({ error: 'User profile missing' })
        }

        if (userRow.active === false) {
          req.log.warn({ userId: user.id, step: 'inactive' }, 'auth failed: user deactivated')
          return reply.code(401).send({ error: 'User deactivated' })
        }

        req.user = {
          id: user.id,
          email: user.email ?? '',
          role: userRow.role as string,
          username: userRow.username as string,
        }
      } catch (err) {
        req.log.error({ err }, 'auth exception')
        return reply.code(401).send({ error: 'Unauthorized' })
      }
    },
  )

  fastify.decorate(
    'requireRole',
    (...roles: string[]) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        await fastify.authenticate(req, reply)
        if (req.user && !roles.includes(req.user.role)) {
          return reply.code(403).send({ error: 'Forbidden' })
        }
      },
  )
}

export { authPlugin }
export default fp(authPlugin)
