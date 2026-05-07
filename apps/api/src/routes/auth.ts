import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement auth routes (porting from admin-mundial-2026/server.js)
const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'auth routes — port from server.js' }
  })
}

export default authRoutes
