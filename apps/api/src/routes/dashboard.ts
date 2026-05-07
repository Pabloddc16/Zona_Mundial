import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement dashboard routes (porting from admin-mundial-2026/server.js)
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'dashboard routes — port from server.js' }
  })
}

export default dashboardRoutes
