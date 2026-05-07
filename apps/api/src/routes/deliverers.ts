import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement deliverers routes (porting from admin-mundial-2026/server.js)
const deliverersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'deliverers routes — port from server.js' }
  })
}

export default deliverersRoutes
