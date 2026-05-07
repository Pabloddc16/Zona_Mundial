import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement sales routes (porting from admin-mundial-2026/server.js)
const salesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'sales routes — port from server.js' }
  })
}

export default salesRoutes
