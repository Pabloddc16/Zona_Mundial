import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement wholesalers routes (porting from admin-mundial-2026/server.js)
const wholesalersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'wholesalers routes — port from server.js' }
  })
}

export default wholesalersRoutes
