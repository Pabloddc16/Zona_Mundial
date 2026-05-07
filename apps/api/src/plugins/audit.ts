import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const auditPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onResponse', async (req, reply) => {
    if (!MUTATION_METHODS.has(req.method)) return
    if (!req.url.startsWith('/api/')) return
    if (reply.statusCode >= 500) return

    try {
      const supabase = getClient()
      await supabase.from('audit').insert({
        id: randomUUID(),
        ts: new Date().toISOString(),
        user: req.user?.username,
        role: req.user?.role,
        method: req.method,
        path: req.url,
        status: reply.statusCode,
        body: req.body as Record<string, unknown>,
      })
    } catch {
      // Audit failure must never break the response
    }
  })
}

export { auditPlugin }
export default fp(auditPlugin)
