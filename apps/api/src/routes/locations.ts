import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'

const locationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async () => {
    const { data, error } = await getClient().from('locations').select('*').order('name')
    if (error) throw new Error(error.message)
    return data
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { name?: string; type?: string }
    if (!body.name || !body.type) return reply.badRequest('name y type requeridos')
    const validTypes = ['warehouse', 'pos', 'wip_conversion', 'wip_assembly']
    if (!validTypes.includes(body.type)) return reply.badRequest(`type inválido. Valores: ${validTypes.join(', ')}`)
    const { data, error } = await getClient().from('locations').insert({ id: `loc_${randomUUID().slice(0, 8)}`, name: body.name, type: body.type }).select().single()
    if (error) throw new Error(error.message)
    return reply.code(201).send(data)
  })

  fastify.patch('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const allowed = ['name', 'active']
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    const { data, error } = await getClient().from('locations').update(update).eq('id', id).select().single()
    if (error) return reply.notFound('Locación no encontrada')
    return data
  })
}

export default locationsRoutes
