import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement expenses routes (porting from admin-mundial-2026/server.js)
const expensesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'expenses routes — port from server.js' }
  })
}

export default expensesRoutes
