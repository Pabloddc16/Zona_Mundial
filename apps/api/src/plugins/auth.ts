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

        req.user = {
          id: user.id,
          email: user.email ?? '',
          role: user.user_metadata['role'] as string ?? 'capturista',
          username: user.user_metadata['username'] as string ?? user.email ?? user.id,
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
