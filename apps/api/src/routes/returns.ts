// Previously a stub that always returned []. Now fully implemented.
import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateReturnSchema } from '@pablo/validators'
import { randomUUID } from 'crypto'
import { paginate } from '../lib/pagination.js'

const returnsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/returns
  fastify.get(
    '/',
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const supabase = getClient()
      const query = req.query as Record<string, string>

      const { data, error } = await supabase
        .from('returns')
        .select('*, return_items(*)')
        .order('created_at', { ascending: false })

      if (error) return reply.internalServerError(error.message)

      const result = paginate(data ?? [], query, {
        searchFields: ['source', 'reason', 'refund_method', 'original_id'],
      })

      return result
    },
  )

  // GET /api/returns/:id
  fastify.get(
    '/:id',
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const supabase = getClient()

      const { data, error } = await supabase
        .from('returns')
        .select('*, return_items(*)')
        .eq('id', id)
        .single()

      if (error || !data) return reply.notFound('Return not found')
      return data
    },
  )

  // POST /api/returns
  fastify.post(
    '/',
    { preHandler: fastify.requireRole('admin', 'capturista') },
    async (req, reply) => {
      const parsed = CreateReturnSchema.safeParse(req.body)
      if (!parsed.success) return reply.badRequest(parsed.error.message)

      const { items, ...returnData } = parsed.data
      const id = randomUUID()
      const supabase = getClient()

      const { data: returnRow, error: returnErr } = await supabase
        .from('returns')
        .insert({
          id,
          ...returnData,
          created_by: req.user?.username,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (returnErr) return reply.internalServerError(returnErr.message)

      const { error: itemsErr } = await supabase.from('return_items').insert(
        items.map((item) => ({ ...item, return_id: id })),
      )

      if (itemsErr) return reply.internalServerError(itemsErr.message)

      reply.code(201)
      return { ...returnRow, return_items: items }
    },
  )

  // DELETE /api/returns/:id (admin only)
  fastify.delete(
    '/:id',
    { preHandler: fastify.requireRole('admin') },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const supabase = getClient()

      const { error } = await supabase.from('returns').delete().eq('id', id)
      if (error) return reply.internalServerError(error.message)

      reply.code(204)
    },
  )
}

export default returnsRoutes
