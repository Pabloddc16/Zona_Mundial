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
          return reply.code(401).send({ error: 'Invalid session' })
        }

        const { data: userRow } = await supabase
          .from('users').select('role, username, active').eq('id', user.id).single()

        if (!userRow || userRow.active === false) {
          return reply.code(401).send({ error: 'Invalid session' })
        }

        req.user = {
          id: user.id,
          email: user.email ?? '',
          role: userRow.role as string,
          username: userRow.username as string,
        }
      } catch {
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
