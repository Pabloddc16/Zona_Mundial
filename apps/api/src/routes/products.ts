import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

// TODO: implement products routes (porting from admin-mundial-2026/server.js)
const productsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async (_req, _reply) => {
    return { todo: 'products routes — port from server.js' }
  })
}

export default productsRoutes
