import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement orders routes (porting from admin-mundial-2026/server.js)
const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'orders routes — port from server.js' }
  })
}

export default ordersRoutes
