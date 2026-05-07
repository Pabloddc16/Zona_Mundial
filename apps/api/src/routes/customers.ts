import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement customers routes (porting from admin-mundial-2026/server.js)
const customersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'customers routes — port from server.js' }
  })
}

export default customersRoutes
